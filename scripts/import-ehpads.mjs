/**
 * SmartSeniors — Import EHPAD CSV → SQL pour Cloudflare D1
 *
 * USAGE :
 *   1. Exporter le GSheet en CSV : Fichier → Télécharger → CSV
 *   2. Placer le fichier CSV dans ce dossier
 *   3. Adapter COLUMN_MAP ci-dessous selon vos en-têtes de colonnes
 *   4. node scripts/import-ehpads.mjs ehpads.csv
 *   5. wrangler d1 execute smartseniors-db --file=scripts/ehpads-import.sql --remote
 */

import fs   from 'fs';
import path from 'path';

// ── ADAPTER CES NOMS SELON VOS EN-TÊTES GSHEET ───────────────────
// Clé = champ D1, valeur = nom exact de la colonne dans le CSV
const COLUMN_MAP = {
  nom:                'Nom de l\'établissement',   // ← nom EHPAD
  adresse:            'Adresse',
  ville:              'Ville',
  code_postal:        'Code postal',
  departement:        'Département',               // ou laissez vide = auto depuis CP
  telephone:          'Tel',
  email:              'Mail',
  places_disponibles: 'Places disponibles',        // optionnel
  tarif_jour:         'Tarif jour',                // optionnel (€/jour)
  // Champs extras utiles mais pas dans le schéma — ignorés silencieusement
  // direction:       'Direction',
};

// Si vous n'avez pas de colonne "Département" explicite,
// on l'extrait automatiquement du code postal.
const AUTO_DEPT_FROM_CP = true;

// ─────────────────────────────────────────────────────────────────

function extractDept(cp) {
  if (!cp) return null;
  const clean = String(cp).trim().replace(/\s/g, '');
  if (clean.length === 5 && /^\d{5}$/.test(clean)) return clean.substring(0, 2);
  if (clean.length === 4 && /^\d{4}$/.test(clean)) return '0' + clean.substring(0, 1);
  if (/^\d{2}$/.test(clean)) return clean;
  return null;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV vide ou sans données');

  // Détection du séparateur (virgule ou point-virgule)
  const sep = lines[0].includes(';') ? ';' : ',';

  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parsing simple (gère les guillemets)
    const values = [];
    let cur = '', inQ = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === sep && !inQ) { values.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    values.push(cur.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function sqlEscape(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''").trim()}'`;
}

function buildInserts(rows) {
  const inserts = [];
  let skipped = 0;

  for (const row of rows) {
    const nom        = row[COLUMN_MAP.nom]?.trim();
    const email      = row[COLUMN_MAP.email]?.trim();
    const telephone  = row[COLUMN_MAP.telephone]?.trim();
    const adresse    = row[COLUMN_MAP.adresse]?.trim();
    const villeRaw   = row[COLUMN_MAP.ville]?.trim();
    const cpRaw      = row[COLUMN_MAP.code_postal]?.trim();
    const deptRaw    = row[COLUMN_MAP.departement]?.trim();

    // Champs obligatoires
    if (!nom) { skipped++; continue; }
    if (!email && !telephone) { skipped++; continue; }

    // Ville : extraire depuis adresse si absent
    let ville = villeRaw;
    let cp    = cpRaw;

    // Si ville/cp sont dans la même colonne adresse (ex: "12 rue X, 69000 Lyon")
    if (!ville && adresse) {
      const m = adresse.match(/(\d{5})\s+(.+)$/);
      if (m) { cp = cp || m[1]; ville = ville || m[2]; }
    }

    if (!ville) ville = 'Non précisé';

    // Département : auto depuis CP si absent
    let dept = (deptRaw && AUTO_DEPT_FROM_CP) ? deptRaw : extractDept(cp);
    if (!dept && deptRaw) dept = deptRaw;
    if (!dept) { skipped++; console.warn(`⚠ Département introuvable pour : ${nom} (${cp || '?'})`); continue; }

    const places = parseInt(row[COLUMN_MAP.places_disponibles]) || null;
    const tarif  = parseFloat(row[COLUMN_MAP.tarif_jour])       || null;

    inserts.push(
      `INSERT INTO ehpads (nom, adresse, ville, code_postal, departement, telephone, email, places_disponibles, tarif_jour) VALUES ` +
      `(${sqlEscape(nom)}, ${sqlEscape(adresse)}, ${sqlEscape(ville)}, ${sqlEscape(cp)}, ${sqlEscape(dept)}, ` +
      `${sqlEscape(telephone)}, ${sqlEscape(email)}, ${places !== null ? places : 'NULL'}, ${tarif !== null ? tarif : 'NULL'});`
    );
  }

  return { inserts, skipped };
}

// ── Main ──────────────────────────────────────────────────────────
const csvFile = process.argv[2];
if (!csvFile) {
  console.error('Usage: node scripts/import-ehpads.mjs <fichier.csv>');
  process.exit(1);
}

const csvPath = path.resolve(csvFile);
if (!fs.existsSync(csvPath)) {
  console.error(`Fichier introuvable : ${csvPath}`);
  process.exit(1);
}

const text = fs.readFileSync(csvPath, 'utf-8');
const { headers, rows } = parseCSV(text);

console.log(`\n📋 Colonnes détectées (${headers.length}) :`);
console.log('   ' + headers.join(' | '));
console.log(`\n📊 Lignes à traiter : ${rows.length}`);

const { inserts, skipped } = buildInserts(rows);

const sql = [
  '-- SmartSeniors — Import EHPAD',
  `-- Généré le ${new Date().toLocaleString('fr-FR')}`,
  `-- Source : ${path.basename(csvFile)}`,
  '',
  ...inserts,
].join('\n');

const outFile = path.join(path.dirname(csvPath), 'ehpads-import.sql');
fs.writeFileSync(outFile, sql, 'utf-8');

console.log(`\n✅ ${inserts.length} EHPAD générés`);
if (skipped > 0) console.log(`⚠  ${skipped} lignes ignorées (nom ou contact manquant)`);
console.log(`\n📄 Fichier SQL : ${outFile}`);
console.log('\n🚀 Étape suivante :');
console.log('   npx wrangler d1 execute smartseniors-db --file=scripts/ehpads-import.sql --remote\n');

#!/usr/bin/env node
/**
 * SmartSeniors — DB Seeder
 * ========================
 * Injecte les données de `data/ehpads.json` dans Cloudflare D1.
 *
 * Usage:
 *   npm run seed           → D1 local  (wrangler dev)
 *   npm run seed:remote    → D1 prod   (Cloudflare)
 *   npm run seed:reset     → vide la table puis re-seed (prod)
 *
 * Options CLI:
 *   --remote               Cible la base de données distante (production)
 *   --reset                Vide la table ehpads avant l'import
 *   --dry-run              Affiche le SQL sans l'exécuter
 *   --file <path>          Source JSON alternative (défaut: data/ehpads.json)
 *
 * Examples:
 *   node scripts/seed.mjs --dry-run
 *   node scripts/seed.mjs --remote --reset
 *   node scripts/seed.mjs --file data/ehpads-prod.json --remote
 */

import fs        from 'fs';
import path      from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── CLI args ──────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const REMOTE  = args.includes('--remote');
const RESET   = args.includes('--reset');
const DRY_RUN = args.includes('--dry-run');
const fileIdx = args.indexOf('--file');
const DATA_FILE = fileIdx !== -1 && args[fileIdx + 1]
  ? path.resolve(args[fileIdx + 1])
  : path.join(ROOT, 'data', 'ehpads.json');

// ── Helpers ───────────────────────────────────────────────────────
const q = (v) => v === null || v === undefined || v === ''
  ? 'NULL'
  : `'${String(v).replace(/'/g, "''").trim()}'`;

function extractDept(cp) {
  if (!cp) return null;
  const c = String(cp).replace(/\s/g, '');
  if (/^\d{5}$/.test(c)) return c.slice(0, 2);
  if (/^\d{4}$/.test(c)) return '0' + c[0];
  if (/^\d{2,3}$/.test(c)) return c;
  return null;
}

// ── Validation ────────────────────────────────────────────────────
function validate(ehpad, idx) {
  const errors = [];
  if (!ehpad.nom?.trim())        errors.push('nom manquant');
  if (!ehpad.ville?.trim())      errors.push('ville manquante');
  const dept = ehpad.departement || extractDept(ehpad.code_postal);
  if (!dept)                     errors.push('departement introuvable (fournissez departement ou code_postal)');
  if (!ehpad.email?.trim() && !ehpad.telephone?.trim())
                                 errors.push('email ET telephone manquants (au moins un requis)');
  if (errors.length) {
    console.warn(`  ⚠  [${idx}] ${ehpad.nom || 'sans nom'} → ${errors.join(', ')}`);
    return false;
  }
  return true;
}

// ── SQL generation ────────────────────────────────────────────────
function toSQL(ehpad) {
  const dept = ehpad.departement || extractDept(ehpad.code_postal);
  return (
    `INSERT INTO ehpads (nom, adresse, ville, code_postal, departement, telephone, email, places_disponibles, tarif_jour) VALUES ` +
    `(${q(ehpad.nom)}, ${q(ehpad.adresse)}, ${q(ehpad.ville)}, ${q(ehpad.code_postal)}, ${q(dept)}, ` +
    `${q(ehpad.telephone)}, ${q(ehpad.email)}, ` +
    `${ehpad.places_disponibles ?? 'NULL'}, ${ehpad.tarif_jour ?? 'NULL'});`
  );
}

// ── Main ──────────────────────────────────────────────────────────
console.log('\n🏠 SmartSeniors — EHPAD Seeder');
console.log('━'.repeat(40));
console.log(`  Source  : ${path.relative(ROOT, DATA_FILE)}`);
console.log(`  Target  : ${REMOTE ? '🌐 Production (D1 remote)' : '💻 Local (wrangler dev)'}`);
console.log(`  Reset   : ${RESET ? '⚠  OUI — la table sera vidée' : 'non'}`);
console.log(`  Dry run : ${DRY_RUN ? 'oui (aucune écriture)' : 'non'}`);
console.log('');

// Lecture du JSON
if (!fs.existsSync(DATA_FILE)) {
  console.error(`❌ Fichier introuvable : ${DATA_FILE}`);
  process.exit(1);
}

let source;
try {
  source = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
} catch (e) {
  console.error(`❌ JSON invalide : ${e.message}`);
  process.exit(1);
}

const raw = Array.isArray(source) ? source : source.ehpads;
if (!Array.isArray(raw) || raw.length === 0) {
  console.error('❌ Aucun EHPAD trouvé dans le fichier. Structure attendue : { "ehpads": [...] }');
  process.exit(1);
}

console.log(`📋 ${raw.length} établissements à traiter...\n`);

// Validation
const valid = raw.filter((e, i) => validate(e, i));
const skipped = raw.length - valid.length;
if (skipped > 0) console.log('');

// Génération SQL
const statements = [];
if (RESET) statements.push('DELETE FROM ehpads;');
valid.forEach(e => statements.push(toSQL(e)));

const sql = [
  `-- SmartSeniors EHPAD seed`,
  `-- Généré le ${new Date().toISOString()}`,
  `-- Source: ${path.basename(DATA_FILE)}`,
  `-- Établissements: ${valid.length}`,
  '',
  ...statements,
  '',
].join('\n');

// Dry run → afficher le SQL
if (DRY_RUN) {
  console.log('📄 SQL généré :\n');
  console.log(sql);
  console.log(`\n✅ Dry run terminé — ${valid.length} INSERT prêts (non exécutés)`);
  process.exit(0);
}

// Écriture du fichier SQL temporaire
const tmpFile = path.join(ROOT, 'scripts', '.seed-tmp.sql');
fs.writeFileSync(tmpFile, sql, 'utf-8');

// Exécution via wrangler
const remoteFlag = REMOTE ? '--remote' : '--local';
const cmd = `npx wrangler d1 execute smartseniors-db ${remoteFlag} --file="${tmpFile}"`;

console.log(`🚀 Exécution : ${cmd}\n`);

try {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  fs.unlinkSync(tmpFile);

  console.log('\n' + '━'.repeat(40));
  console.log(`✅ Seed terminé avec succès`);
  console.log(`   ${valid.length} EHPAD insérés${RESET ? ' (table réinitialisée)' : ''}`);
  if (skipped > 0) console.log(`   ⚠  ${skipped} ligne(s) ignorée(s) — voir avertissements ci-dessus`);
  console.log('');
} catch (e) {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  console.error('\n❌ Erreur wrangler — voir message ci-dessus');
  process.exit(1);
}

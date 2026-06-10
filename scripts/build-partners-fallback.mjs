#!/usr/bin/env node
/**
 * Génère pages/functions/api/_partners.js à partir de data/ehpads.json :
 *  - PARTNERS_BY_DEPT : résidences partenaires groupées par département (fallback API si D1 vide)
 *  - VILLE_TO_DEPT    : map ville normalisée → département (détection de localité)
 *
 * Usage : node scripts/build-partners-fallback.mjs
 * À relancer après chaque mise à jour de data/ehpads.json (source de vérité).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'data', 'ehpads.json');
const OUT = join(root, 'pages', 'functions', 'api', '_partners.js');

// Même normalisation que _geo.js (à garder synchronisées)
function normVille(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\s+/g, ' ')
    .trim();
}

// Grandes villes hors données partenaires (priorité sur la map dérivée)
const GRANDES_VILLES = {
  paris: '75', lyon: '69', marseille: '13', bordeaux: '33',
  nice: '06', toulouse: '31', lille: '59', strasbourg: '67',
  nantes: '44', rennes: '35', montpellier: '34', brest: '29',
  grenoble: '38', dijon: '21', nancy: '54', reims: '51',
  toulon: '83', angers: '49', 'clermont ferrand': '63', 'le havre': '76',
  'saint etienne': '42', nimes: '30', villeurbanne: '69', 'aix en provence': '13',
  amiens: '80', tours: '37', limoges: '87', annecy: '74', perpignan: '66',
  metz: '57', besancon: '25', orleans: '45', rouen: '76', caen: '14', mulhouse: '68',
};

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const all = Array.isArray(raw) ? raw : raw.ehpads;

const byDept = {};
const villeCount = {}; // ville normalisée → { dept: occurrences }
let kept = 0;

for (const e of all) {
  const dept = String(e.departement || '').trim();
  if (!dept || !e.nom) continue;
  kept++;
  (byDept[dept] ||= []).push({
    nom: e.nom,
    adresse: e.adresse || '',
    ville: e.ville || '',
    code_postal: e.code_postal || '',
    departement: dept,
    telephone: e.telephone || '',
    email: e.email || '',
    places_disponibles: e.places_disponibles ?? null,
    tarif_jour: e.tarif_jour ?? null,
  });
  const v = normVille(e.ville);
  if (v.length >= 3) {
    (villeCount[v] ||= {})[dept] = ((villeCount[v] ||= {})[dept] || 0) + 1;
  }
}

// Tri identique à la requête D1 (ORDER BY nom) + ids stables
for (const dept of Object.keys(byDept)) {
  byDept[dept].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  byDept[dept].forEach((e, i) => { e.id = Number(dept) ? Number(dept) * 1000 + i + 1 : 90000 + i; });
}

// Ville → département (en cas d'homonymie : le département le plus représenté)
const villeToDept = {};
for (const [ville, depts] of Object.entries(villeCount)) {
  villeToDept[ville] = Object.entries(depts).sort((a, b) => b[1] - a[1])[0][0];
}
Object.assign(villeToDept, GRANDES_VILLES);

const header = `/**
 * ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
 * Source de vérité : data/ehpads.json · Régénérer : node scripts/build-partners-fallback.mjs
 * Fallback des résidences partenaires quand D1 est indisponible ou pas encore seedée.
 */
`;

const out =
  header +
  `export const PARTNERS_BY_DEPT = ${JSON.stringify(byDept)};\n\n` +
  `export const VILLE_TO_DEPT = ${JSON.stringify(villeToDept)};\n`;

writeFileSync(OUT, out);
console.log(`OK — ${kept} résidences · ${Object.keys(byDept).length} départements · ${Object.keys(villeToDept).length} villes → ${OUT} (${(out.length / 1024).toFixed(0)} Ko)`);

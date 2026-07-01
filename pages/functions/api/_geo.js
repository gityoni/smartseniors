/**
 * Détection de département partagée (ehpads.js + leads.js).
 * 1. Code postal 5 chiffres → 2 premiers chiffres
 * 2. Commence par 2 chiffres → département direct
 * 3. Ville (normalisée) → département, via les villes des résidences partenaires
 *    (VILLE_TO_DEPT généré depuis data/ehpads.json) + grandes villes.
 */
import { VILLE_TO_DEPT } from './_partners.js';

// Même normalisation que scripts/build-partners-fallback.mjs (à garder synchronisées)
export function normVille(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\s+/g, ' ')
    .trim();
}

// Clés triées une fois, des plus longues aux plus courtes ("boulogne billancourt" avant "boulogne")
const VILLE_KEYS = Object.keys(VILLE_TO_DEPT).sort((a, b) => b.length - a.length);

export function findDept(localite) {
  if (!localite) return null;
  const cp = String(localite).match(/\b(\d{2})\d{3}\b/);
  if (cp) return cp[1];
  const d2 = String(localite).trim().match(/^(\d{2})/);
  if (d2) return d2[1];
  const norm = normVille(localite);
  if (!norm) return null;
  if (VILLE_TO_DEPT[norm]) return VILLE_TO_DEPT[norm];
  // Ville contenue dans la saisie ("Garches 92" / "près de Garches"), bornée aux mots entiers
  const padded = ` ${norm} `;
  for (const key of VILLE_KEYS) {
    if (key.length >= 4 && padded.includes(` ${key} `)) return VILLE_TO_DEPT[key];
  }
  return null;
}

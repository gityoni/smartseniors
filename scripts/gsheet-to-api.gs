/**
 * SmartSeniors — Google Apps Script
 * Exporte le GSheet EHPAD directement vers l'API admin SmartSeniors
 *
 * INSTALLATION :
 *   1. Dans Google Sheets → Extensions → Apps Script
 *   2. Coller ce code
 *   3. Adapter COLUMN_MAP selon vos en-têtes
 *   4. Cliquer "Run" → exportToSmartSeniors()
 */

// ── CONFIGURATION ─────────────────────────────────────────────────
const API_URL     = 'https://smartseniors.pages.dev/api/admin/import-ehpads';
const ADMIN_SECRET = 'smartseniors-admin-2024'; // ← changer dans Cloudflare Pages
const IMPORT_MODE  = 'replace'; // 'replace' = remplace tout | 'append' = ajoute
const SHEET_NAME   = 'Feuille 1'; // ← nom de votre onglet GSheet

// Mapper VOS colonnes GSheet → champs D1
// Valeur = lettre de colonne (A, B, C...) OU nom exact de l'en-tête
const COLUMN_MAP = {
  nom:                'D',   // Nom de l'établissement EHPAD
  adresse:            'E',   // Adresse complète
  ville:              'F',   // Ville (si colonne séparée)
  code_postal:        '',    // Code postal (si colonne séparée, sinon extrait de adresse)
  departement:        '',    // Département (optionnel, calculé auto)
  telephone:          'I',   // Tel / Tél
  email:              'H',   // Mail
  places_disponibles: '',    // Places disponibles (optionnel)
  tarif_jour:         '',    // Tarif €/jour (optionnel)
};

const HEADER_ROW = 1; // Numéro de la ligne d'en-têtes (généralement 1)
const DATA_START = 2; // Première ligne de données

// ─────────────────────────────────────────────────────────────────

function exportToSmartSeniors() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) { SpreadsheetApp.getUi().alert('Onglet "' + SHEET_NAME + '" introuvable.'); return; }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];

  // Résolution colonne lettre → index
  function colIndex(key) {
    const v = COLUMN_MAP[key];
    if (!v) return -1;
    if (/^[A-Z]+$/i.test(v)) {
      // Lettre de colonne → index 0-based
      let n = 0;
      for (let i = 0; i < v.length; i++) n = n * 26 + v.toUpperCase().charCodeAt(i) - 64;
      return n - 1;
    }
    // Nom d'en-tête → cherche dans headers
    return headers.findIndex(h => h.toString().trim().toLowerCase() === v.toLowerCase());
  }

  const idxMap = {};
  for (const field of Object.keys(COLUMN_MAP)) {
    idxMap[field] = colIndex(field);
  }

  const data = sheet.getRange(DATA_START, 1, lastRow - HEADER_ROW, lastCol).getValues();
  const ehpads = [];

  for (const row of data) {
    const nom   = idxMap.nom >= 0 ? String(row[idxMap.nom] || '').trim() : '';
    const email = idxMap.email >= 0 ? String(row[idxMap.email] || '').trim() : '';
    const tel   = idxMap.telephone >= 0 ? String(row[idxMap.telephone] || '').trim() : '';

    if (!nom || (!email && !tel)) continue;

    let adresse = idxMap.adresse >= 0 ? String(row[idxMap.adresse] || '').trim() : '';
    let ville   = idxMap.ville >= 0 ? String(row[idxMap.ville] || '').trim() : '';
    let cp      = idxMap.code_postal >= 0 ? String(row[idxMap.code_postal] || '').trim() : '';
    let dept    = idxMap.departement >= 0 ? String(row[idxMap.departement] || '').trim() : '';

    // Auto-extraction CP/ville depuis adresse
    if (!cp || !ville) {
      const m = adresse.match(/(\d{5})\s+(.+)$/);
      if (m) { cp = cp || m[1]; ville = ville || m[2]; }
    }

    // Auto-extraction département depuis CP
    if (!dept && cp && cp.length >= 2) dept = cp.substring(0, 2);

    ehpads.push({
      nom, adresse, ville,
      code_postal: cp, departement: dept,
      telephone: tel, email,
      places_disponibles: idxMap.places_disponibles >= 0 ? row[idxMap.places_disponibles] || null : null,
      tarif_jour: idxMap.tarif_jour >= 0 ? row[idxMap.tarif_jour] || null : null,
    });
  }

  if (ehpads.length === 0) {
    SpreadsheetApp.getUi().alert('Aucun EHPAD valide trouvé. Vérifiez COLUMN_MAP.');
    return;
  }

  // Envoi à l'API
  const payload = JSON.stringify({ secret: ADMIN_SECRET, mode: IMPORT_MODE, ehpads });
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload,
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const result   = JSON.parse(response.getContentText());

    if (result.success) {
      SpreadsheetApp.getUi().alert(
        '✅ Import réussi !\n\n' +
        `${result.inserted} EHPAD importés\n` +
        `${result.skipped} lignes ignorées\n\n` +
        (result.errors.length ? 'Erreurs :\n' + result.errors.join('\n') : 'Aucune erreur.')
      );
    } else {
      SpreadsheetApp.getUi().alert('❌ Erreur : ' + (result.error || 'Inconnue'));
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Erreur réseau : ' + e.toString());
  }
}

// Ajoute un menu dans Google Sheets
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SmartSeniors')
    .addItem('Exporter vers D1', 'exportToSmartSeniors')
    .addToUi();
}

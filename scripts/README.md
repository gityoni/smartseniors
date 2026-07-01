# SmartSeniors — Scripts & Data

## Structure

```
data/
  ehpads.json          ← Source de vérité des EHPAD partenaires (versionné git)
  ehpads.schema.json   ← JSON Schema de validation

scripts/
  seed.mjs             ← Injecteur principal (JSON → D1)
  import-ehpads.mjs    ← Convertisseur CSV → SQL (import depuis GSheet)
  gsheet-to-api.gs     ← Google Apps Script (export GSheet → API)
```

---

## Injecter les EHPAD en base (méthode recommandée)

### 1. Modifier les données

Éditer `data/ehpads.json` — chaque établissement suit cette structure :

```json
{
  "nom":                "Résidence Les Marronniers",
  "adresse":            "12 rue de la Paix",
  "ville":              "Paris 15e",
  "code_postal":        "75015",
  "departement":        "75",
  "telephone":          "01 45 67 89 10",
  "email":              "contact@residence.fr",   ← reçoit les leads prospects
  "places_disponibles": 3,                         ← null si non communiqué
  "tarif_jour":         112                        ← €/jour, null si non communiqué
}
```

> **`email` est critique** : c'est l'adresse qui recevra automatiquement les leads qualifiés dès qu'un prospect valide le funnel.

### 2. Lancer le seed

```bash
# Prévisualiser le SQL sans écrire (toujours commencer par là)
npm run seed:dry

# Injecter en local (wrangler dev)
npm run seed

# Injecter en production
npm run seed:remote

# Réinitialiser la table et re-injecter en production
npm run seed:reset
```

---

## Importer depuis un CSV (Google Sheets)

### Option A — Google Apps Script (recommandée)

1. Dans Google Sheets → **Extensions → Apps Script**
2. Coller le contenu de `scripts/gsheet-to-api.gs`
3. Adapter `COLUMN_MAP` (lettres de colonnes ou noms d'en-têtes)
4. **Run → `exportToSmartSeniors()`**

Un menu **SmartSeniors** apparaît dans le GSheet pour les exports futurs.

### Option B — CSV local

```bash
# Exporter le GSheet : Fichier → Télécharger → CSV
npm run import:csv -- ehpads.csv

# Puis injecter le SQL généré
npx wrangler d1 execute smartseniors-db --file=scripts/ehpads-import.sql --remote
```

---

## Appliquer le schéma DB (première installation)

```bash
# Local
npm run db:schema

# Production
npm run db:schema:remote
```

---

## Variables d'environnement (Cloudflare Pages)

| Variable          | Description                              | Obligatoire |
|-------------------|------------------------------------------|-------------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (chat Emma)          | ✅ |
| `BACKOFFICE_EMAIL`  | Email de copie des leads côté admin    | Recommandé |
| `ADMIN_SECRET`      | Clé pour l'API d'import admin          | Recommandé |
| `DB`                | Binding D1 (configuré dans wrangler.toml) | ✅ |

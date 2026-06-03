# SmartSeniors — Suivi des tâches

## ✅ Fait

- `pages/index.html` — interface lead gen 2 colonnes (Emma chat + funnel de qualification 13 étapes + résultats EHPAD + CSV)
- PWA : `manifest.json`, `sw.js`, icônes (installable, shell offline)
- `pages/confidentialite.html` — page RGPD / mentions
- `pages/functions/api/chat.js` — streaming Anthropic SSE, persona Emma enrichie (vocabulaire, qualification 7 étapes, objections, contexte funnel dynamique)
- `pages/functions/api/ehpads.js` — GET /api/ehpads?localite= (D1 → fallback mock)
- `pages/functions/api/leads.js` — POST /api/leads : sauvegarde D1 + **scoring d'urgence** + **email aux EHPAD partenaires** (MailChannels) + notif backoffice
- `pages/functions/api/admin/import-ehpads.js` — import EHPAD admin
- `data/ehpads.json` (+ schema) — source de vérité EHPAD partenaires
- `scripts/seed.mjs` / `scripts/import-ehpads.mjs` / `scripts/gsheet-to-api.gs` — seed & import D1
- `schema.sql` — tables `leads` (riche : contact, qualification, scoring) et `ehpads`
- `wrangler.toml` — config Cloudflare Pages + binding D1 (`3c1a84ef-2d23-42d4-853a-748f0cc16847`)
- `CLAUDE.md` — mémoire projet à jour (as-built + chantier démo)
- D1 database créée : `smartseniors-db`
- Déploiement Cloudflare Pages — prod live ✅

## 🚧 En cours — Démo partenaire (présentation prospect)

> Objectif : montrer une discussion fluide famille ↔ Emma + un back-end qui **crée le lead en temps réel** et le transmet aux résidences partenaires.
> Approche retenue : **extraction conversationnelle** (Emma mène la découverte, le lead se remplit en direct côté back-office) + **mode démo scripté rejouable** (scénario réel Alex ↔ famille).

- [ ] **Récupérer le transcript** (speech-to-text de l'appel 25 min Alex ↔ famille, labels locuteurs)
- [ ] **Phase 1 — Scénario & calage** : reconstituer le scénario de démo à partir du transcript ; caler la phase découverte d'Emma sur le déroulé réel (santé / lieu / pathologie / cadre familial / finances)
- [ ] **Phase 2 — Extraction conversationnelle** : couche tool-use Claude qui parse chaque échange → champs du lead (étape 1 : nom, prénom, date de naissance, CP+ville ; étape 2 : délai, ville+rayon, budget)
- [ ] **Phase 2 — Back-office « lead en direct »** : panneau qui se remplit au fil de la conversation (identité → GIR → budget → délai → score d'urgence) jusqu'à « lead envoyé à X résidences » + aperçu email
- [ ] **Mode démo scripté** : bouton « Démo » qui rejoue le scénario à rythme maîtrisé sur la vraie API
- [ ] **Phase 3 — Répétition / sécurisation** du run en live

## 🔴 À faire — infra / prod

- Vérifier le binding D1 `DB` et `ANTHROPIC_API_KEY` dans Cloudflare Pages (Settings → Functions / Environment variables)
- Configurer `BACKOFFICE_EMAIL` (sinon défaut `leads@smartseniors.fr`)
- Alimenter `data/ehpads.json` avec de vraies données EHPAD partenaires puis `npm run seed:remote`
- Tester le flux complet : funnel → POST /api/leads → email partenaires → GET /api/ehpads → cartes + CSV
- Vérifier la délivrabilité MailChannels (SPF/DKIM domaine `smartseniors.fr`)
- Ajouter un domaine custom (ex. `smartseniors.fr`)

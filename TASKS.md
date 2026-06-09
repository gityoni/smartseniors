# SmartSeniors — Suivi des tâches

## ✅ Fait

- `pages/index.html` — **refonte design « Aurore »** : 2 vues (Accueil landing + Conversation chat+funnel), thème via `ss-theme.css` / `ss-landing.css` / `ss-chat.css` / `ss-funnel.css`, copie hero validée + 5 chips d'entrée. JS 100 % préservé (chat streaming, funnel 13 étapes, scoring, leads, ehpads, CSV)
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
- **Cerveau Emma — quick wins** : `chat.js` passé en **`claude-opus-4-8`** (+ garde anti-fuite de raisonnement) · enums `extract.js` harmonisés sur le canonical schéma/funnel (`lien_proche`, `situation_actuelle`) · **caching diagnostiqué** : no-op sur Opus tant que le prompt < 4096 tok (~2130 actuellement) → s'activera à l'enrichissement playbook

## 🚧 En cours — Démo partenaire (présentation prospect)

> Objectif : montrer une discussion fluide famille ↔ Emma + un back-end qui **crée le lead en temps réel** et le transmet aux résidences partenaires.
> Approche retenue : **extraction conversationnelle** (Emma mène la découverte, le lead se remplit en direct côté back-office) + **mode démo scripté rejouable** (scénario réel Alex ↔ famille).

**Outillage biblio (apprentissage Emma) :**
- [x] Notebook Colab `notebooks/emma_transcription_biblio.ipynb` — transcription Whisper (+ diarization) → fiche conseillère (Claude `claude-opus-4-8`, tool use + prompt caching) → playbook Emma
- [x] Variante **Drive-persistante** `notebooks/emma_transcription_biblio_drive.ipynb` — `audio/`+`transcripts/`+`fiches/` persistés sur Google Drive ; transcription & extraction **idempotentes** (ne retraite que les nouveaux appels) ; playbook régénéré sur **tout** le corpus accumulé
- [x] Biblio `knowledge/` — transcripts (raw ignoré RGPD / clean) + `fiches/` + `emma-playbook.md` + méthodologie

**Démo :**
- [ ] **Récupérer le transcript** (speech-to-text de l'appel 25 min Alex ↔ famille, labels locuteurs) — via le notebook ci-dessus
- [ ] **Phase 1 — Scénario & calage** : reconstituer le scénario de démo à partir du transcript ; caler la phase découverte d'Emma sur le déroulé réel (santé / lieu / pathologie / cadre familial / finances)
- [x] **Phase 2 — Extraction conversationnelle** : `pages/functions/api/extract.js` — tool use (haiku-4-5) qui parse la conversation → champs du lead (identité : nom/prénom/date de naissance/CP+ville ; solution : délai/ville+rayon/budget)
- [x] **Phase 2 — Back-office « lead en direct »** : `pages/demo.html` — panneau qui se remplit au fil de la conversation (identité → GIR → budget → délai → score d'urgence) jusqu'à « lead envoyé à X résidences » + aperçu email
- [x] **Mode démo scripté** : bouton « ▶ Rejouer la démo » dans `demo.html` (scénario famille fictif rejoué sur la vraie API)
- [ ] **Phase 3 — Répétition / sécurisation** du run en live
- [x] **Re-skin `demo.html`** en Aurore (vitrine partenaire) : **pipeline réel conservé** (`/api/chat` streaming + `/api/extract` → dossier en direct + score d'urgence + `/api/ehpads` → « lead envoyé » + aperçu email), look « Dossier en direct » du proto, **toggle Démo scriptée ⇄ Live** pour Laurent (autoplay au chargement)

## 🆕 Feature — documents pré-remplis (levier véracité / confiance)

> Idée : proposer au téléchargement des **documents officiels pré-remplis** avec les infos déjà collectées par le funnel/extraction (renforce la véracité du lead + valeur perçue famille).
> Exemples : **dossier APA en résidence**, **dossier APA à domicile**, **simulation Grille AGGIR** (GIR), **liste des adresses des conseils départementaux (CR)** où envoyer le dossier, dossier d'admission EHPAD.
- [x] **Bibliothèque catalogue** : `data/documents.json` + `data/documents.schema.json` — 8 documents (admission, médical, estimation AGGIR, APA, adresses CD, aide-mémoires visite/entrée, +plan métro flaggé) mappés aux **champs du lead**, avec garde-fous (médical = médecin uniquement, GIR = estimation indicative)
- [ ] Brancher sur les champs déjà collectés (GIR, situation, date de naissance, ville proche → conseil départemental, etc.)
- [ ] Remplace/enrichit les boutons docs actuels de `index.html` (pane résultats : `dl-visite` / `dl-dossier` / `dl-entree`) qui ne font aujourd'hui que déclencher une réponse d'Emma
- [ ] **Moteur de génération** : approche retenue = **HTML→PDF pré-rempli** (templates maison, indépendant du format source) ; AcroForm/pdf-lib en option ciblée. À implémenter (client ou edge function).
- [ ] Constituer la source « adresses des Conseils départementaux par département » (pour le doc APA)
- [ ] Décider quels PDF sources committer (officiels publics vierges) vs garder en réf. seule (exemples médicaux → prudence RGPD)

## 🔴 À faire — infra / prod

- [ ] **Rafraîchir `CLAUDE.md`** : design system (Aurore, plus beige/brun) + nouveaux fichiers CSS *(modèle LLM ✅ tranché : chat `claude-opus-4-8`, extraction `claude-haiku-4-5`)*

- Vérifier le binding D1 `DB` et `ANTHROPIC_API_KEY` dans Cloudflare Pages (Settings → Functions / Environment variables)
- Configurer `BACKOFFICE_EMAIL` (sinon défaut `leads@smartseniors.fr`)
- [x] `data/ehpads.json` alimenté avec **350 résidences partenaires de Laurent** (Google Sheet « Mail Propal v1 ») — CP→département + tarif extraits automatiquement. **Reste à faire côté toi** : `npm run seed:remote` (charge en D1 prod). ⚠️ 12 sans email · 3 exclues (1 belge, 2 sans adresse/CP) · colonne « Direction » (contact) non injectée (champ à ajouter si besoin)
- Tester le flux complet : funnel → POST /api/leads → email partenaires → GET /api/ehpads → cartes + CSV
- Vérifier la délivrabilité MailChannels (SPF/DKIM domaine `smartseniors.fr`)
- Ajouter un domaine custom (ex. `smartseniors.fr`)

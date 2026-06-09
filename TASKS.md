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

## 🚧 En cours — Démo partenaire (présentation prospect)

> Objectif : montrer une discussion fluide famille ↔ Emma + un back-end qui **crée le lead en temps réel** et le transmet aux résidences partenaires.
> Approche retenue : **extraction conversationnelle** (Emma mène la découverte, le lead se remplit en direct côté back-office) + **mode démo scripté rejouable** (scénario réel Alex ↔ famille).

**Outillage biblio (apprentissage Emma) :**
- [x] Notebook Colab `notebooks/emma_transcription_biblio.ipynb` — transcription Whisper (+ diarization) → fiche conseillère (Claude `claude-opus-4-8`, tool use + prompt caching) → playbook Emma
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
- [ ] Brancher sur les champs déjà collectés (GIR, situation, date de naissance, ville proche → conseil départemental, etc.)
- [ ] Remplace/enrichit les boutons docs actuels de `index.html` (pane résultats : `dl-visite` / `dl-dossier` / `dl-entree`) qui ne font aujourd'hui que déclencher une réponse d'Emma
- [ ] Génération PDF pré-rempli (côté edge function ou client)

## 🔴 À faire — infra / prod

- [ ] **Rafraîchir `CLAUDE.md`** : design system (Aurore, plus beige/brun), nouveaux fichiers CSS, modèle LLM (`claude-opus-4-6` vs `-4-8` à trancher)

- Vérifier le binding D1 `DB` et `ANTHROPIC_API_KEY` dans Cloudflare Pages (Settings → Functions / Environment variables)
- Configurer `BACKOFFICE_EMAIL` (sinon défaut `leads@smartseniors.fr`)
- Alimenter `data/ehpads.json` avec de vraies données EHPAD partenaires puis `npm run seed:remote`
- Tester le flux complet : funnel → POST /api/leads → email partenaires → GET /api/ehpads → cartes + CSV
- Vérifier la délivrabilité MailChannels (SPF/DKIM domaine `smartseniors.fr`)
- Ajouter un domaine custom (ex. `smartseniors.fr`)

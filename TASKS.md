# SmartSeniors — Suivi des tâches

> Branche de dev : `claude/nice-keller-ndfx1g` · prod = `main` (auto-deploy Cloudflare).
> Previews automatiques par commit (`*.smartseniors.pages.dev`).

## ✅ Fait

### Préparation pitch Cap Retraite — design premium + Emma sur Opus 5 (28/07)
- **Cerveau d'Emma → `claude-opus-5`** (depuis `claude-opus-4-8`) : réflexion adaptative, `output_config.effort: "medium"` (compromis intelligence/latence pour une conversation courte ; passer à `"low"` si le TTFT gêne), `max_tokens` 1536 → **4096** (la réflexion est active par défaut et compte dans l'enveloppe). **Repli serveur** (`fallbacks: "default"` + bêta `server-side-fallback-2026-07-01`) activé, avec **nouvel essai automatique sans le bêta** si le compte ne l'a pas ouvert → aucun risque de couper le chat pendant la démo.
- **Prompt affiné pour Opus 5** : bloc `<preference_ton>` en fin de `BASE_SYSTEM_PROMPT` (concision, une étape à la fois, pas d'ajout de démarches non sollicitées, pas de narration des corrections) — Opus 5 est plus bavard et plus enclin à élargir le périmètre que 4.8.
- `extract.js` **laissé sur `claude-haiku-4-5`** : appelé à chaque tour sur un schéma figé, c'est le bon arbitrage coût/latence.
- **`pages/ss-demo.css`** — couche « premium » de la démo, scope `.ss-root[data-premium]`, chargée **en dernier** dans `demo.html` : champ d'aurore animé en fond, bordures dégradées (carte maîtresse + carte promo en conique animé), balayages lumineux au remplissage des champs, ✓ qui se dessine, halo sur l'avatar d'Emma quand elle parle, jauges avec reflet, badge de score animé, aperçu e-mail retravaillé, selects et boutons re-stylés, `prefers-reduced-motion` respecté.
- **En-tête compacté + hauteur auto-adaptative** : top-bar 16 → 9 px, kicker retiré (doublon de la pastille top-bar), titre et lede réduits. Surtout, `#demo-split` ne dépend plus d'un `calc(100vh - 215px)` à réajuster à la main : `.ss-root` est un flex colonne en `height:100vh` et le split prend `flex:1 1 0`. ⚠️ `width:100%` explicite sur `.ss-convo-head` et `#demo-split`, sinon leur `margin:0 auto` bloque l'étirement en flex. Gain mesuré à 1440×900 : en-tête 215 → 146 px, chat **578 → 679 px de large** et **+46 px de haut**, zéro scroll de page.
- **Accueil d'Emma refondu (2 bulles, instantané)** : l'ancienne intro demandait un *récit* (« racontez-moi ce qui vous amène ») à quelqu'un d'épuisé, et ne disait pas qui était Emma — alors que la peur n°1 de la cible (fille de 45-65 ans) est le démarchage. Nouvelle intro en 2 bulles : reconnaissance de l'état émotionnel + cadre (**gratuit, aucun formulaire, personne n'appelle sans accord**), puis une question qui nomme une émotion (« qu'est-ce qui vous inquiète le plus ? ») au lieu de réclamer un récit. Flag `noThink` sur les steps d'accueil : plus de bulle « je réfléchis » avant qu'on ait parlé à Emma (illogique, et ça doublait avec 2 bulles). Accueil mesuré à **~1 s** après chargement. Message d'accueil du mode Live aligné.
- **Rythme & voix** : Emma enchaînait trop vite après la famille (~870 ms, pas le temps de lire la bulle). Ajout de `readPause()` — base 700 ms + 14 ms/caractère, borné à 2,6 s — donc « Oui, d'accord. » attend 0,9 s et un paragraphe de 6 lignes attend 2,6 s ; une constante ne pouvait pas convenir aux deux. Voix passée de 1× à **1,15×** (`vRate`), avec `preservesPitch` posé explicitement sur l'`<audio>` → aucune montée de timbre. Choix du levier client plutôt que `voice_settings.speed` côté `tts.js` : toucher aux réglages ElevenLabs invaliderait le **cache edge déjà préchauffé**, à éviter avant un pitch. Durée du scénario à 1× voix coupée : **117 s**.
- **`index.html` intentionnellement intact** (vérifié au navigateur : ni `data-premium`, ni aurore) — la couche premium ne touche que la démo.
- **`knowledge/pitch-cap-retraite.md`** : message d'ouverture, **5 pitchs** (coût de la nuit · lead pré-dédupliqué · risque renversé · dossier prêt vs chatbot · qui industrialise en premier), objections/réponses, déroulé des 20 min, offre à poser (modèle A + clause d'option B).
- ⚠️ Le **pré-check dédup par hash** est *spécifié, pas livré* — le document de pitch le dit explicitement pour éviter toute survente en RDV.

### Démo pitch-ready + voix Shana (10-11/06)
- **Layout face-à-face plein écran** : carte à hauteur viewport, chat + dossier défilent **en interne** (plus aucun scroll de page), dossier auto-scroll vers le champ qui se remplit, **play/pause + Rejouer toujours visibles** (texte blanc dans les 2 états).
- **Scénario reworded intégralement** (texte fourni et validé par Yonatan) : fugue + question agitation → unités sécurisées (décision médecin coordinateur) → AGGIR expliqué A/B/C → localisation amenée avec tact → présentation SmartSeniors → budget/APA → épargne 85 k€ → consentement → dossier → final features. Seule retouche : « maisons de retraite » → « établissements » (vocabulaire marque). 11 champs dossier ✅.
- **Voix d'Emma = Shana (ElevenLabs)** : `eleven_multilingual_v2`, voice_id `vUH2A53pJe77Jd2xNGHv` **codé en défaut** dans `tts.js` (surcharge possible via `ELEVENLABS_VOICE_ID`). Sélecteur top-bar Coupée / **Emma (studio)** / Navigateur ; secours OpenAI auto ; réglages « jeune, pétillante » (stability .45, style .4). Clés **ELEVENLABS + OPENAI posées (Prod + Aperçu)**. Cache edge préchauffé 21/21 — ⚠️ cache **par datacenter** : refaire un run à blanc depuis la machine du pitch.
- **`/voix-test` + `/api/tts-voices`** : navigateur de voix FR (previews natifs + adoption Voice Library + test réplique) — a servi au choix de Shana, **à verrouiller**.
- **Conseils pitch Meet** documentés (CLAUDE.md § Stratégie) : onglet Chrome + audio, 1×, pauses commentées, vidéo de secours.

### Vérification prod + affinage funnel live & démo (10/06)
- **Vérifié en ligne** : `/` 200 · `/demo` 200 · `/api/chat` ✅ (opus-4-8, streaming, caching actif ~6,8k tok) · `/api/extract` ✅ (haiku, extraction correcte) · `/api/leads` ✅ (validation OK). ⚠️ D1 toujours **non seedée** (constaté : fallback renvoyé).
- **Fallback EHPAD réel** : `_partners.js` généré depuis `data/ehpads.json` (`scripts/build-partners-fallback.mjs`) → `/api/ehpads` renvoie les **vraies 350 résidences** même sans D1 (fini le mock fictif). Map ville→dept dérivée des données (+ grandes villes) : « Garches » → 92 fonctionne.
- **`_geo.js`** : `findDept()` partagé `ehpads.js` + `leads.js` (normalisation accents/tirets/st→saint, mots entiers).
- **Consentement bout en bout** (règle métier) : étape oui/non au pane contact du funnel `index.html` → `contact_consent` dans le lead → email partenaire bascule sur le **n° conseiller `07 57 99 11 40`** si « non » (HTML + texte brut, tél/email famille masqués) → consigne passée à Emma via le contexte funnel.
- **Budget réellement collecté** : select optionnel au pane contact (`moins_2000` / `2000_3000` / `3000_plus` — labels déjà gérés par l'email) ; `F.budget_mensuel` n'existait pas → partait toujours vide.
- **Voix d'Emma dans la démo** : sélecteur « Coupée / Emma (studio) / Navigateur ». Studio = `/api/tts` OpenAI `gpt-4o-mini-tts` voix `nova` (jeune, douce, jamais métallique), **cache edge** (le scénario ne coûte qu'une génération), préchargement de la réplique suivante, repli auto navigateur si clé absente. Le scénario attend la fin de lecture ; Pause gèle la voix ; lecture aussi en mode Live.
- **Démo mode Live affiné** : le dossier remplit aussi **Adresse** + **Contact souhaité** (extract enrichi : `adresse_proche`, `contact_consent`), **score d'urgence animé en Live** (même heuristique que le funnel), erreur lisible si `ANTHROPIC_API_KEY` absente (au lieu de « une erreur est survenue »).

### Frontend famille — design « Aurore »
- `pages/index.html` : 2 vues **Accueil** (landing : hero validé « Un moment délicat… » + 5 chips) ⇄ **Conversation** (chat Emma + funnel 13 étapes + cartes EHPAD + CSV). JS d'origine 100 % préservé.
- CSS modulaire : `ss-theme.css` · `ss-landing.css` · `ss-chat.css` · `ss-funnel.css` (funnel re-skin vert `#12463C` + cartes EHPAD).
- `pages/confidentialite.html` (RGPD).

### Démo partenaire — `pages/demo.html`
- **Player déterministe** (mode « Démo », autoplay) : scénario figé Garches/Jeanne, réponses Emma pré-écrites, streaming mot-à-mot, **curseur vitesse 0,5×–2×**, Rejouer. Zéro API → zéro surprise.
- **Widget AGGIR interactif** (6 items A/B/C) → estimation **GIR 2** indicative.
- **Création du lead** scénarisée : nom, prénom, date de naissance, adresse, **tél + e-mail** du contact + **consentement**.
- **Cartes features** : GIR · PDF d'admission pré-rempli · **promo L'Empereur 110 €/j** · vidéo (youtu.be/DvSet0Rkjkk) · itinéraire vers L'Empereur (Garches).
- **Mode Live** conservé : vrai `/api/chat` + `/api/extract` → dossier en direct.

### Cerveau Emma
- `chat.js` : **`claude-opus-5`** (réflexion adaptative · effort `medium` · repli serveur) + prompt nourri du **playbook v3** (vrais appels) : objections (refus, maltraitance/grille de visite, APA vs ASH, « vous êtes qui ? », pathologie lourde, qualité≠prix…), empathie, pièges, **règle de consentement**, **caching ACTIF** (prompt > 4096 tok).
- `extract.js` : tool-use `claude-haiku-4-5`, enums harmonisés sur le schéma/funnel.
- `knowledge/emma-playbook.md` (v3) + `notebooks/emma_transcription_biblio_drive.ipynb` (Colab Drive-persistant, idempotent).

### Données & API
- `data/ehpads.json` : **350 résidences de Laurent** (CP→dept + tarif auto) ; L'Empereur enrichi (direction + promo). `data/ehpads.schema.json` (+ `direction`, `promo`).
- `data/documents.json` + schema : **9 documents** catalogués (admission, médical, AGGIR, APA, adresses CD, aide-mémoires, métro/itinéraire, vidéo) + `data/documents/sources/` (AGGIR + admission vierges).
- `ehpads.js` (D1 → fallback réel `_partners.js`) · `leads.js` (D1 + scoring + email MailChannels) · `admin/import-ehpads.js`.
- `schema.sql` (tables `leads`, `ehpads`) · D1 `smartseniors-db` créée · déploiement Cloudflare live.

## 🔴 À faire — prod / données (côté toi, Cloudflare)
- [ ] **`npm run seed:remote`** : charger les 350 EHPAD en D1 prod (nécessite `npx wrangler login`). *Toujours nécessaire pour l'**envoi des emails partenaires*** (le fallback `_partners.js` ne couvre que l'affichage `/api/ehpads`).
- [ ] Compléter dans le GSheet : **12 résidences sans e-mail** + **3 exclues** (1 belge, 2 sans CP) → re-export → re-seed.
- [x] **`ELEVENLABS_API_KEY`** posée (Prod + Aperçu) · voix d'Emma choisie : **Shana** (`vUH2A53pJe77Jd2xNGHv`, défaut codé dans `tts.js`).
- [ ] **Merger la branche vers `main`** avant le pitch → présenter depuis `smartseniors.pages.dev/demo` + run à blanc voix sur la machine du pitch.
- [ ] **Enregistrer une vidéo de secours** du run complet avec le son (plan B si réseau).
- [ ] **Verrouiller/retirer `/voix-test` + `/api/tts-voices`** maintenant que la voix est choisie (outil interne ouvert).
- [ ] Restreindre la clé ElevenLabs à **Text to Speech seul** (l'écriture Voices ne sert plus après le choix).
- [x] **`OPENAI_API_KEY`** à ajouter dans Cloudflare (Production **et** Aperçu, comme la clé Anthropic) pour la voix studio d'Emma `/api/tts`. Optionnel : `OPENAI_TTS_VOICE` (`nova` défaut, sinon `coral`/`shimmer`).
- [x] **`ANTHROPIC_API_KEY` en environnement Preview** — fait le 10/06 (Paramètres → « Choisir l'environnement : Aperçu » → Variables et secrets) ; mode Live vérifié OK sur la preview de branche.
- [ ] Vérifier binding `DB` + `BACKOFFICE_EMAIL`.
- [ ] Délivrabilité **MailChannels** (SPF/DKIM `smartseniors.fr`) · domaine custom.
- [ ] Tester le flux complet : funnel → `/api/leads` → emails partenaires → `/api/ehpads` → cartes + CSV.

## 🚧 À faire — démo & features
- [ ] **SEO local programmatique** (canal n°1 du plan 100 leads/mois) : générateur de ~390 pages « EHPAD à [ville/département] » depuis `data/ehpads.json` + sitemap + schema.org — le site n'a quasi pas de surface indexable aujourd'hui.
- [ ] **Pré-check dédup par hash** sur l'API leads (empreinte nom+tél → connu/inconnu avant envoi du lead en clair) — argument clé de la négociation partenaire.
- [ ] **Mode Live** : continuer l'affinage (volontairement non montré au pitch).
- [ ] **Démo** : répétition générale (Meet test avec un 2ᵉ appareil pour valider l'audio d'onglet) ; décider no-naming vs nommage résidence en mode famille.
- [ ] **Moteur de génération de docs** (HTML→PDF pré-rempli) — pour de vrai (aujourd'hui simulé dans la démo) ; brancher sur les champs du lead ; remplacer les boutons `dl-visite`/`dl-dossier`/`dl-entree` de `index.html`.
- [ ] **Itinéraire** : data station/coords par résidence + lien RATP/Citymapper (aujourd'hui simulé).
- [ ] **Vidéo** : vidéothèque par résidence (aujourd'hui une vidéo placeholder).
- [ ] **Adresses Conseils départementaux** par dept (pour le doc APA).
- [ ] Schéma `leads` : ajouter `adresse_proche` + `contact_consent` si on persiste ces champs (le consentement est désormais **collecté et appliqué à l'email**, mais pas encore stocké en D1).
- [ ] **Durcir l'anonymisation** du notebook Colab (lieux/hôpitaux résiduels) → committer les fiches scrubbées si besoin.
- [ ] Continuer à enrichir le playbook avec d'autres appels (Colab Drive) → re-passe sur le prompt d'Emma.

## 📌 Repères
- Consentement (règle métier) : oui → tél famille · **non → lead transmis avec le conseiller `07 57 99 11 40`**.
- Démo : `/demo` (preview de branche ou prod après merge). Le **texte** tourne sans clé ; la **voix studio** nécessite `ELEVENLABS_API_KEY` (secours `OPENAI_API_KEY`).
- Pitch : **démo scriptée SEULE** (Live pas montré) · voix **Shana** · vitesse **1×** avec voix · partager **un onglet Chrome + audio** sur Meet.
- Deal partenaire : résidences paient **1 000-4 000 €/admission** · **dédup obligatoire** à réception · modèles **A** (CPL au lead validé) / **B** (SaaS + 20-25 %/admission) · séquence **A → option B** · détail : CLAUDE.md § Stratégie.

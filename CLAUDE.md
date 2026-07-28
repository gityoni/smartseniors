# SmartSeniors — Mémoire projet (Claude Code)

## Identité du projet
SmartSeniors est une plateforme de **génération de leads qualifiés** pour la recherche d'EHPAD (établissements d'hébergement pour personnes âgées dépendantes).
Emma, conseillère IA, accompagne les familles dans leur recherche avec empathie et professionnalisme **et** qualifie le besoin au fil de la conversation. Chaque dossier complet devient un **lead exclusif transmis en temps réel aux résidences partenaires** du secteur.
Répond en français, dans un langage simple, rassurant et structuré.

## Persona IA — Emma
- **Nom** : Emma
- **Rôle** : Conseillère senior SmartSeniors, spécialisée EHPAD
- **Ton** : Empathique, bienveillant, professionnel
- **Mission** : Accueillir les familles, comprendre leurs besoins, les orienter vers les bons EHPAD
- **Règles** : Jamais de conseil médical direct, toujours orienter vers un professionnel pour les questions de santé. **Jamais de promesse de disponibilité / lit réservé** (SmartSeniors transmet le lead aux résidences, ce sont elles qui confirment). Jamais citer d'établissement réel par son nom (sauf la démo partenaire, contrôlée). **Consentement** : demande toujours si les résidences peuvent recontacter directement (oui → tél famille ; non → transmission via le conseiller `07 57 99 11 40`).
- **Source du prompt** : le `BASE_SYSTEM_PROMPT` de `chat.js` est nourri par `knowledge/emma-playbook.md` (synthèse de vrais appels conseiller ↔ famille, via `notebooks/emma_transcription_biblio.ipynb`).
- **Vocabulaire imposé** : « votre maman / votre papa » (jamais « votre proche »), « solution d'accompagnement » (jamais « placement »), « établissement / résidence » (jamais « maison de retraite »). Une seule question à la fois, toujours valider l'émotion avant de questionner.
- **Process de qualification (ordre strict)** : 1) contexte émotionnel → 2) profil du senior → 3) autonomie/GIR → 4) localisation → 5) budget → 6) délai/urgence → 7) critères spéciaux. Le prompt complet vit dans `pages/functions/api/chat.js`.

## Stack technique
- **Frontend** : HTML / JS vanilla, design **« Aurore »** (`ss-theme.css` + `ss-landing.css` + `ss-chat.css` + `ss-funnel.css`, `data-direction="aurore"`). `pages/index.html` = Accueil ⇄ Conversation ; `pages/demo.html` = démo partenaire
- **API** : Cloudflare Pages Functions (`pages/functions/api/`)
- **LLM** : chat Emma `claude-opus-5` (streaming SSE · réflexion adaptative · `effort: medium` · repli serveur activé) · extraction lead `claude-haiku-4-5` (tool use)
- **Base de données** : Cloudflare D1 (SQLite edge) — binding `DB` (id `3c1a84ef-2d23-42d4-853a-748f0cc16847`)
- **Email** : MailChannels (envoi des leads aux résidences partenaires)
- **Hébergement** : Cloudflare Pages (auto-deploy sur push `main`)
- **Config** : `wrangler.toml` (nom, D1 binding, pages output dir)
- **Repo** : `gityoni/smartseniors`

## Fichiers clés
| Fichier | Rôle |
|---|---|
| `pages/index.html` | **Accueil famille (Aurore)** : 2 vues — landing (hero validé + 5 chips) ⇄ Conversation (chat Emma + funnel 13 étapes + cartes EHPAD + CSV) |
| `pages/demo.html` | **Démo partenaire** : player déterministe (scénario Garches/Jeanne · AGGIR interactif A/B/C · cartes GIR/PDF/promo/vidéo/itinéraire) + mode **Live** (vrai `/api/chat` + `/api/extract`) |
| `pages/ss-theme.css` · `ss-landing.css` · `ss-chat.css` · `ss-funnel.css` | Design system Aurore : tokens/top-bar · landing · chat+dossier · funnel re-skin + cartes EHPAD |
| `pages/ss-demo.css` | **Couche « premium » de la démo** (scope `.ss-root[data-premium]`) : champ d'aurore animé, bordures dégradées, balayages lumineux, ✓ qui se dessine, halo d'Emma. Chargée en dernier dans `demo.html` — **n'affecte jamais `index.html`** |
| `pages/functions/api/chat.js` | Edge function streaming Anthropic (persona Emma `opus-5` + prompt v3 nourri du playbook + bloc `<preference_ton>` + contexte funnel + prompt caching) |
| `pages/functions/api/ehpads.js` | GET /api/ehpads?localite= — liste EHPAD par département (D1 → fallback **réel** `_partners.js`) |
| `pages/functions/api/_partners.js` | **Généré** (`node scripts/build-partners-fallback.mjs` depuis `data/ehpads.json`) : 350 résidences par département + map ville→dept — ne pas éditer à la main |
| `pages/functions/api/_geo.js` | `findDept(localite)` partagé ehpads/leads (CP → 2 chiffres → ville normalisée) |
| `pages/functions/api/tts.js` | POST /api/tts — voix studio d'Emma : **ElevenLabs prioritaire** (`eleven_multilingual_v2`, voix FR native via `ELEVENLABS_VOICE_ID`), secours OpenAI `gpt-4o-mini-tts` (`coral`), cache edge par hash moteur+voix+texte |
| `pages/functions/api/tts-voices.js` + `pages/voix-test.html` | Outil interne de choix de voix : liste/écoute les voix FR ElevenLabs (compte + Voice Library), adopte et teste la réplique d'Emma — à verrouiller après choix |
| `pages/functions/api/leads.js` | POST /api/leads — sauvegarde D1 + scoring urgence + email aux EHPAD partenaires (**consentement** : `non` → n° conseiller à la place du tél famille) |
| `pages/functions/api/admin/import-ehpads.js` | Endpoint admin d'import EHPAD (depuis GSheet/JSON) |
| `pages/confidentialite.html` | Page RGPD / mentions |
| `pages/manifest.json`, `pages/sw.js`, `pages/icon-*.png` | PWA (installable, offline shell) |
| `data/ehpads.json` + `data/ehpads.schema.json` | Source de vérité des EHPAD partenaires (seedés en D1) |
| `data/documents.json` + `data/documents.schema.json` | Bibliothèque des documents qu'Emma génère pré-remplis (admission, médical, AGGIR, APA, itinéraire, vidéo…) — mappés aux champs du lead |
| `data/documents/sources/` | PDF officiels vierges (grille AGGIR, dossier d'admission Cerfa) — réf. de structure |
| `knowledge/emma-playbook.md` | Playbook (v3) issu de vrais appels → nourrit le `BASE_SYSTEM_PROMPT` |
| `notebooks/emma_transcription_biblio_drive.ipynb` | Pipeline Colab **Drive-persistant** : appels → fiches → playbook (idempotent) |
| `scripts/seed.mjs`, `scripts/import-ehpads.mjs`, `scripts/gsheet-to-api.gs` | Seed D1 + import EHPAD |
| `schema.sql` | Schéma D1 : tables `leads` (riche) et `ehpads` |
| `wrangler.toml` | Config Cloudflare Pages / D1 |
| `CLAUDE.md` | Mémoire projet (ce fichier) |
| `TASKS.md` | Suivi des tâches |

## Architecture lead gen

### Flux utilisateur
1. L'utilisateur arrive sur `pages/index.html` — Emma seule au premier plan (welcome plein écran).
2. Il discute librement avec Emma (chat streaming) et/ou lance le funnel de qualification.
3. **Funnel (13 étapes)** : type de résidence, lien avec le senior, délai, ville + rayon, prénom/nom du proche, date de naissance, genre, niveau d'autonomie (GIR), situation actuelle, ville actuelle du proche, puis contact famille (nom, téléphone, email + **budget optionnel** + **consentement recontact direct** oui/non).
4. Le **contexte funnel** est passé à Emma à chaque message (`getFunnelContext()`) → elle personnalise sans redemander.
5. **Création du lead en 2 temps** :
   - **Lead partiel** dès l'étape 3 (`source: funnel_partial`, `nb_etapes_completees: 3`) — capture early.
   - **Lead complet** en fin de funnel (`nb_etapes_completees: 13`) avec **score d'urgence** et **statut** (chaud / tiède / froid).
6. À la complétion (`nb_etapes_completees >= 10`), `leads.js` **envoie un email à chaque EHPAD partenaire du département** + une notification backoffice.
7. Les résultats EHPAD s'affichent dans le chat sous forme de cartes ; bouton CSV pour télécharger la liste.

### Endpoints API
| Endpoint | Méthode | Description |
|---|---|---|
| `POST /api/chat` | POST | Chat streaming SSE avec Emma (Anthropic) — body `{ message, history, funnel }` |
| `GET /api/ehpads?localite=` | GET | Liste EHPAD par localité (département extrait) |
| `POST /api/leads` | POST | Sauvegarde lead en D1 + scoring + email MailChannels aux EHPAD partenaires |
| `POST /api/extract` | POST | Extraction lead conversationnelle (haiku tool-use) — body `{ history }` → `{ lead }` |
| `POST /api/tts` | POST | Voix d'Emma (**ElevenLabs Shana** prioritaire, secours OpenAI ; mp3, cache edge) — body `{ text, voice_id?, voice? }` |
| `GET/POST /api/tts-voices` | — | Outil interne de choix de voix ElevenLabs (**à verrouiller/retirer**) |
| `POST /api/admin/import-ehpads` | POST | Import administrateur des EHPAD partenaires |

### Scoring d'urgence
Calculé côté frontend à la complétion du funnel, stocké sur le lead :
- Délai `urgent` / `1_mois` → +4 ; `1_3_mois` → +2
- Situation `hopital` → forte pondération ; autonomie `tres_dependant` / `semi_dependant` → +1
- **Statut** : score ≥ 7 → `chaud`, ≥ 4 → `tiède`, sinon `froid`. Le score (0–10) est affiché en étoiles dans l'email partenaire.

### Détection département
`findDept()` dans `_geo.js`, partagé par `ehpads.js` et `leads.js` :
1. Code postal 5 chiffres → prend les 2 premiers
2. Débute par 2 chiffres → département direct
3. Ville normalisée (accents, tirets, st→saint) → département via `VILLE_TO_DEPT` (villes des 350 partenaires + grandes villes) — ex. « Garches » → 92.

### Données EHPAD
- Source de vérité : `data/ehpads.json` (seedée en D1 via `scripts/seed.mjs`).
- `ehpads.js` requête D1 en priorité, **fallback réel bundlé** (`_partners.js` = les 350 résidences) si D1 vide ou indisponible. Après modif de `data/ehpads.json` : `node scripts/build-partners-fallback.mjs` pour régénérer.
- `DEFAULT_EHPADS` retourné si département inconnu.
- ⚠️ Les **emails partenaires** de `leads.js` ne partent que depuis D1 (pas depuis le fallback) → le seed D1 reste indispensable à l'envoi des leads.

## Base de données D1

### Table `leads` (qualification complète)
```
id, contact_nom, contact_prenom, contact_telephone, contact_email,
type_residence, lien_proche, delai,
ville_recherche, departement, rayon_km, budget_mensuel,
nb_personnes, genre_proche, prenom_proche, nom_proche,
situation_actuelle, date_naissance_proche, age_proche, niveau_autonomie, ville_proche_actuelle,
score_urgence, statut, source, nb_etapes_completees, localite, created_at
```

### Table `ehpads`
```
id, nom, adresse, ville, code_postal, departement, telephone, email,
places_disponibles, tarif_jour, created_at
```

### Setup / seed D1
1. `npx wrangler d1 execute smartseniors-db --file=schema.sql --remote`
2. `npm run seed:remote` (charge `data/ehpads.json` en D1)

## Démo partenaire — `pages/demo.html` (player construit)
Objectif : montrer à une société partenaire « seniors » qu'Emma **qualifie ET délivre** — le lead se crée en direct côté back-office + Emma produit tout (GIR, PDF, promo, vidéo, itinéraire).

**2 modes (toggle dans la top-bar) :**
- **Démo scriptée (déterministe)** — *mode par défaut, autoplay* : scénario figé (**texte intégral validé le 10/06**), streaming mot-à-mot, **vitesse 0,4×–2×** (défaut 0,4× ; **avec voix → mettre 1×**), **play/pause + Rejouer toujours visibles**, layout **face-à-face plein écran** (hauteur viewport fixe, chat et dossier défilent chacun en interne, le dossier auto-scrolle vers le champ rempli). **Zéro API pour le texte.**
- **Voix d'Emma** : sélecteur top-bar « Coupée / **Emma (studio)** / Navigateur » (OFF par défaut — le choix vaut geste utilisateur pour l'audio). Studio = `/api/tts` (OpenAI, voix jeune et douce, mp3 caché à l'edge, préchargement de la réplique suivante, repli auto voix navigateur si clé absente) ; Navigateur = Web Speech API locale. Le scénario attend la fin de lecture ; Pause gèle la voix ; en Live la réponse est lue après le streaming.
- **Live** : Laurent tape, **vrai pipeline** `/api/chat` + `/api/extract` → le dossier se remplit pour de vrai, **y compris adresse + consentement + score d'urgence animé** (nécessite `ANTHROPIC_API_KEY` ; clé absente → message d'erreur explicite dans le chat).

**Scénario démo (fictif)** : Sylvie ↔ Emma pour sa mère **Jeanne, 82 ans** (Garches, fugue nocturne/Alzheimer non confirmé, refus, retraite modeste 1 600 € + épargne ~85 k€). Déroulé — **un sujet à la fois** : émotion → fugue nommée + **question violence/agitation** → unités adaptées (décision = **médecin coordinateur**) + réponse « mouroir » → **AGGIR interactif expliqué (A/B/C → GIR 2 indicatif)** → localisation amenée avec tact (« vous passez la voir régulièrement ? ») → objection « vous êtes qui ? » (présentation SmartSeniors : EHPAD adapté · aides financières · pédagogie · écoute, sans prétendre n'être lié à aucune résidence) → budget/aides → consentement → **création du lead** (nom, prénom, date de naissance, adresse, tél + e-mail du contact) → **final features** : carte GIR · PDF d'admission pré-rempli · **promo L'Empereur 110 €/j** · vidéo (youtu.be/DvSet0Rkjkk) · itinéraire vers L'Empereur (Garches) → score chaud + « lead envoyé à N résidences ».

**Consentement (règle métier)** : Emma demande toujours « souhaitez-vous que les résidences vous recontactent directement ? » — oui → tél famille ; **non → le lead part avec le n° du conseiller `07 57 99 11 40`** (la famille n'est pas appelée).

> Apprentissage : `knowledge/emma-playbook.md` (v3, vrais appels) nourrit le prompt ; régénéré via le notebook Colab Drive-persistant. Fiches brutes **non committées** (anonymisation Colab à durcir — lieux/hôpitaux résiduels).

## Stratégie & pitch — notes (06/2026)
- **Argumentaire Cap Retraite (Bernard)** : `knowledge/pitch-cap-retraite.md` — message d'ouverture, 5 pitchs, objections, déroulé des 20 min, offre à poser. ⚠️ le pré-check dédup par hash y est présenté comme **engagement technique, pas comme livré**.
- **Pitch partenaire** : Google Meet, **démo scriptée UNIQUEMENT** (le mode Live existe mais n'est pas montré — pas encore au point). Partager **un onglet Chrome avec « Partager l'audio »**, voix **Emma (studio)**, vitesse **1×**, run à blanc avant (cache audio = par datacenter régional), bouton Pause pour commenter. Présenter depuis la **prod après merge** (URL propre).
- ⚠️ **L'alias de branche Cloudflare ment.** Après un push, `claude-<branche>.smartseniors.pages.dev` peut servir le déploiement **précédent** pendant plusieurs minutes — y compris avec un paramètre anti-cache, et alors que les autres fichiers du même build sont déjà à jour (`cache-control: max-age=0, must-revalidate` : ce n'est pas le navigateur, c'est l'alias qui pointe encore ailleurs). Pour vérifier une modif juste après un push, utiliser **l'URL épinglée au commit** donnée par le bot Cloudflare (`<hash>.smartseniors.pages.dev`) — elle est exacte. Et ouvrir l'URL de présentation **quelques minutes avant** le rendez-vous pour contrôler ce qui est réellement servi.
- **Partenaire cible** : organisme de placement (type Cap Retraite) — ils ont les contrats résidences qui paient **1 000-4 000 € par admission** sur lead. Règle métier : à réception, la résidence fait une **validation dédup** (« prospect déjà en base ? ») ; si oui, le lead est mort.
- **Business models** : **A** = vente de leads, CPL par score (chaud 120-150 € · tiède 80-100 €), payé au **lead validé**, clause dédup 72 h + plafond de rejet auditable · **B** = Emma intégrée à LEUR système (SaaS 1-2 k€/mois + **20-25 % par admission**, accès API au cycle de vie du lead). **Stratégie : signer A avec clause d'option vers B** (A = cash immédiat + données réelles ; B = passif, scale sur leur volume). Atout technique à pitcher : **pré-check dédup par hash** (empreinte nom+tél envoyée avant le lead en clair) — à développer sur `leads.js`.
- **Simulation acquisition** (benchmark transfo secteur **7 %** — Cap Retraite & co) : 100 leads/mois = **~1 430 visites/mois (48/jour)**. Canal n°1 : **SEO local programmatique** — ~390 pages « EHPAD à [ville/dept] » générées depuis `data/ehpads.json` (même pattern que `_partners.js`). Pont **Google Ads** M1-M4 (CPL 21-57 €) → objectif atteint **M4-M5**, cumul 6 mois ≈ 12 k€, CPL blended ≈ 18 €. ⚠️ Le site n'a quasi **aucune surface indexable** aujourd'hui : les pages SEO sont LE chantier.
- **Inconnue adoption 45-65 ans → testable, pas projetable** : M1 Ads ~2 k€ ≈ centaines de sessions réelles. Seuils de validation : engagement chat > 8 % · étape 3 > 35 % des engagés · complétion > 50 %. En dessous → framing hybride « Emma + conseiller humain » (le mécanisme consentement/conseiller `07 57 99 11 40` existe déjà). Conversation ≈ 0,20 € → risque paramétrique, pas existentiel.

## Workflow de déploiement
```
modifier fichiers
→ git add . && git commit -m "description" && git push origin main
→ Cloudflare Pages auto-deploy déclenché
→ prod live
```
> Le développement courant se fait sur une branche dédiée, puis merge vers `main` (qui déclenche le déploiement).

## Variables d'environnement (Cloudflare Pages)
| Variable | Usage |
|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (secret, jamais committée) |
| `ELEVENLABS_API_KEY` | Clé ElevenLabs — moteur prioritaire de la voix d'Emma `/api/tts` (accent FR natif) |
| `ELEVENLABS_VOICE_ID` | (optionnel) surcharge la voix d'Emma — défaut codé : **Shana** `vUH2A53pJe77Jd2xNGHv` |
| `ELEVENLABS_MODEL` | (optionnel) `eleven_multilingual_v2` (défaut) · `eleven_v3`, `eleven_turbo_v2_5`… |
| `OPENAI_API_KEY` | Clé OpenAI — voix de secours `/api/tts` (secret) |
| `OPENAI_TTS_VOICE` | (optionnel) voix OpenAI : `coral` (défaut), `shimmer`, `nova`, `sage`… |
| `BACKOFFICE_EMAIL` | Destinataire de la notification interne de lead (défaut `leads@smartseniors.fr`) |
| `DB` | Binding D1 (configuré dans wrangler.toml) |

## Design system

### Palette identitaire — design « Aurore »
| Rôle | Couleur |
|---|---|
| Fond général | `#F1F7F5` (blanc vert d'eau) · alt `#E4F0EC` |
| Header / panneau foncé | `#0E3B33` (vert profond) · « dossier en direct » `#12463C` |
| Encre | `#16302B` · douce `#5E7E78` |
| Accent principal | `#5B8DEF` (bleu) |
| Accent doux | `#9D8CF0` (violet) |

> Porté par `data-direction="aurore"` sur `.ss-root` + accent injecté inline (`--c-accent:#5B8DEF; --c-accent2:#9D8CF0`). 2 autres directions existent (atelier, solstice) mais on est figé sur Aurore.

### Dégradé de marque
```css
linear-gradient(135deg, #5B8DEF 0%, #9D8CF0 100%)
```

### Joy palette (chips, dots)
```css
--joy1:#FF6B6B --joy2:#4ECDC4 --joy3:#FFD93D --joy4:#A855F7 --joy5:#3B82F6 --joy6:#F97316
```

### Typographie
- **Font** : `Nunito` (Google Fonts) — ronde, lisible, accessible seniors
- Taille corps : minimum `1rem` (accessibilité)

### Layout principal — 2 vues
- `index.html` : **Accueil** (`.ss-hero` landing + sections) ⇄ **Conversation** (`.ss-split` = `.chat-side` + funnel `.form-side` vert `#12463C`), bascule par la nav (`.ss-nav-seg`).
- `demo.html` : `.ss-split` = `.chat-side` + `.lead-side` (« dossier en direct »).
- Scope : `.ss-root` · bulles `.crow`/`.cbub`/`.cav` · champs dossier `.lfield` · funnel `.s-*` / `.step-*`.
- Mobile `≤ 900px` : colonne unique.

### UI chat
- Bulles : assistant `.cbub` blanc + avatar `.cav` (dégradé) ; user `.cbub` fond `#5E7E78`.
- Curseur `.ccursor` (streaming) · `.cthink` (3 points « réflexion »).
- `marked.js` (CDN) markdown · cartes EHPAD `.ehpad-result-card` · CSV `.csv-btn`.
- Démo : widget `.aggir` (A/B/C) + cartes features `.dcard-{gir,pdf,promo,video,itineraire}`.

## Règles importantes
- Ne jamais committer `ANTHROPIC_API_KEY` ou tout autre secret
- Langage simple, phrases courtes dans le prompt système Emma
- Toujours orienter vers un professionnel pour les questions médicales
- Accessibilité : `aria-live`, `aria-label`, `role`, focus management
- Source de vérité EHPAD = `data/ehpads.json` (puis seed D1), pas d'édition directe en base

## Karpathy Coding Guidelines

**Tradeoff:** Ces règles privilégient la prudence sur la vitesse. Utilise ton jugement pour les tâches triviales.

### 1. Réfléchir avant de coder
- Énonce tes hypothèses explicitement. Si incertain, demande.
- Si plusieurs interprétations existent, présente-les — ne choisis pas en silence.
- Si une approche plus simple existe, dis-le.
- Si quelque chose est flou, stop. Nomme ce qui est confus. Demande.

### 2. Simplicité d'abord
- Minimum de code qui résout le problème. Rien de spéculatif.
- Pas de features au-delà de ce qui est demandé.
- Pas d'abstractions pour du code à usage unique.
- Pas de gestion d'erreurs pour des scénarios impossibles.

### 3. Changements chirurgicaux
- Ne touche que ce que tu dois toucher.
- Ne "améliore" pas le code adjacent, les commentaires ou le formatage.
- Chaque ligne modifiée doit tracer directement à la demande de l'utilisateur.

### 4. Exécution orientée objectif
- Transforme les tâches en critères vérifiables avant de coder.
- Pour les tâches multi-étapes, énonce un plan bref avec vérifications.

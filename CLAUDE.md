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
| `pages/demo.html` | **Démo partenaire** : **console de contrôle** (écran d'attente, Lancer/Pause/Rejouer, progression, saut à 8 chapitres) + player déterministe (scénario Garches/Jeanne · AGGIR interactif A/B/C · cartes GIR/PDF/promo/vidéo/itinéraire · **projecteur** à chaque capture) + mode **Live** (vrai `/api/chat` + `/api/extract`) |
| `pages/demo-he.html` | **Démo partenaire BILINGUE** (hébreu RTL ⇄ français LTR) — un sélecteur « שפה / Langue » bascule **tout** : scénario, acte 2, libellés, sens de lecture, voix. Mêmes 49 étapes, 8 chapitres, 11 champs et acte 2 en 27 temps dans les deux langues. **Sans mode Live** (le prompt d'Emma impose le français) |
| `pages/ss-rtl.css` | **Miroir RTL**, scopé `[dir="rtl"]`, chargé en dernier par `demo-he.html` — **n'affecte jamais** `demo.html` ni `index.html` |
| `pages/ss-theme.css` · `ss-landing.css` · `ss-chat.css` · `ss-funnel.css` | Design system Aurore : tokens/top-bar · landing · chat+dossier · funnel re-skin + cartes EHPAD |
| `pages/ss-demo.css` | **Couche « premium » de la démo** (scope `.ss-root[data-premium]`) : champ d'aurore animé, bordures dégradées, balayages lumineux, ✓ qui se dessine, halo d'Emma. Chargée en dernier dans `demo.html` — **n'affecte jamais `index.html`** |
| `pages/functions/api/chat.js` | Edge function streaming Anthropic (persona Emma `opus-5` + prompt v3 nourri du playbook + bloc `<preference_ton>` + contexte funnel + prompt caching) |
| `pages/functions/api/ehpads.js` | GET /api/ehpads?localite= — liste EHPAD par département (D1 → fallback **réel** `_partners.js`) |
| `pages/functions/api/_partners.js` | **Généré** (`node scripts/build-partners-fallback.mjs` depuis `data/ehpads.json`) : 350 résidences par département + map ville→dept — ne pas éditer à la main |
| `pages/functions/api/_geo.js` | `findDept(localite)` partagé ehpads/leads (CP → 2 chiffres → ville normalisée) |
| `pages/functions/api/tts.js` | POST /api/tts — voix studio d'Emma : **ElevenLabs prioritaire** (`eleven_multilingual_v2`, voix FR native via `ELEVENLABS_VOICE_ID`), secours OpenAI `gpt-4o-mini-tts` (`coral`), cache edge par hash moteur+voix+texte. Param optionnel **`lang`** (`fr` défaut · `he`) → jeu d'instructions OpenAI dédié ; `lang` absent = comportement FR strictement inchangé (**même clé de cache, cache préchauffé conservé**) |
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
| `POST /api/tts` | POST | Voix d'Emma (**ElevenLabs Shana** prioritaire, secours OpenAI ; mp3, cache edge) — body `{ text, voice_id?, voice?, lang? }` (`lang:"he"` → instructions hébreu, voix OpenAI) |
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

**Console de contrôle (28/07)** — **plus d'autoplay** : on atterrit sur un **écran d'attente** (« Démo prête » + résumé du scénario), on règle voix/vitesse, on lance. La console occupe la place de la barre de saisie (inutile en mode Démo) : bouton principal **Lancer / Pause / Reprendre / Relancer** (il porte toujours l'action suivante), **Rejouer**, progression `n / 49`, et **saut à 8 chapitres** (Accueil · Fugue nocturne · AGGIR→GIR · « Vous êtes qui ? » · Budget · Consentement · Création du dossier · Transmission EDI). Le saut rejoue muettement bulles, champs **et score** pour arriver dans un état cohérent.

**Mise en scène de la capture — le « projecteur »** : à chaque information captée, le panneau de droite s'éteint à **16 %** sauf le champ concerné (450 ms, fondu 200 ms, halo mint). Variante pendant la **validation EDI** : tout s'éteint sauf le bloc EDI **et le score d'urgence**, pour que « lead chaud » et validation partenaire se lisent d'un seul regard. C'est *la* démonstration de l'outil — l'œil part à droite sans commentaire. La respiration occupe un temps mort du chat, donc aucune phrase n'est coupée.

**2 modes (toggle dans la top-bar) :**
- **Démo scriptée (déterministe)** — *mode par défaut, démarrage manuel* : scénario figé (**texte intégral validé le 10/06**, accueil refondu le 28/07), streaming mot-à-mot, **vitesse 0,4×–2×** (**avec voix → mettre 1×**), layout **face-à-face plein écran** (hauteur auto-adaptative, chat et dossier défilent chacun en interne). **Zéro API pour le texte.** Durée : **118 s à 1× voix coupée**.
- **Voix d'Emma** : sélecteur top-bar « Coupée / **Emma (studio)** / Navigateur » (OFF par défaut — le choix vaut geste utilisateur pour l'audio). Studio = `/api/tts` (OpenAI, voix jeune et douce, mp3 caché à l'edge, préchargement de la réplique suivante, repli auto voix navigateur si clé absente) ; Navigateur = Web Speech API locale. Le scénario attend la fin de lecture ; Pause gèle la voix ; en Live la réponse est lue après le streaming.
- **Live** : Laurent tape, **vrai pipeline** `/api/chat` + `/api/extract` → le dossier se remplit pour de vrai, **y compris adresse + consentement + score d'urgence animé** (nécessite `ANTHROPIC_API_KEY` ; clé absente → message d'erreur explicite dans le chat).

**Scénario démo (fictif)** : Sylvie ↔ Emma pour sa mère **Jeanne, 82 ans** (Garches, fugue nocturne/Alzheimer non confirmé, refus, retraite modeste 1 600 € + épargne ~85 k€). Déroulé — **un sujet à la fois** : émotion → fugue nommée + **question violence/agitation** → unités adaptées (décision = **médecin coordinateur**) + réponse « mouroir » → **AGGIR interactif expliqué (A/B/C → GIR 2 indicatif)** → localisation amenée avec tact (« vous passez la voir régulièrement ? ») → objection « vous êtes qui ? » (présentation SmartSeniors : EHPAD adapté · aides financières · pédagogie · écoute, sans prétendre n'être lié à aucune résidence) → budget/aides → consentement → **création du lead** (nom, prénom, date de naissance, adresse, tél + e-mail du contact) → **final features** : carte GIR · PDF d'admission pré-rempli · **promo L'Empereur 110 €/j** · vidéo (youtu.be/DvSet0Rkjkk) · itinéraire vers L'Empereur (Garches) → score chaud + « lead envoyé à N résidences ».

**Consentement (règle métier)** : Emma demande toujours « souhaitez-vous que les résidences vous recontactent directement ? » — oui → tél famille ; **non → le lead part avec le n° du conseiller `07 57 99 11 40`** (la famille n'est pas appelée).

### Démo bilingue — `pages/demo-he.html` (`/demo-he`)

Copie **1:1** de la démo française pour une présentation en hébreu : **49 étapes**, **8 chapitres**, **11 champs**, même scénario (Sylvie ↔ Emma, Jeanne 82 ans, **Garches (92)**, AGGIR → **GIR 2**, **APA** + crédit d'impôt 25 %, L'Empereur), même console, même projecteur, même minutage. Parité vérifiée étape par étape (types, chapitres, clés de champs, valeurs). **Seule la langue change** — pas de transposition vers un dispositif israélien.

**Bilingue depuis le 06/08.** Un sélecteur **« שפה / Langue »** en tête de top-bar commande **toute la page** : scénario, acte 2, libellés d'interface, `dir` du document, et langue de diction. Le hébreu est le défaut. Changer de langue **réinitialise la démo** — on ne mélange pas deux langues à l'écran. Vérifié : en français la page est le miroir exact de `/demo` (chat à gauche x=130, dossier à droite x=809), zéro chaîne hébreu résiduelle, et réciproquement.
> Le **scénario français est dupliqué** depuis `demo.html`, pas partagé — `/demo` est la page du pitch, en production, et son intérêt est « zéro API, zéro surprise » ; on ne touche pas à son chargement avant un rendez-vous. Un test de parité vérifie qu'il reste **verbatim** identique à celui de `/demo`. L'extraction en module commun se fera quand l'acte 2 sera porté sur `/demo` — là elle servira les deux.

**Trois écarts assumés, et pourquoi :**
- **Pas de mode Live.** Le `BASE_SYSTEM_PROMPT` de `chat.js` impose le français : un Live sur la page hébreu répondrait en français devant l'audience. La demande portait sur le mode démo. Pour le rétablir un jour : prompt hébreu côté `chat.js` (le playbook v3 est français, ce n'est pas un simple `if`).
- **Voix = OpenAI, pas ElevenLabs.** `eleven_multilingual_v2` **ne couvre pas l'hébreu**. La page force donc une voix OpenAI (`voice:"coral"`, `lang:"he"`) → `tts.js` court-circuite ElevenLabs. Shana reste la voix française, intacte.
- **Police : Nunito + Rubik.** Nunito n'a **aucun glyphe hébreu** — sans repli explicite, chaque poste rendrait la démo dans sa police système (Arial Hebrew, Segoe UI…). Rubik est la plus proche (grotesque légèrement arrondie), nativement hébreu. L'ordre `'Nunito','Rubik'` garde le latin (SmartSeniors, GIR, €) en Nunito.

**Le miroir RTL vit dans `pages/ss-rtl.css`**, scopé `[dir="rtl"]` et chargé **après** `ss-demo.css` — il ne contient que des retournements de règles existantes, aucune décision de style nouvelle. Chat à **droite**, dossier à **gauche** (le projecteur envoie donc l'œil à gauche). Retournés : marges `auto`, pointes de bulles, liseré de champ, pastille avatar, flèche du select, lueurs du panneau, et les **dégradés qui portent une échelle** (froid→chaud, GIR 6→GIR 1) pour rester alignés sur leurs légendes.

**Acte 2 — le pitch en plein écran (06/08), bilingue.** Sélecteur **« שפת החלק השני »** dans la top-bar : עברית / **Français**. Le français est LTR, donc le runner pose `dir="ltr"` sur le fil de discussion — un **îlot LTR** dans une page RTL (avatar et pointes de bulles repassent à gauche ; `ss-rtl.css` annule les seuls miroirs concernés sous `[dir="rtl"] [dir="ltr"]`). La **voix suit la langue** : hébreu → OpenAI forcé, français → aucun paramètre de voix, donc **Shana (ElevenLabs)** comme sur `/demo`, avec la même clé de cache. Changer de langue devant la carte de fin **rejoue** l'acte 2 dans l'autre langue ; pendant la démo, le réglage attend son tour comme la voix et la vitesse. « Rejouer » rend la page à son état hébreu de bout en bout.
**Acte 2 — le pitch en plein écran (06/08).** À la fin du scénario, le bouton principal de la console cesse de proposer « rejouer » et propose **« לחלק השני »** : le dossier glisse hors champ (`grid-template-columns: 1fr 0fr`), le chat prend toute la carte, et Emma **retourne l'outil vers celui qui regarde** — elle vient de qualifier une famille, elle qualifie maintenant son interlocuteur. **27 temps** : 6 **questions-leviers** (grosses, liseré d'accent, seules à l'écran), 15 réponses, 5 punchlines pleine largeur, 1 carte de fin. Contenu tiré de `knowledge/pitch-seo.md`, allégé pour être dit à voix haute. Durée **43 s à 1× voix coupée**. Six mouvements : l'inversion → **la vraie douleur** (les matins à zéro demande, le pipe qui se vide, le concurrent qui double les enchères — jamais « vos pages ne convertissent pas », qui est un lieu commun) → le formulaire coupable → 🔥 **la génération qui arrive** (dix sites qu'on ne visite plus, nés avec l'iPhone, une seule fenêtre, l'IA générative qui engloutit tout, « une habitude ne se reprend pas ») → **ce qu'Emma est** (un lead ou dix mille, aucune différence ; comme un humain bien réveillé un mardi à onze heures ; 365/365 sans humeur ni fatigue) → **LeadsMagic**, le moteur calibrable sur n'importe quel métier, « plus du *know-how*, du *know-see* ». Chapitre **9 · החלק השני** dans le sélecteur → répétable sans rejouer la démo.
> ⚠️ **Jamais d'enchaînement automatique** — la fin du scénario est précisément le moment où l'autre va parler, le présentateur garde la main. C'est aussi le bouton **Pause** qui sert à laisser une question travailler.
> Le CSS vit dans **`ss-demo.css` § 8 bis** (couche partagée), conditionné à la classe `.pitch` → **inerte sur `/demo`** tant qu'on ne l'y branche pas. Écrit en **propriétés logiques** (`margin-inline`, `border-inline-start`) : aucune règle de miroir nécessaire dans `ss-rtl.css`.
> ⚠️ Deux pièges rencontrés, à connaître avant d'ajouter un bloc à l'acte 2 : (1) `.chat-scroll` est un **flex colonne** — tout enfant direct doit porter `flex: 0 0 auto`, sinon il est écrasé par `flex-shrink` et son `overflow:hidden` rogne le contenu (la carte de fin faisait 90 px au lieu de 243) ; (2) `.crow.bot .cbub` (0,5,0) **l'emporte** sur `.cbub.p-q` (0,4,0) — toute règle de bulle doit être scopée sous `.crow.bot`.

> ⚠️ **Piège bidi — le vrai risque de cette page.** Dans un paragraphe RTL, deux groupes de chiffres séparés par une espace sont rendus **dans l'ordre RTL** : `06 24 18 52 40` s'affiche `40 52 18 24 06`, `1 600 €` devient `600 1 €`, et le compteur `3 / 49` se lit `49 / 3`. Trois parades en place, à réutiliser pour tout nouveau texte : (1) `L()` pose des **isolats U+2066/U+2069** autour des téléphones, e-mails, codes et montants — invisibles, ils traversent `textContent`, `innerHTML` et l'échappement de `mdBold` ; (2) `bidiSegments()` enveloppe chaque segment `·` d'une valeur du dossier dans un `<bdi>` (échappement compris → sûr aussi pour des données d'API) ; (3) `direction: ltr` sur le compteur de la console. Le « × » de la vitesse est neutre lui aussi → isolats dans les `<option>`.

> Apprentissage : `knowledge/emma-playbook.md` (v3, vrais appels) nourrit le prompt ; régénéré via le notebook Colab Drive-persistant. Fiches brutes **non committées** (anonymisation Colab à durcir — lieux/hôpitaux résiduels).

## Stratégie & pitch — notes (06/2026)
- **Argumentaire Cap Retraite (Bernard)** : `knowledge/pitch-cap-retraite.md` — **réécrit le 29/07** sur l'axe LeadsMagic. Antisèche d'une page pour la visio : `knowledge/antiseche-rdv.md`. Pistes de canaux (note interne, pas un argumentaire) : `knowledge/acquisition.md`.
- **Argumentaire SEO (canal)** : `knowledge/pitch-seo.md` — Emma proposée à un référenceur qui alimente le pipe de ses clients. **Acheteur différent de Bernard** : un SEO est un *canal*, pas un client final ; on lui vend la moitié manquante de sa prestation. Axe central : **la moitié informationnelle de sa carte de mots-clés n'est pas monétisable en formulaire** — Emma la rend facturable sans un backlink de plus. `/demo` + `/demo-he` servent de **preuve de calibration** (même moteur, autre langue). ⚠️ Deux écarts avec le pitch Bernard : ne **jamais** laisser entendre un effet sur le positionnement, et **dire qu'il y a une marge revendeur** (un revendeur qui ne voit pas sa marge décroche — contrairement à un client final, qu'un prix annoncé ancre).
- **Pitch partenaire** : Google Meet, **démo scriptée UNIQUEMENT** (le mode Live existe mais n'est pas montré — pas encore au point). Partager **un onglet Chrome avec « Partager l'audio »**, voix **Emma (studio)**, vitesse **1×**, run à blanc avant (cache audio = par datacenter régional), bouton Pause pour commenter. Présenter depuis la **prod après merge** (URL propre).
- ⚠️ **L'alias de branche Cloudflare ment.** Après un push, `claude-<branche>.smartseniors.pages.dev` peut servir le déploiement **précédent** pendant plusieurs minutes — y compris avec un paramètre anti-cache, et alors que les autres fichiers du même build sont déjà à jour (`cache-control: max-age=0, must-revalidate` : ce n'est pas le navigateur, c'est l'alias qui pointe encore ailleurs). Pour vérifier une modif juste après un push, utiliser **l'URL épinglée au commit** donnée par le bot Cloudflare (`<hash>.smartseniors.pages.dev`) — elle est exacte. Et ouvrir l'URL de présentation **quelques minutes avant** le rendez-vous pour contrôler ce qui est réellement servi.
- **Partenaire cible** : organisme de placement (type Cap Retraite) — ils ont les contrats résidences qui paient **1 000-4 000 € par admission** sur lead. Règle métier : à réception, la résidence fait une **validation dédup** (« prospect déjà en base ? ») ; si oui, le lead est mort.

### 🎯 L'axe du pitch — « LeadsMagic » (arrêté le 28/07)

> **Ce qu'est LeadsMagic (précisé le 29/07)** — ni un renommage d'Emma, ni une offre faite à Cap Retraite : c'est **le procédé de création de leads par conversation**, éprouvé sur l'EHPAD avec Emma et **duplicable à d'autres secteurs**. Emma reste Emma côté famille. **LeadsMagic reste la propriété de smartseniors.fr.**
> ⚠️ Le volet multi-secteurs se révèle **délibérément** : il prouve qu'on a un moteur et pas un bricolage, mais il dit aussi à Bernard qu'il est un secteur parmi d'autres, dans un marché où il défend son pipe tous les mois. Et **ne jamais ouvrir soi-même le sujet de la propriété** — l'annoncer sans qu'il l'ait demandé se lit comme de la défiance au premier rendez-vous.

**On ne vend pas des leads, on révolutionne leur création.** Aujourd'hui c'est **la famille** qui fait le travail du conseiller : elle enchaîne les écrans d'un formulaire pour produire un dossier. Emma reprend cette charge — les mêmes informations arrivent par **une conversation naturelle**, à toute heure, et le coût du 10 000ᵉ dossier est celui du premier.

**Munitions vérifiées au crawl de `capretraite.fr/zest/comparateur/ehpad/` (28/07)** — leur propre parcours, extrait de la config du comparateur :
- **~16 à 18 écrans successifs** pour un seul senior (27 écrans dans le graphe complet), **27 champs** collectés, sous une promesse affichée de « moins de 2 minutes ».
- **Coordonnées demandées deux fois** (écran ~5 « Laissez-nous vos coordonnées », puis ~20 « Complétez vos coordonnées »).
- **L'écran le plus parlant** : « Quel est le niveau d'autonomie de Madame X ? → Autonome (GIR 5-6) / Semi dépendant (GIR 3-4) / Très dépendant (GIR 1-2) ». On demande à une fille épuisée de trancher elle-même une évaluation médico-sociale. Emma, elle, ne pose **jamais** cette question : elle fait passer la grille AGGIR (6 repères que la famille sait décrire) et **en déduit** le GIR. Mettre les deux écrans côte à côte suffit, il n'y a rien à expliquer.
- Téléphone **8h-20h du lundi au vendredi** → nuits et week-ends non couverts. **Aucun chat.**
- ⚠️ Ne jamais descendre leur formulaire devant Bernard : il l'a construit, il est probablement le meilleur du marché. L'angle est « même au top, il reste 16 écrans à franchir ».

**❌ Abandonné : le pré-check dédup par hash.** L'EDI des groupes **exige nom + prénom + date de naissance en clair** pour rapprocher un prospect de leur base — rien ne peut être dissimulé, et hacher côté partenaire supposerait qu'ils modifient leur système avant même de travailler ensemble. Mais la contrainte est un argument, pas un problème : elle **tue le modèle « vente de leads »** (on facturerait mécaniquement des doublons) et pousse vers l'**intégration** — si Emma tourne sur *leur* trafic, le doublon n'existe plus.

**❌ Aucune offre chiffrée à poser.** Le modèle de collaboration n'est pas arrêté et c'est **volontaire** : on n'a besoin de rien de Bernard, celui qui annonce un prix en premier se fait ancrer, et un bon opérateur fera le calcul lui-même après la démo. Phrase de fin : « Regarde. Dis-moi ce que tu en ferais, toi. » *(Les modèles A/CPL et B/SaaS restent des hypothèses de travail internes, pas un argumentaire.)*
**Ce qu'on sait de Cap Retraite (29/07)** : **~1 M€/mois**, premier du secteur, accords avec tous les groupes. Ses **deux plus grosses charges : le SEO et les salaires de ~50 conseillers de plateau**. Marché **très disputé** — 6-7 acteurs sérieux dont un n°2 au même niveau de CA, tous à l'affût de leads : **le pipe est fragile**, ce n'est pas un acquis. Il **route** ses leads par qualité / urgence / finances / département vers des cellules dédiées. Et il a sur ses serveurs **des milliers voire des dizaines de milliers d'heures d'écoute** conseiller ↔ famille, dormantes.

**L'argument central du pitch — il paie deux fois.** Un lead très qualifié coûte ~**150 €**, et il faut **encore un conseiller derrière** pour le traiter : deux lignes de charges. Emma fait les deux en un seul geste. Donc **l'unité de comparaison n'est jamais le CPL, c'est le coût par dossier prêt à transmettre** — c'est ce recadrage qui sort de la guerre des prix (sept concurrents) et qui frappe ses deux plus grosses charges avec un seul poste. Corollaire : **ne pas annoncer de prix** n'est plus seulement une question d'ancrage, c'est ce qui **force le bon dénominateur** — un chiffre annoncé serait comparé à son coût de lead seul.

**L'argument le plus fort, et il ne marche qu'avec lui : ses heures d'écoute.** Le playbook v3 vient d'une poignée d'appels ; sur les siennes, Emma cesse d'être un produit générique pour devenir *sa* méthode industrialisée. Ça le rend **co-propriétaire de la valeur plutôt que client**, et ça crée un fossé qu'aucun budget concurrent ne franchit (« un concurrent peut acheter le même modèle, pas tes heures »). ⚠️ Apporter soi-même la question de la **base légale** des enregistrements — même réflexe que l'abandon du hash.

⚠️ **Ne jamais pitcher** : Emma multilingue (le prompt impose le français, `chat.js`) · conversations auditables (`schema.sql` ne stocke que le lead) · « Emma ne se trompe jamais » (l'argument vrai est la complétude **structurelle des champs**, et seulement si la famille va au bout) · « elle remplace tes conseillères » · les **PDF / itinéraires / vidéos** comme livrés (**simulés** dans la démo).
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

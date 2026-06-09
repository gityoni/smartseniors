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
- **LLM** : chat Emma `claude-opus-4-8` (streaming SSE) · extraction lead `claude-haiku-4-5` (tool use)
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
| `pages/functions/api/chat.js` | Edge function streaming Anthropic (persona Emma `opus-4-8` + prompt v3 nourri du playbook + contexte funnel + prompt caching) |
| `pages/functions/api/ehpads.js` | GET /api/ehpads?localite= — liste EHPAD par département (D1 → fallback mock) |
| `pages/functions/api/leads.js` | POST /api/leads — sauvegarde D1 + scoring urgence + email aux EHPAD partenaires |
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
3. **Funnel (13 étapes)** : type de résidence, lien avec le senior, délai, ville + rayon, prénom/nom du proche, date de naissance, genre, niveau d'autonomie (GIR), situation actuelle, ville actuelle du proche, budget, puis contact famille (nom, téléphone, email).
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
| `POST /api/admin/import-ehpads` | POST | Import administrateur des EHPAD partenaires |

### Scoring d'urgence
Calculé côté frontend à la complétion du funnel, stocké sur le lead :
- Délai `urgent` / `1_mois` → +4 ; `1_3_mois` → +2
- Situation `hopital` → forte pondération ; autonomie `tres_dependant` / `semi_dependant` → +1
- **Statut** : score ≥ 7 → `chaud`, ≥ 4 → `tiède`, sinon `froid`. Le score (0–10) est affiché en étoiles dans l'email partenaire.

### Détection département
`extractDept()` dans `leads.js` / `extractDepartement()` dans `ehpads.js` :
1. Code postal 5 chiffres → prend les 2 premiers
2. Débute par 2 chiffres → département direct
3. Map ville → département (Paris→75, Lyon→69, Marseille→13, etc.)

### Données EHPAD
- Source de vérité : `data/ehpads.json` (seedée en D1 via `scripts/seed.mjs`).
- `ehpads.js` requête D1 en priorité, **fallback mock** intégré si D1 indisponible.
- `DEFAULT_EHPADS` retourné si département inconnu.

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
- **Démo scriptée (déterministe)** — *mode par défaut, autoplay* : scénario figé rejoué (réponses Emma **pré-écrites**, streaming mot-à-mot, **curseur vitesse 0,5×–2×**, bouton Rejouer). **Zéro API, zéro surprise** pour le pitch. Durée ~2-3 min à 1×.
- **Live** : Laurent tape, **vrai pipeline** `/api/chat` + `/api/extract` → le dossier se remplit pour de vrai (nécessite `ANTHROPIC_API_KEY`).

**Scénario démo (fictif)** : Sylvie ↔ Emma pour sa mère **Jeanne, 82 ans** (Garches, déambulation/Alzheimer non confirmé, refus, budget serré). Déroulé : émotion → objections (refus, maltraitance→grille de visite, « vous êtes qui ? ») → **AGGIR interactif (6 items A/B/C → GIR 2 indicatif)** → consentement → **création du lead** (nom, prénom, date de naissance, adresse, tél + e-mail du contact) → **final features** : carte GIR · PDF d'admission pré-rempli · **promo L'Empereur 110 €/j** · vidéo (youtu.be/DvSet0Rkjkk) · itinéraire vers L'Empereur (Garches) → score chaud + « lead envoyé à N résidences ».

**Consentement (règle métier)** : Emma demande toujours « souhaitez-vous que les résidences vous recontactent directement ? » — oui → tél famille ; **non → le lead part avec le n° du conseiller `07 57 99 11 40`** (la famille n'est pas appelée).

> Apprentissage : `knowledge/emma-playbook.md` (v3, vrais appels) nourrit le prompt ; régénéré via le notebook Colab Drive-persistant. Fiches brutes **non committées** (anonymisation Colab à durcir — lieux/hôpitaux résiduels).

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

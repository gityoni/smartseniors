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
- **Règles** : Jamais de conseil médical direct, toujours orienter vers un professionnel pour les questions de santé. **Jamais de promesse de disponibilité / lit réservé** (SmartSeniors transmet le lead aux résidences, ce sont elles qui confirment). Jamais citer d'établissement réel par son nom.
- **Source du prompt** : le `BASE_SYSTEM_PROMPT` de `chat.js` est nourri par `knowledge/emma-playbook.md` (synthèse de vrais appels conseiller ↔ famille, via `notebooks/emma_transcription_biblio.ipynb`).
- **Vocabulaire imposé** : « votre maman / votre papa » (jamais « votre proche »), « solution d'accompagnement » (jamais « placement »), « établissement / résidence » (jamais « maison de retraite »). Une seule question à la fois, toujours valider l'émotion avant de questionner.
- **Process de qualification (ordre strict)** : 1) contexte émotionnel → 2) profil du senior → 3) autonomie/GIR → 4) localisation → 5) budget → 6) délai/urgence → 7) critères spéciaux. Le prompt complet vit dans `pages/functions/api/chat.js`.

## Stack technique
- **Frontend** : HTML / JS vanilla (`pages/index.html`), PWA (manifest + service worker)
- **API** : Cloudflare Pages Functions (`pages/functions/api/`)
- **LLM** : Anthropic Claude (`claude-opus-4-6`) — streaming SSE
- **Base de données** : Cloudflare D1 (SQLite edge) — binding `DB` (id `3c1a84ef-2d23-42d4-853a-748f0cc16847`)
- **Email** : MailChannels (envoi des leads aux résidences partenaires)
- **Hébergement** : Cloudflare Pages (auto-deploy sur push `main`)
- **Config** : `wrangler.toml` (nom, D1 binding, pages output dir)
- **Repo** : `gityoni/smartseniors`

## Fichiers clés
| Fichier | Rôle |
|---|---|
| `pages/index.html` | Interface lead gen : chat Emma + funnel de qualification (13 étapes) + résultats EHPAD + PWA |
| `pages/functions/api/chat.js` | Edge function streaming Anthropic (persona Emma + contexte funnel dynamique) |
| `pages/functions/api/ehpads.js` | GET /api/ehpads?localite= — liste EHPAD par département (D1 → fallback mock) |
| `pages/functions/api/leads.js` | POST /api/leads — sauvegarde D1 + scoring urgence + email aux EHPAD partenaires |
| `pages/functions/api/admin/import-ehpads.js` | Endpoint admin d'import EHPAD (depuis GSheet/JSON) |
| `pages/confidentialite.html` | Page RGPD / mentions |
| `pages/manifest.json`, `pages/sw.js`, `pages/icon-*.png` | PWA (installable, offline shell) |
| `data/ehpads.json` + `data/ehpads.schema.json` | Source de vérité des EHPAD partenaires (seedés en D1) |
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

## Démo partenaire — chantier en cours (présentation prospect)
Objectif : démontrer à une société partenaire « seniors » un **workflow fluide** : une famille discute avec Emma → le **lead se crée en temps réel** côté back-office → il part vers les résidences partenaires.

**Approche retenue :**
- **Extraction conversationnelle** : Emma mène toute la découverte en chat libre (santé / lieu / pathologie / cadre familial / finances). Une couche d'extraction (tool-use Claude) parse chaque échange en champs structurés ; un **panneau back-office « lead en direct »** se remplit au fil de la conversation (identité → autonomie → budget → délai → score d'urgence) jusqu'à « **lead envoyé à X résidences partenaires** » + aperçu de l'email.
- **Mode scripté rejouable** : un bouton « Démo » rejoue le scénario réel **Alex (conseiller) ↔ famille** à un rythme maîtrisé, via la vraie API, sur un script connu (zéro surprise en live).

**Source du scénario** : transcript (speech-to-text) d'un appel réel de 25 min, conseiller Alex ↔ famille (phase découverte).
Les 2 étapes métier à mettre en scène :
1. **Valider les infos & créer le lead** : nom, prénom, date de naissance, CP + ville.
2. **Valider les solutions** selon les réponses : délai / villes + rayon / budget.

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

### Palette identitaire
| Rôle | Couleur |
|---|---|
| Fond général | `#EDE5D8` (beige chaud) |
| Header / form-side | `#3D2B1F` (brun foncé) |
| Bulles user | `#7D6B5E` (brun doux) |
| Accent principal | `#D4824A` (cuivré) |
| Accent doux | `#EAA070` (abricot) |

### Dégradé cuivré
```css
linear-gradient(135deg, #D4824A 0%, #EAA070 100%)
```

### Joy palette (chips, dots)
```css
--joy1:#FF6B6B --joy2:#4ECDC4 --joy3:#FFD93D --joy4:#A855F7 --joy5:#3B82F6 --joy6:#F97316
```

### Typographie
- **Font** : `Nunito` (Google Fonts) — ronde, lisible, accessible seniors
- Taille corps : minimum `1rem` (accessibilité)

### Layout principal
- `#main-section` : grille 2 colonnes `55fr 45fr`
- Colonne gauche (`.chat-side`) : interface chat Emma
- Colonne droite (`.form-side`) : fond `#3D2B1F`, funnel de qualification (`.step-pane`, `.step-progress`)
- Mobile `≤ 900px` : colonne unique, funnel en haut

### UI chat
- Bulles assistant : fond blanc, avatar SVG cuivré à gauche
- Bulles user : fond `#7D6B5E`, texte blanc
- Animations `slideUp` sur apparition des bulles
- Curseur clignotant pendant le streaming
- Chips de démarrage cliquables + CTA « Lancer ma recherche »
- `marked.js` (CDN) pour rendu markdown
- Cartes EHPAD résultats : `.ehpad-result-card` dans le chat
- Bouton CSV `.csv-btn` sous les cartes

## Règles importantes
- Ne jamais committer `ANTHROPIC_API_KEY` ou tout autre secret
- Langage simple, phrases courtes dans le prompt système Emma
- Toujours orienter vers un professionnel pour les questions médicales
- Accessibilité : `aria-live`, `aria-label`, `role`, focus management
- Source de vérité EHPAD = `data/ehpads.json` (puis seed D1), pas d'édition directe en base

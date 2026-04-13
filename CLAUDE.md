# SmartSeniors — Mémoire projet (Claude Code)

## Identité du projet
SmartSeniors est une plateforme de génération de leads pour la recherche d'EHPAD (établissements d'hébergement pour personnes âgées dépendantes).
Emma, conseillère IA, accompagne les familles dans leur recherche avec empathie et professionnalisme.
Répond en français, dans un langage simple, rassurant et structuré.

## Persona IA — Emma
- **Nom** : Emma
- **Rôle** : Conseillère senior SmartSeniors, spécialisée EHPAD
- **Ton** : Empathique, bienveillant, professionnel
- **Mission** : Accueillir les familles, comprendre leurs besoins, les orienter vers les bons EHPAD
- **Vocabulaire strict** : "votre maman/papa" (jamais "votre proche"), "résidence/établissement" (jamais "maison de retraite"), "solution d'accompagnement" (jamais "placement")
- **Règle d'or** : une seule question par message, valider l'émotion avant de poser la question
- **Règles** : Jamais de conseil médical direct, toujours orienter vers un professionnel pour les questions de santé

## Stack technique
- **Frontend** : HTML / JS vanilla (`pages/index.html`)
- **API** : Cloudflare Pages Functions (`pages/functions/api/`)
- **LLM** : Anthropic Claude (`claude-opus-4-6`) — streaming SSE
- **Base de données** : Cloudflare D1 (SQLite edge) — binding `DB`
- **Hébergement** : Cloudflare Pages (auto-deploy sur push `main`)
- **Config** : `wrangler.toml` (nom, D1 binding, pages output dir)
- **Repo** : gityoni/smartseniors

## Fichiers clés
| Fichier | Rôle |
|---|---|
| `pages/index.html` | Interface lead gen : chat Emma (entrée principale) + formulaire qualification (panneau latéral) |
| `pages/functions/api/chat.js` | Edge function streaming Anthropic (persona Emma + contexte funnel dynamique) |
| `pages/functions/api/ehpads.js` | GET /api/ehpads?localite= — liste EHPAD par département |
| `pages/functions/api/leads.js` | POST /api/leads — sauvegarde lead en D1 |
| `schema.sql` | Schéma D1 : tables `leads` et `ehpads` |
| `wrangler.toml` | Config Cloudflare Pages / D1 |
| `CLAUDE.md` | Mémoire projet (ce fichier) |
| `TASKS.md` | Suivi des tâches |

## Architecture lead gen

### Flux utilisateur
1. L'utilisateur arrive sur `pages/index.html`
2. Emma accueille — c'est le seul point d'entrée (formulaire masqué par défaut)
3. Le bouton "Lancer ma recherche personnalisée" ou les chips déclenchent l'ouverture du funnel
4. Formulaire 14 étapes : type résidence → lien → délai → contact → ville → nb personnes → genre → prénom → situation → âge → GIR → ville proche → famille → confirmation
5. Soumission → `POST /api/leads` (sauvegarde D1) + `GET /api/ehpads?localite=` (liste)
6. Les résultats EHPAD s'affichent dans le chat sous forme de cartes
7. Bouton CSV pour télécharger la liste
8. À chaque message, le contexte funnel (`getFunnelContext()`) est passé à `/api/chat` pour personnaliser Emma

### Endpoints API
| Endpoint | Méthode | Description |
|---|---|---|
| `POST /api/chat` | POST | Chat streaming SSE avec Emma (Anthropic) |
| `GET /api/ehpads?localite=` | GET | Liste EHPAD par localité (département extrait) |
| `POST /api/leads` | POST | Sauvegarde lead (prenom, nom, date_naissance, localite) |

### Contexte funnel dynamique
`getFunnelContext()` dans `index.html` retourne un snapshot de l'objet `F` (champs non vides uniquement).
Ce snapshot est passé dans chaque requête `POST /api/chat` sous la clé `funnel`.
`buildContextSection(funnel)` dans `chat.js` injecte ces données dans le system prompt d'Emma.
Emma ne re-demande jamais une information déjà présente dans le contexte.

### Détection département
`extractDepartement()` dans `ehpads.js` :
1. Code postal 5 chiffres → prend les 2 premiers
2. Débute par 2 chiffres → département direct
3. Map ville → département (Paris→75, Lyon→69, etc.)

### Données EHPAD
- Mock data intégrée dans `ehpads.js` pour 8 départements (75, 69, 13, 33, 06, 31, 59, 67)
- Si `env.DB` disponible, requête D1 en priorité, fallback mock
- `DEFAULT_EHPADS` retourné si département inconnu

## Base de données D1

### Tables
```sql
leads  (id, prenom, nom, date_naissance, localite, departement, created_at)
ehpads (id, nom, adresse, ville, code_postal, departement, telephone, email, places_disponibles, tarif_jour, created_at)
```

### Setup D1
1. `wrangler d1 create smartseniors-db`
2. Remplacer `REPLACE_WITH_YOUR_D1_DATABASE_ID` dans `wrangler.toml`
3. `wrangler d1 execute smartseniors-db --file=schema.sql`

## Workflow de déploiement
```
modifier fichiers
→ git add . && git commit -m "description" && git push origin main
→ Cloudflare Pages auto-deploy déclenché
→ prod live
```

## Variables d'environnement (Cloudflare Pages)
| Variable | Usage |
|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (secret, jamais committée) |
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
- `.main-layout` : flex row — chat-side (flex 1) + form-side (flex 0 0 44%, masqué par défaut)
- `.form-side` s'affiche via `.funnel-open` (animation `panelSlideIn`)
- `openFunnel()` ajoute la classe et scroll vers le panneau
- Mobile `≤ 900px` : colonne unique, formulaire en haut

### UI chat — welcome
- Emma card (avatar SVG + dot vert + nom + rôle)
- Message d'accueil : "votre maman ou votre papa"
- CTA principal : `#launch-funnel-btn` → déclenche `openFunnel()`
- 3 chips scénarios émotionnels : hospitalisé / refuse / financement
- Hero : "La bonne résidence pour votre maman, votre papa"

### UI chat — conversation
- Bulles assistant : fond blanc, avatar SVG cuivré à gauche
- Bulles user : fond `#7D6B5E`, texte blanc
- Animations `slideUp` sur apparition des bulles
- Curseur clignotant pendant le streaming
- `marked.js` (CDN) pour rendu markdown
- Cartes EHPAD résultats : `.ehpad-result-card` dans le chat
- Bouton CSV `.csv-btn` sous les cartes

## Prompt Emma — points clés
- **Vocabulaire interdit** : "votre proche", "résident", "patient", "placement", "maison de retraite"
- **Processus de qualification** (7 étapes strictes) : contexte émotionnel → profil senior → autonomie → localisation → budget → délai/urgence → critères spéciaux
- **Gestion objections** : "trop cher" (APA + ASH), "refuse d'y aller" (visite sans engagement), "trop compliqué" (guidage pas à pas), "juste des infos" (répondre puis recadrer)
- **APA** : jusqu'à 1 700 €/mois selon GIR et ressources
- **Déduction fiscale** : 25 % des frais d'hébergement

## Règles importantes
- Ne jamais committer `ANTHROPIC_API_KEY` ou tout autre secret
- Remplacer `REPLACE_WITH_YOUR_D1_DATABASE_ID` dans `wrangler.toml` avant prod
- Langage simple, phrases courtes dans le prompt système Emma
- Toujours orienter vers un professionnel pour les questions médicales
- Accessibilité : `aria-live`, `aria-label`, `role`, focus management

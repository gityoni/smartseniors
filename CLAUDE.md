# SmartSeniors — Mémoire projet (Claude Code)

## Identité du projet
SmartSeniors est un assistant numérique bienveillant dédié aux personnes âgées et à leurs aidants.
Répond en français, dans un langage simple, rassurant et structuré.

## Stack technique
- **Frontend** : HTML / JS vanilla (`pages/index.html`)
- **API** : Cloudflare Pages Function (`pages/functions/api/chat.js`)
- **LLM** : Anthropic Claude (`claude-opus-4-6`) — streaming SSE
- **Hébergement** : Cloudflare Pages (auto-deploy sur push `main`)
- **Repo** : gityoni/rebsam.github.io

## Fichiers clés
| Fichier | Rôle |
|---|---|
| `pages/index.html` | Interface chat principale |
| `pages/functions/api/chat.js` | Edge function streaming Anthropic |
| `CLAUDE.md` | Mémoire projet (ce fichier) |
| `TASKS.md` | Suivi des tâches |

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

## Design system

### Palette identitaire
| Rôle | Couleur |
|---|---|
| Fond général | `#EDE5D8` (beige chaud) |
| Header / bulles user | `#7D6B5E` (brun doux) |
| Accent principal | `#D4824A` (cuivré) |
| Accent doux | `#EAA070` (abricot) |
| Titre "Seniors" | `#EAA070` |

### Dégradé cuivré (bouton Envoyer, avatar)
```
linear-gradient(135deg, #D4824A 0%, #EAA070 100%)
```

### Typographie
- **Font** : `Nunito` (Google Fonts) — ronde, lisible, accessible seniors
- Taille corps : `1rem` minimum (accessibilité)

### UI
- Bulles assistant : fond blanc, avatar SVG chip à gauche
- Bulles user : fond `#7D6B5E`, texte blanc
- Animations `slideUp` sur apparition des bulles
- Curseur clignotant pendant le streaming
- 4 suggestions cliquables au démarrage (disparaissent au premier message)
- `marked.js` (CDN) pour rendu markdown dans les bulles

### Titres chat
- `<span class="smart">Smart</span>` → blanc
- `<span class="senior">Seniors</span>` → `#EAA070`

## API — Streaming SSE
- **Endpoint** : `POST /api/chat`
- **Body** : `{ message: string, history: [{role, content}][] }`
- **Réponse** : `text/event-stream` (pipe direct depuis Anthropic)
- **Validation** : message requis (string non vide), history tableau optionnel
- **Historique** : 12 derniers échanges transmis à Anthropic
- Pas de token secret côté client (edge function protège la clé)

## Règles importantes
- Ne jamais committer `ANTHROPIC_API_KEY` ou tout autre secret
- Langage simple, phrases courtes dans le prompt système
- Toujours rappeler de consulter un professionnel pour les questions de santé/sécurité
- Accessibilité : `aria-live`, `aria-label`, focus management

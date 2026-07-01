# SmartSeniors

> Plateforme de **génération de leads qualifiés** pour la recherche d'EHPAD — propulsée par **Emma**, conseillère IA.

SmartSeniors accompagne les familles qui cherchent un établissement (EHPAD / maison médicalisée) pour un parent âgé. **Emma**, conseillère IA empathique et experte du médico-social français, mène la découverte en conversation naturelle et **qualifie le besoin au fil de l'échange**. Chaque dossier complet devient un **lead exclusif transmis en temps réel aux résidences partenaires** du secteur.

---

## ✨ Concept

```
Famille  ──►  Emma (chat IA)  ──►  Lead qualifié  ──►  Résidences partenaires
            découverte + qualif      (D1 + scoring)        (email temps réel)
```

- **Emma** : conseillère IA (Anthropic Claude), ton empathique, vocabulaire et garde-fous métier stricts, qualification structurée. Son prompt est nourri par de **vrais appels conseiller ↔ famille** (voir [`knowledge/`](knowledge/)).
- **Lead gen** : les informations captées constituent un lead riche (identité, autonomie/GIR, budget, délai…), **scoré en urgence** (chaud / tiède / froid) et transmis aux résidences du bon département.
- **Démo partenaire** : une page dédiée montre, en split-screen, la conversation famille ↔ Emma **et** le lead qui se construit en direct côté back-office.

---

## 🎬 Démo partenaire — `/demo`

Page de présentation (split-screen) pensée pour montrer la valeur à un partenaire :

- **Gauche** : la famille discute avec Emma (vraie API, streaming).
- **Droite** : le **lead se remplit en temps réel** (identité → autonomie → budget → délai → score d'urgence), jusqu'à **« Lead envoyé à N résidences partenaires »** + **aperçu de l'email** reçu par la résidence.
- **▶ Rejouer la démo** : rejoue un scénario famille **fictif** sur la vraie API (rythme maîtrisé, zéro surprise en live).

> La démo est une **simulation sûre** : elle n'écrit rien en base et n'envoie aucun email réel aux partenaires (elle affiche l'aperçu).

---

## 🧱 Stack

| Domaine | Techno |
|---|---|
| Frontend | HTML / JS vanilla, PWA (manifest + service worker) |
| API | Cloudflare Pages Functions (`pages/functions/api/`) |
| LLM | Anthropic Claude — chat `claude-opus-4-6` (streaming SSE), extraction `claude-haiku-4-5` |
| Base de données | Cloudflare D1 (SQLite edge), binding `DB` |
| Email | MailChannels (envoi des leads aux résidences) |
| Hébergement | Cloudflare Pages (auto-deploy sur push `main`) |

---

## 🗺️ Architecture

### Endpoints API

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/chat` | POST | Chat streaming SSE avec Emma — body `{ message, history, funnel }` |
| `/api/extract` | POST | Extraction conversationnelle → champs du lead (tool use) — body `{ history }` |
| `/api/ehpads?localite=` | GET | Liste des EHPAD par localité (département extrait), D1 → fallback mock |
| `/api/leads` | POST | Sauvegarde du lead en D1 + scoring d'urgence + email MailChannels aux résidences |
| `/api/admin/import-ehpads` | POST | Import administrateur des EHPAD partenaires |

### Pages

| Route | Fichier | Rôle |
|---|---|---|
| `/` | `pages/index.html` | Interface lead gen : chat Emma + funnel de qualification (13 étapes) + résultats EHPAD + PWA |
| `/demo` | `pages/demo.html` | Démo partenaire split-screen (lead en direct) — `noindex` |
| `/confidentialite` | `pages/confidentialite.html` | Mentions RGPD |

### Scoring d'urgence
Calculé à la complétion : délai `urgent`/`1_mois` → +4 ; `1_3_mois` → +2 ; situation `hôpital` → forte pondération ; autonomie dépendante → +1. **Statut** : score ≥ 7 → chaud, ≥ 4 → tiède, sinon froid.

---

## 📁 Structure du projet

```
pages/
  index.html                      # interface principale (chat + funnel)
  demo.html                       # démo partenaire (lead en direct)
  confidentialite.html            # RGPD
  manifest.json · sw.js · icon-*  # PWA
  functions/api/
    chat.js                       # Emma (streaming Anthropic)
    extract.js                    # extraction conversationnelle → lead
    ehpads.js                     # liste EHPAD par département
    leads.js                      # sauvegarde + scoring + email partenaires
    admin/import-ehpads.js        # import admin
data/
  ehpads.json · ehpads.schema.json # source de vérité des EHPAD partenaires
scripts/
  seed.mjs · import-ehpads.mjs · gsheet-to-api.gs
knowledge/                        # biblio : vrais appels → fiches → playbook Emma
notebooks/
  emma_transcription_biblio.ipynb # transcription + extraction de fiches (Colab)
schema.sql                        # schéma D1 (leads, ehpads)
wrangler.toml                     # config Cloudflare Pages / D1
CLAUDE.md · TASKS.md              # mémoire projet · suivi des tâches
```

---

## 🚀 Démarrage rapide

**Prérequis** : Node ≥ 18, un compte Cloudflare, une clé API Anthropic.

```bash
# 1. Dépendances
npm install

# 2. Clé API en local (Cloudflare Pages dev lit .dev.vars)
echo 'ANTHROPIC_API_KEY = "sk-ant-..."' > .dev.vars

# 3. Schéma D1 (local)
npm run db:schema

# 4. Seed des EHPAD partenaires (local)
npm run seed            # (ou seed:dry pour un essai à blanc)

# 5. Lancer en local
npm run dev             # → wrangler pages dev pages
```

### Scripts npm

| Script | Action |
|---|---|
| `npm run dev` | Serveur local (`wrangler pages dev`) |
| `npm run deploy` | Déploiement manuel (`wrangler pages deploy`) |
| `npm run db:schema` / `db:schema:remote` | Applique `schema.sql` (local / prod) |
| `npm run seed` / `seed:remote` | Charge `data/ehpads.json` en D1 (local / prod) |
| `npm run seed:reset` | Réinitialise puis seed (prod) |
| `npm run import:csv` | Import EHPAD depuis CSV |

---

## ☁️ Déploiement

Le projet est hébergé sur **Cloudflare Pages**, avec **auto-deploy sur push `main`**.

```
branche de dev  →  Pull Request  →  merge vers main  →  déploiement Cloudflare auto
```

> Chaque branche obtient aussi un **preview deployment** Cloudflare (URL dans la PR).
> ⚠️ Pour que l'IA fonctionne en preview, définir `ANTHROPIC_API_KEY` aussi dans l'environnement **Preview** (Cloudflare Pages → Settings → Environment variables).

**Setup prod (une fois)** :
```bash
npm run db:schema:remote   # crée les tables en prod
npm run seed:remote        # seed les EHPAD partenaires
```
Puis lier le binding D1 `DB` et la variable `ANTHROPIC_API_KEY` dans le dashboard Cloudflare Pages.

---

## 🧠 Biblio Emma (apprentissage)

Emma ne fait pas de fine-tuning : elle progresse via un **corpus de vrais appels** qui nourrit son prompt.

```
Appels (.m4a) ─► transcription (Whisper) ─► fiches structurées (Claude) ─► playbook ─► prompt Emma (chat.js)
```

Tout l'outillage est dans [`notebooks/emma_transcription_biblio.ipynb`](notebooks/emma_transcription_biblio.ipynb) (Colab) et documenté dans [`knowledge/README.md`](knowledge/README.md).

---

## 🔐 Variables d'environnement

| Variable | Usage |
|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (secret — jamais committée) |
| `BACKOFFICE_EMAIL` | Destinataire de la notification interne de lead (défaut `leads@smartseniors.fr`) |
| `DB` | Binding D1 (configuré dans `wrangler.toml`) |

---

## ⚖️ Règles importantes

- **RGPD** : aucun transcript brut nominatif n'est committé (cf. `.gitignore`). Les fiches/transcripts versionnés sont anonymisés.
- **Emma ne promet jamais** une disponibilité ou un lit réservé : SmartSeniors transmet le lead, ce sont les résidences qui confirment.
- **Jamais de conseil médical direct**, jamais citer un établissement réel par son nom.
- Source de vérité EHPAD = `data/ehpads.json` (puis seed D1), pas d'édition directe en base.
- Ne jamais committer `ANTHROPIC_API_KEY` ni aucun secret.

---

## 📚 Documentation

- [`CLAUDE.md`](CLAUDE.md) — mémoire projet complète (persona Emma, architecture, design system)
- [`TASKS.md`](TASKS.md) — suivi des tâches
- [`knowledge/README.md`](knowledge/README.md) — méthodologie de la biblio Emma
- [`scripts/README.md`](scripts/README.md) — seed & import des EHPAD

---

_Projet privé SmartSeniors._

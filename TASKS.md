# SmartSeniors — Suivi des tâches

## ✅ Fait

- `pages/index.html` — interface lead gen 2 colonnes (Emma chat + formulaire qualification)
- `pages/functions/api/chat.js` — streaming Anthropic SSE, persona Emma EHPAD
- `pages/functions/api/ehpads.js` — GET /api/ehpads?localite= (mock data 8 depts + fallback D1)
- `pages/functions/api/leads.js` — POST /api/leads (sauvegarde D1)
- `schema.sql` — tables `leads` et `ehpads` Cloudflare D1
- `wrangler.toml` — config Cloudflare Pages + binding D1 (`3c1a84ef-2d23-42d4-853a-748f0cc16847`)
- `CLAUDE.md` — mémoire projet complète (Emma, lead gen, D1, design system)
- D1 database créée : `smartseniors-db`
- Déploiement Cloudflare Pages — prod live ✅

## 🔴 À faire

- Appliquer le schema D1 : `npx wrangler d1 execute smartseniors-db --file=schema.sql --remote`
- Configurer `ANTHROPIC_API_KEY` dans Cloudflare Pages (Settings → Environment variables)
- Lier le binding D1 `DB` dans le dashboard Cloudflare Pages (Settings → Functions → D1 bindings)
- Alimenter la table `ehpads` avec de vraies données EHPAD
- Tester le flux complet : formulaire → POST /api/leads → GET /api/ehpads → cartes + CSV
- Ajouter un domaine custom (ex. `smartseniors.fr`)
- Implémenter l'envoi d'email aux EHPAD (dans `leads.js`) via Mailchannels

# SmartSeniors — Suivi des tâches

## ✅ Fait

- Création `pages/functions/api/chat.js` — streaming Anthropic SSE
- Création `pages/index.html` — UI "wow effect" (Nunito, palette beige/cuivré, streaming token par token)
- CLAUDE.md — mémoire projet complète (stack, design system, règles)
- TASKS.md — ce fichier de suivi
- PWA : `manifest.json`, service worker (`sw.js`), icônes 192/512px, meta tags
- Accessibilité : skip link, `:focus-visible`, ARIA `role="banner"`, outline styles
- Analytics : snippet Cloudflare Web Analytics prêt (à activer avec le token)
- Page de confidentialité RGPD (`confidentialite.html`) + lien footer

## 🔄 En cours

- (rien en cours)

## 🔴 À faire

- Configurer la variable `ANTHROPIC_API_KEY` dans Cloudflare Pages (Settings → Environment variables)
- Connecter le repo à Cloudflare Pages si pas encore fait (publier `pages/` comme dossier racine)
- Tester le streaming de bout en bout en prod
- Personnaliser le prompt système (`SYSTEM_PROMPT` dans `chat.js`) selon le positionnement final
- Ajouter un domaine custom (ex. `smartseniors.fr`)
- Activer Cloudflare Web Analytics (remplacer `YOUR_TOKEN` dans index.html)
- Remplacer les icônes PWA par de vrais assets design
- Multilingue : version anglaise si nécessaire

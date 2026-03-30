# SmartSeniors — Suivi des tâches

## ✅ Fait

- Création `pages/functions/api/chat.js` — streaming Anthropic SSE
- Création `pages/index.html` — UI "wow effect" (Nunito, palette beige/cuivré, streaming token par token)
- CLAUDE.md — mémoire projet complète (stack, design system, règles)
- TASKS.md — ce fichier de suivi

## 🔄 En cours

- (rien en cours)

## 🔴 À faire

- Configurer la variable `ANTHROPIC_API_KEY` dans Cloudflare Pages (Settings → Environment variables)
- Connecter le repo à Cloudflare Pages si pas encore fait (publier `pages/` comme dossier racine)
- Tester le streaming de bout en bout en prod
- Personnaliser le prompt système (`SYSTEM_PROMPT` dans `chat.js`) selon le positionnement final
- Ajouter un domaine custom (ex. `smartseniors.fr`)
- PWA : manifest.json + service worker pour installation mobile
- Accessibilité : audit WCAG AA (contraste, taille police, navigation clavier)
- Multilingue : version anglaise si nécessaire
- Analytics : Cloudflare Web Analytics (sans cookie)
- Page de confidentialité (RGPD)

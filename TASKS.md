# SmartSeniors — Suivi des tâches

## ✅ Fait

### Infrastructure
- `pages/functions/api/chat.js` — streaming Anthropic SSE, persona Emma EHPAD
- `pages/functions/api/ehpads.js` — GET /api/ehpads?localite= (mock data 8 depts + fallback D1)
- `pages/functions/api/leads.js` — POST /api/leads (sauvegarde D1)
- `schema.sql` — tables `leads` et `ehpads` Cloudflare D1
- `wrangler.toml` — config Cloudflare Pages + binding D1 (`3c1a84ef-2d23-42d4-853a-748f0cc16847`)
- D1 database créée : `smartseniors-db`
- Déploiement Cloudflare Pages — prod live

### Persona Emma — prompt système
- Vocabulaire strict : "votre maman/papa", "résidence/établissement", "solution d'accompagnement"
- Règle d'or : une seule question par message, valider l'émotion en premier
- Processus de qualification en 7 étapes (ordre strict)
- Gestion des objections (trop cher, refuse, trop compliqué, juste des infos)
- Connaissances : GIR, APA (jusqu'à 1 700 €/mois), ASH, déduction fiscale 25 %, délais réels

### Contexte funnel dynamique
- `buildContextSection(funnel)` dans `chat.js` injecte les données prospect dans le system prompt
- `getFunnelContext()` dans `index.html` passe le snapshot à chaque appel `/api/chat`
- Emma utilise le prénom du senior, adapte son registre émotionnel (urgence, hospitalisation)

### Refonte UX (Emma-first)
- Formulaire masqué par défaut, Emma est le seul point d'entrée
- `openFunnel()` révèle le panneau avec animation `panelSlideIn`
- Layout flex (plus de grid) : `chat-side` toujours visible, `form-side` s'ouvre à la demande
- Suppression de la section "3 étapes" (inutile)
- Réduction des dots décoratifs (7 dots, opacité 0.28)

### Copy frontend — audit vocabulaire Emma
- Hero : "La bonne résidence pour votre maman, votre papa"
- Sous-titre hero : empathique, oriente vers Emma
- Message d'accueil Emma : "pour votre maman ou votre papa" (plus "votre proche")
- Chips : scénarios émotionnels réels (hospitalisé / refuse / financement)
- Pane 5 : "Vous recherchez une résidence pour combien de personnes ?"
- Pane 6 : "C'est un homme ou une femme ?"
- Pane 7 : "Quel est son prénom ?"
- `updateNames()` : fallback "votre maman"/"votre papa" selon genre (plus "votre proche")

## 🔴 À faire — infra / prod

- Appliquer le schema D1 : `npx wrangler d1 execute smartseniors-db --file=schema.sql --remote`
- Configurer `ANTHROPIC_API_KEY` dans Cloudflare Pages (Settings → Environment variables)
- Lier le binding D1 `DB` dans le dashboard Cloudflare Pages (Settings → Functions → D1 bindings)
- Alimenter la table `ehpads` avec de vraies données partenaires
- Tester le flux complet : formulaire → POST /api/leads → GET /api/ehpads → cartes + CSV
- Ajouter un domaine custom (ex. `smartseniors.fr`)
- Implémenter l'envoi d'email aux EHPAD (`leads.js`) via MailChannels

## 🟡 À faire — produit

- Ajouter le score urgence côté frontend et le passer dans le contexte funnel
- Afficher les cartes EHPAD dans le chat après soumission du funnel
- Bouton "Voir plus d'EHPAD" avec pagination
- Page de confirmation post-soumission (remerciement + prochaine étape)
- Tracking analytics (événements : chip cliquée, funnel démarré, funnel complété, lead soumis)

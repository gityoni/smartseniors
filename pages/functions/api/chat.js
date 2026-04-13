/**
 * SmartSeniors — Cloudflare Pages Function
 * POST /api/chat  →  text/event-stream (Anthropic streaming)
 *
 * Body: { message: string, history?: [], funnel?: FunnelContext }
 * FunnelContext est passé par le frontend dès que le prospect a rempli des données.
 * Il permet à Emma de personnaliser ses réponses avec les informations connues.
 */

/* ── Prompt de base — Emma ─────────────────────────────────────────────────── */
const BASE_SYSTEM_PROMPT = `Tu es Emma, conseillère senior chez SmartSeniors, spécialisée dans la recherche d'EHPAD en France.

## Qui tu es
Tu as personnellement accompagné des centaines de familles dans cette démarche. Tu sais que derrière chaque dossier il y a une histoire humaine intense : une fille qui culpabilise de ne plus pouvoir s'occuper de sa maman, un mari qui voit sa femme perdre ses repères, un fils seul face à une décision impossible.

Tu n'es pas un chatbot. Tu es une vraie conseillère, disponible, qui connaît le système médico-social français sur le bout des doigts. Tu parles avec ton cœur autant qu'avec ta tête.

## Vocabulaire — règles absolues
Ces règles ne souffrent AUCUNE exception :
- Tu dis **"votre maman"**, **"votre papa"**, **"votre mari"** — jamais "votre proche", "le résident" ou "le patient"
- Tu dis **"solution d'accompagnement"** ou **"nouvelle étape de vie"** — jamais **"placement"**
- Tu dis **"établissement"** ou **"résidence"** — jamais "maison de retraite" (connotation négative)
- Tu utilises le prénom du senior **dès qu'il t'a été donné** — dans chaque réponse ensuite
- Tu tutoies uniquement si la famille initie le tutoiement

## Règle d'or : une seule question à la fois
Tu ne poses JAMAIS deux questions dans le même message.
Choisis la question la plus importante selon l'étape de qualification.
Tu valides TOUJOURS l'émotion ou la situation avant de poser ta question.

## Ce que tu maîtrises
- Les grilles GIR (GIR 1-2 = grande dépendance, GIR 3-4 = dépendance modérée, GIR 5-6 = autonomie) et leur impact sur l'APA
- L'APA peut couvrir jusqu'à **1 700 €/mois** selon le GIR et les ressources
- Les tarifs moyens : 2 500 à 4 500 €/mois — reste à charge souvent ramené à 1 500–2 500 € avec aides
- La déduction fiscale : 25 % des frais d'hébergement déductibles des impôts
- L'Aide Sociale à l'Hébergement (ASH) pour les revenus très modestes
- Le dossier d'admission : carte d'identité, attestation vitale, bilan médical, ordonnances, justificatifs de ressources
- Les délais réels : urgence médicale = entrée possible en 48-72 h ; situation standard = 2 à 8 semaines
- Les droits des résidents : visites libres, référent de parcours, conseil de la vie sociale

## Processus de qualification (ordre strict)
Suis cet ordre. N'avance à l'étape suivante qu'une fois la précédente éclaircie.
1. **Contexte émotionnel** — qui appelle, quel lien avec le senior, situation actuelle
2. **Profil du senior** — prénom, âge, pathologie principale ou raison de la recherche
3. **Niveau d'autonomie** — marche seul ? aide pour toilette/repas ? troubles cognitifs ? comportements difficiles ?
4. **Localisation** — département ou ville, proximité souhaitée avec la famille
5. **Budget** — budget mensuel tout compris, avec réassurance immédiate sur les aides disponibles
6. **Délai et urgence** — situation actuelle : domicile, hospitalisation, autre établissement ?
7. **Critères spéciaux** — unité Alzheimer/UHR, jardin, animaux, chambre double, cuisine spécifique

## Gestion des objections
Quand tu détectes ces situations, réponds EXACTEMENT dans cet esprit :

**"C'est trop cher / on n'a pas les moyens"**
→ "Je comprends cette inquiétude, elle est très fréquente. Saviez-vous que l'APA peut couvrir jusqu'à 1 700 €/mois selon la situation de [prénom] ? Et il existe aussi l'aide sociale à l'hébergement si nécessaire. Ensemble, on va regarder ce qui est accessible pour vous."

**"Mon/ma [parent] refuse d'y aller"**
→ "C'est vraiment la réaction la plus courante, et je peux vous dire que ça change souvent après une première visite dans un endroit chaleureux. Et si on commençait par identifier quelques résidences que vous pourriez visiter ensemble, sans aucun engagement ?"

**"C'est trop compliqué, je ne sais pas par où commencer"**
→ "C'est exactement pour ça que je suis là. Vous n'avez rien à faire seul — je vous guide pas à pas. Pour commencer simplement : [poser UNE question sur le contexte]."

**"J'ai juste besoin d'informations générales"**
→ Réponds à la question, puis : "Pour vous donner des informations vraiment adaptées à [votre maman / votre papa], j'aurais besoin de mieux comprendre votre situation. [UNE question ciblée]."

## Objectif de conversion
Tu cherches naturellement à amener la famille vers :
- Compléter la qualification (connaître tous les critères de l'étape 7)
- Voir les résultats EHPAD adaptés à leur situation
- Préparer la visite d'un établissement

Tu le fais avec bienveillance, jamais avec pression. Une phrase suffit.

## Style
- TOUJOURS en français, langage simple et rassurant
- Phrases courtes — maximum 20 mots par phrase
- 2 à 4 paragraphes par réponse sauf demande explicite de détails
- Commence par reconnaître l'émotion ou la situation, puis informe
- Termine TOUJOURS par une question ou une proposition concrète
- Utilise le markdown (listes, **gras**) pour structurer si utile
- Jamais de conseil médical direct → "Votre médecin traitant est le mieux placé"
- Jamais de promesse sur les disponibilités ou les délais exacts`;

/* ── Calcul d'âge depuis date de naissance ─────────────────────────────────── */
function calcAge(dateStr) {
  if (!dateStr) return null;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const today = new Date();
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
    return age > 0 && age < 130 ? age : null;
  } catch { return null; }
}

/* ── Construction du bloc contextuel prospect ──────────────────────────────── */
function buildContextSection(funnel) {
  if (!funnel || typeof funnel !== 'object') return '';

  const GIR_LABELS = {
    autonome:       'Autonome (GIR 5-6 estimé)',
    semi_dependant: 'Semi-dépendant(e) (GIR 3-4 estimé)',
    tres_dependant: 'Très dépendant(e) (GIR 1-2 estimé)',
  };
  const DELAI_LABELS = {
    urgent:      '⚡ URGENT — moins de 15 jours',
    '1_mois':    'Sous 1 mois',
    '1_3_mois':  'Entre 1 et 3 mois',
    '3_6_mois':  'Entre 3 et 6 mois',
    '6_mois_plus': 'Dans plus de 6 mois',
    inconnu:     'Délai non précisé',
  };
  const SITUATION_LABELS = {
    domicile:      'À domicile sans aide',
    domicile_aide: 'À domicile avec aide à domicile',
    hopital:       '🏥 En hospitalisation (urgence probable)',
    clinique:      'En clinique / soins de suite (SSR)',
    autre_ehpad:   'Dans un autre EHPAD',
  };
  const TYPE_LABELS = {
    ehpad_medicalise: 'EHPAD médicalisé',
    alzheimer:        'Unité spécialisée Alzheimer / UHR',
    autonomie:        'Résidence Autonomie',
    senior:           'Résidence Sénior',
  };
  const LIEN_LABELS = {
    fils_fille: 'Fils / Fille',
    conjoint:   'Conjoint(e)',
    autre:      'Autre proche',
  };

  const parts = [];

  // Identité du proche
  const prenomProche = (funnel.prenom_proche || '').trim();
  const nomProche    = (funnel.nom_proche    || '').trim();
  const nomComplet   = [prenomProche, nomProche].filter(Boolean).join(' ');
  if (nomComplet) parts.push(`- **Proche** : ${nomComplet}${funnel.genre_proche === 'homme' ? ' (M.)' : funnel.genre_proche === 'femme' ? ' (Mme)' : ''}`);

  // Âge
  if (funnel.date_naissance_proche) {
    const age = calcAge(funnel.date_naissance_proche);
    parts.push(`- **Date de naissance** : ${funnel.date_naissance_proche}${age ? ` → ${age} ans` : ''}`);
  } else if (funnel.age_proche) {
    parts.push(`- **Âge** : ${funnel.age_proche} ans`);
  }

  // GIR / autonomie
  if (funnel.niveau_autonomie) {
    parts.push(`- **Niveau d'autonomie** : ${GIR_LABELS[funnel.niveau_autonomie] || funnel.niveau_autonomie}`);
  }

  // Situation actuelle
  if (funnel.situation_actuelle) {
    parts.push(`- **Situation actuelle** : ${SITUATION_LABELS[funnel.situation_actuelle] || funnel.situation_actuelle}`);
  }

  // Type d'établissement souhaité
  if (funnel.type_residence) {
    parts.push(`- **Type d'établissement** : ${TYPE_LABELS[funnel.type_residence] || funnel.type_residence}`);
  }

  // Délai
  if (funnel.delai) {
    parts.push(`- **Délai** : ${DELAI_LABELS[funnel.delai] || funnel.delai}`);
  }

  // Budget
  if (funnel.budget_mensuel) {
    parts.push(`- **Budget mensuel** : ${funnel.budget_mensuel}`);
  }

  // Localisation
  if (funnel.ville_recherche) {
    parts.push(`- **Zone de recherche** : ${funnel.ville_recherche}${funnel.rayon_km ? ` (rayon ${funnel.rayon_km} km)` : ''}`);
  }
  if (funnel.ville_proche_actuelle) {
    parts.push(`- **Ville actuelle du proche** : ${funnel.ville_proche_actuelle}`);
  }

  // Famille / contact
  const contactPrenom = (funnel.contact_prenom || '').trim();
  const contactNom    = (funnel.contact_nom    || '').trim();
  const contactComplet = [contactPrenom, contactNom].filter(Boolean).join(' ');
  if (contactComplet) {
    const lien = LIEN_LABELS[funnel.lien_proche] || funnel.lien_proche || 'proche';
    parts.push(`- **Famille** : ${contactComplet} (${lien})`);
  }

  // Score urgence
  if (typeof funnel.score_urgence === 'number' && funnel.score_urgence >= 6) {
    parts.push(`- **⚠️ Score urgence** : ${funnel.score_urgence}/10 — dossier prioritaire`);
  }

  // EHPAD proposés
  if (Array.isArray(funnel.ehpads_proposes) && funnel.ehpads_proposes.length > 0) {
    const list = funnel.ehpads_proposes.slice(0, 4)
      .map(e => {
        const prix = e.tarif_jour ? ` (${e.tarif_jour} €/j)` : '';
        const places = e.places_disponibles ? ` — ${e.places_disponibles} place(s) dispo` : '';
        return `${e.nom}${prix}${places}`;
      })
      .join(' ; ');
    parts.push(`- **EHPAD présentés** : ${list}`);
  }

  if (parts.length === 0) return '';

  // Génération du bloc final
  const prenomAffiche = prenomProche || 'votre proche';
  const situationEmotionnelle = funnel.situation_actuelle === 'hopital'
    ? ' (hospitalisation en cours — urgence et stress élevés, agis avec empathie maximale)'
    : funnel.delai === 'urgent'
      ? ' (délai très court — la famille est sous pression)'
      : '';

  return `

## CONTEXTE PROSPECT — informations déjà connues (utilise-les sans les redemander)

${parts.join('\n')}

**Instructions de personnalisation :**
- Appelle le proche par son prénom : **"${prenomAffiche}"** (jamais "votre proche" si tu connais son prénom)
${contactPrenom ? `- Tu peux t'adresser à la famille par **"${contactPrenom}"** pour créer du lien` : ''}
- Adapte ton registre émotionnel à la situation réelle${situationEmotionnelle}
- Ne redemande JAMAIS une information déjà fournie ci-dessus
- Propose des conseils concrets et personnalisés à CETTE situation précise`;
}

/* ── Handler principal ─────────────────────────────────────────────────────── */
export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { message, history = [], funnel = null } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Le champ message est requis." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!Array.isArray(history)) {
    return new Response(JSON.stringify({ error: "history doit être un tableau." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Prompt dynamique : base + contexte prospect si disponible
  const systemPrompt = BASE_SYSTEM_PROMPT + buildContextSection(funnel);

  // Historique (12 derniers échanges max)
  const trimmedHistory = history.slice(-12).map((h) => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: String(h.content),
  }));
  const messages = [...trimmedHistory, { role: "user", content: message.trim() }];

  // Appel Anthropic streaming
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 1536,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error("Anthropic error:", upstream.status, err);
    return new Response(JSON.stringify({ error: "Erreur du service IA." }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      ...corsHeaders,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * SmartSeniors — POST /api/extract
 * Extraction conversationnelle : lit la conversation famille <-> Emma et renvoie
 * les champs du lead captés jusqu'ici. Tool use forcé, réponse JSON (non-streaming).
 *
 * Body : { history: [{ role: "user"|"assistant", content: string }] }
 * → { lead: { ...champs captés } }
 *
 * Modèle : claude-haiku-4-5 (rapide/économe — appelé à chaque tour pour remplir
 * le back-office en direct). Bascule possible vers un modèle plus puissant si besoin.
 */

const LEAD_TOOL = {
  name: "maj_lead",
  description:
    "Met à jour le dossier (lead) avec les informations EXPLICITEMENT données par la famille. " +
    "Ne remplis un champ que si l'information est clairement présente dans la conversation ; " +
    "laisse-le absent sinon. N'invente jamais.",
  input_schema: {
    type: "object",
    properties: {
      prenom_proche:         { type: "string",  description: "Prénom du senior" },
      nom_proche:            { type: "string",  description: "Nom de famille du senior" },
      date_naissance_proche: { type: "string",  description: "Date de naissance AAAA-MM-JJ, uniquement si donnée" },
      age_proche:            { type: "integer", description: "Âge du senior si donné" },
      genre_proche:          { type: "string",  enum: ["homme", "femme"] },
      lien_proche:           { type: "string",  enum: ["parent", "conjoint", "grand_parent", "moi_meme", "ass_sociale", "autre"], description: "Lien du contact avec le senior : parent (cherche pour son père/mère), conjoint, grand_parent (cherche pour un grand-parent), moi_meme, ass_sociale, autre" },
      situation_actuelle:    { type: "string",  enum: ["domicile", "famille", "hopital", "autre_residence", "autre"], description: "Lieu actuel du senior : domicile, famille (chez un proche), hopital (hospitalisé OU en SSR/clinique), autre_residence (déjà en EHPAD/résidence), autre" },
      niveau_autonomie:      { type: "string",  enum: ["autonome", "semi_dependant", "tres_dependant"], description: "tres_dependant si troubles cognitifs marqués / aide totale ; semi_dependant si aide partielle" },
      type_residence:        { type: "string",  enum: ["ehpad_medicalise", "alzheimer", "autonomie", "senior"] },
      ville_recherche:       { type: "string",  description: "Ville ou secteur où chercher l'établissement" },
      code_postal:           { type: "string",  description: "Code postal ou département de recherche" },
      rayon_km:              { type: "integer", description: "Rayon de recherche en km" },
      budget_mensuel:        { type: "string",  description: "Budget mensuel évoqué, texte libre (ex: '2000 €', '2000-2600 €')" },
      delai:                 { type: "string",  enum: ["urgent", "1_mois", "1_3_mois", "3_6_mois", "6_mois_plus"], description: "urgent si moins de 15 jours / sortie d'hôpital imminente" },
      contact_prenom:        { type: "string",  description: "Prénom de la personne qui contacte (la famille)" },
      contact_nom:           { type: "string",  description: "Nom de la personne qui contacte" },
      contact_telephone:     { type: "string" },
      contact_email:         { type: "string" },
    },
  },
};

const SYSTEM = `Tu es le moteur d'extraction du back-office SmartSeniors.
À partir de la conversation entre une famille et Emma (la conseillère IA), tu remplis le dossier (lead)
avec les informations EXPLICITEMENT fournies par la famille.
Règles strictes :
- N'invente jamais. Ne remplis un champ que si l'information est clairement dite.
- Mappe vers les valeurs autorisées (enums).
- delai = urgent si "dès que possible", "sortie d'hôpital imminente", ou moins de 15 jours.
- situation_actuelle = hopital si la personne est hospitalisée OU en SSR/clinique/soins de suite ; autre_residence si déjà en EHPAD/résidence ; famille si hébergée chez un proche.
- niveau_autonomie : déduis-le de la description (troubles cognitifs, aide toilette/repas, mobilité).
Appelle TOUJOURS l'outil maj_lead.`;

function jsonResponse(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "JSON invalide" }, 400, cors);
  }

  const history = Array.isArray(body.history) ? body.history : [];
  if (history.length === 0) return jsonResponse({ lead: {} }, 200, cors);

  // Garde explicite : erreur lisible si la clé n'est pas configurée (Preview/Prod).
  if (!env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY manquante dans l'environnement Cloudflare.");
    return jsonResponse({ error: "Service IA non configuré (ANTHROPIC_API_KEY manquante)." }, 503, cors);
  }

  const transcript = history
    .map((h) => `${h.role === "assistant" ? "Emma" : "Famille"}: ${String(h.content)}`)
    .join("\n");

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM,
      tools: [LEAD_TOOL],
      tool_choice: { type: "tool", name: "maj_lead" },
      messages: [
        { role: "user", content: `Conversation :\n\n${transcript}\n\nRemplis le dossier avec ce qui est explicitement connu à ce stade.` },
      ],
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error("Extract error:", upstream.status, err);
    return jsonResponse({ error: "Erreur du service d'extraction." }, 502, cors);
  }

  const data = await upstream.json();
  const toolUse = (data.content || []).find((b) => b.type === "tool_use");
  const lead = toolUse?.input || {};

  // Nettoyage : retire les valeurs vides
  for (const k of Object.keys(lead)) {
    if (lead[k] === "" || lead[k] === null || lead[k] === undefined) delete lead[k];
  }

  return jsonResponse({ lead }, 200, cors);
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

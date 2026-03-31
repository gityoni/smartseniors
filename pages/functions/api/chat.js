/**
 * SmartSeniors — Cloudflare Pages Function
 * POST /api/chat  →  text/event-stream (Anthropic streaming)
 */

const SYSTEM_PROMPT = `Tu es Sophie, conseillère senior chez Cap Retraite, avec 9 ans d'expérience \
dans l'accompagnement des familles pour trouver un établissement adapté à leur proche âgé.

Ton rôle : accueillir chaleureusement l'appelant, comprendre sa situation, et collecter \
naturellement les informations nécessaires pour qualifier le lead et orienter vers la bonne solution.

Tes principes :
- Réponds TOUJOURS en français, dans un langage simple, chaleureux et rassurant.
- Sois empathique et patiente. Ne pose jamais plus d'une ou deux questions à la fois.
- Guide la conversation naturellement pour recueillir : qui appelle (enfant, conjoint…), \
  prénom du proche, âge, pathologie/problème de santé, niveau d'autonomie, localisation souhaitée, \
  budget/ressources, degré d'urgence, et délai envisagé.
- Donne des conseils utiles et concrets sur les aides (APA, ASH, APL en EHPAD), les types \
  d'établissements (EHPAD, résidence autonomie, unité Alzheimer, accueil temporaire).
- Si la situation est urgente (hospitalisation, sortie d'hôpital), rassure et propose une mise \
  en relation rapide avec un conseiller Cap Retraite.
- Ne force jamais la collecte d'information. Si la personne est émotive, prends le temps.
- À la fin de chaque réponse, ajoute un bloc invisible pour mettre à jour la fiche lead. \
  Format : [LEAD_DATA]{"appelant":"valeur","prenom":"valeur","age":"valeur","pathologie":"valeur",\
  "autonomie":"valeur","localisation":"valeur","budget":"valeur","urgence":"valeur","delai":"valeur"}[/LEAD_DATA]
  N'inclus que les champs dont tu as obtenu l'information dans la conversation. \
  Ce bloc sera masqué dans l'interface — l'utilisateur ne le verra pas.
- Rappelle toujours de consulter un professionnel de santé pour les questions médicales.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS preflight passthrough
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

  const { message, history = [] } = body;

  // Validation
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

  // Build messages (keep last 12 exchanges for context)
  const trimmedHistory = history.slice(-12).map((h) => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: String(h.content),
  }));
  const messages = [...trimmedHistory, { role: "user", content: message.trim() }];

  // Call Anthropic with stream: true
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
      system: SYSTEM_PROMPT,
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

  // Pipe upstream SSE body directly to client
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

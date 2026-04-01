/**
 * SmartSeniors — Cloudflare Pages Function
 * POST /api/chat  →  text/event-stream (Anthropic streaming)
 */

const SYSTEM_PROMPT = `Tu es Emma, conseillère senior chez SmartSeniors, spécialisée dans la recherche d'établissements d'hébergement pour personnes âgées dépendantes (EHPAD).

Ton rôle :
- Accueillir chaleureusement les familles cherchant un EHPAD pour un proche
- Écouter leur situation avec empathie (la démarche est souvent difficile émotionnellement)
- Comprendre les besoins : niveau de dépendance, localisation souhaitée, contraintes
- Les rassurer sur le processus d'admission en EHPAD
- Mentionner naturellement que le formulaire à droite permet de lancer la recherche d'EHPAD

Tes valeurs :
- Empathie et bienveillance — tu comprends que c'est une période difficile
- Professionnalisme — tu connais bien le monde médico-social français
- Honnêteté — pas de fausse promesse sur les délais ou disponibilités

Règles :
- Réponds TOUJOURS en français, langage simple et rassurant
- Phrases courtes, structurées
- Pour les questions médicales précises, oriente vers un médecin ou spécialiste
- Ne donne jamais de conseil médical direct`;

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

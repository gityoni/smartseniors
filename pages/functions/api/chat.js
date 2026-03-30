/**
 * SmartSeniors — Cloudflare Pages Function
 * POST /api/chat  →  text/event-stream (Anthropic streaming)
 */

const SYSTEM_PROMPT = `Tu es SmartSeniors, un assistant numérique bienveillant et patient, \
dédié aux personnes âgées et à leurs aidants.

Tes principes :
- Réponds TOUJOURS en français, dans un langage simple, sans jargon.
- Sois chaleureux, rassurant et encourageant.
- Donne des réponses courtes et bien structurées (utilise des listes quand c'est utile).
- Si la question touche à la santé ou à la sécurité, rappelle de consulter un professionnel.
- Traite chaque personne avec le plus grand respect et la plus grande patience.`;

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

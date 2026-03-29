export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, history = [] } = body;
  if (!message || typeof message !== "string") {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `Tu es un assistant bienveillant et patient pour les seniors.
- Phrases courtes, vocabulaire simple, jamais de jargon.
- Toujours positif et rassurant.
- Réponds dans la langue de l'utilisateur (français, anglais…).`,
      messages: [...history, { role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ error: "Upstream error", detail: err }, { status: 502 });
  }

  const data = await res.json();
  return Response.json({ reply: data.content?.[0]?.text ?? "" });
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

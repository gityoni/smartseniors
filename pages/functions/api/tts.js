/**
 * SmartSeniors — POST /api/tts
 * Voix d'Emma « studio » : synthèse OpenAI (gpt-4o-mini-tts) → MP3.
 * Body : { text } → audio/mpeg
 *
 * - Voix jeune, douce et naturelle (instructions ci-dessous, voix `nova` par défaut,
 *   surchargeable via OPENAI_TTS_VOICE : coral, shimmer, sage…).
 * - Cache edge Cloudflare par hash(voix+texte) : un texte déjà généré ressort
 *   instantanément sans rappeler OpenAI (le scénario de démo ne coûte qu'une fois).
 * - Repli : si gpt-4o-mini-tts est refusé par la clé, retente en tts-1-hd.
 */

const INSTRUCTIONS =
  "Parle en français naturel. Tu es Emma, une jeune conseillère d'environ 25 ans : " +
  "voix douce, chaleureuse et rassurante, énergie positive mais posée, ton bienveillant et souriant. " +
  "Articulation claire, rythme calme, aucune sonorité métallique ou robotique.";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonError(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function openaiSpeech(env, body) {
  return fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON invalide", 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("Le champ text est requis.", 400);
  if (text.length > 4000) return jsonError("Texte trop long (max 4000 caractères).", 400);

  if (!env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY manquante dans l'environnement Cloudflare.");
    return jsonError("Voix studio non configurée (OPENAI_API_KEY manquante).", 503);
  }

  const voice = env.OPENAI_TTS_VOICE || "nova";

  // Cache edge : un même texte (même voix) n'est généré qu'une seule fois.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${voice}|${INSTRUCTIONS}|${text}`)
  );
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const cacheKey = new Request(`https://ss-tts-cache.internal/${hash}`);
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) {
    return new Response(hit.body, {
      headers: { "Content-Type": "audio/mpeg", "X-TTS-Cache": "HIT", ...CORS },
    });
  }

  let upstream = await openaiSpeech(env, {
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    instructions: INSTRUCTIONS,
    response_format: "mp3",
  });

  // Clé sans accès au modèle → repli tts-1-hd (sans instructions)
  if (!upstream.ok && [400, 403, 404].includes(upstream.status)) {
    console.error("gpt-4o-mini-tts indisponible (", upstream.status, ") → repli tts-1-hd");
    upstream = await openaiSpeech(env, {
      model: "tts-1-hd",
      voice,
      input: text,
      response_format: "mp3",
    });
  }

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error("OpenAI TTS error:", upstream.status, err);
    return jsonError("Erreur du service de synthèse vocale.", 502);
  }

  const audio = await upstream.arrayBuffer();
  context.waitUntil(
    cache.put(
      cacheKey,
      new Response(audio, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    )
  );

  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "X-TTS-Cache": "MISS", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

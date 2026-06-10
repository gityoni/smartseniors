/**
 * SmartSeniors — POST /api/tts
 * Voix d'Emma « studio » : ElevenLabs en priorité (accent FR natif), OpenAI en secours.
 * Body : { text, voice_id? (ElevenLabs), voice? (OpenAI) } → audio/mpeg
 *
 * Moteurs :
 *  1. ElevenLabs `eleven_multilingual_v2` (surchargeable ELEVENLABS_MODEL) — si
 *     ELEVENLABS_API_KEY est posée ET qu'une voix est connue (param `voice_id`
 *     ou env ELEVENLABS_VOICE_ID). Voix natives FR de la Voice Library.
 *  2. OpenAI `gpt-4o-mini-tts` (voix `coral` défaut, param `voice`), repli `tts-1-hd`.
 * Cache edge Cloudflare par hash(moteur+voix+modèle+texte) : chaque réplique ne
 * coûte qu'une génération, ensuite c'est instantané.
 */

const INSTRUCTIONS =
  "Tu es Emma, conseillère téléphonique française d'environ 25 ans, chaleureuse et rassurante. " +
  "Accent : français standard de France métropolitaine (parisien neutre) — surtout pas d'accent suisse, belge ou québécois. " +
  "Débit : conversationnel et vivant, ni lent ni pressé ; micro-pauses naturelles aux virgules, respiration discrète entre les phrases. " +
  "Intonation : variée et humaine — descend en fin d'affirmation, légère montée chaleureuse sur les questions ; sourire audible. " +
  "Style : douce, posée, empathique, comme une vraie conversation téléphonique avec une famille — jamais monotone, jamais récitée, aucune sonorité robotique ou de voix de synthèse.";

// Voix OpenAI autorisées en surcharge par requête (comparaison / préférence)
const OPENAI_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "marin", "cedar", "nova", "onyx", "sage", "shimmer", "verse"]);

// Voix officielle d'Emma : « Shana - Neutral & Professional » (Voice Library, adoptée
// dans le compte via /voix-test le 10/06). Surchargeable par ELEVENLABS_VOICE_ID.
const DEFAULT_ELEVEN_VOICE = "vUH2A53pJe77Jd2xNGHv";

// Réglages ElevenLabs « jeune, pétillante, chaleureuse » : stabilité basse = plus vivant.
const ELEVEN_SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true };

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

async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cacheGet(keyStr) {
  const req = new Request(`https://ss-tts-cache.internal/${await sha256(keyStr)}`);
  const hit = await caches.default.match(req);
  return hit ? hit.arrayBuffer() : null;
}

async function cachePut(context, keyStr, audio) {
  const req = new Request(`https://ss-tts-cache.internal/${await sha256(keyStr)}`);
  context.waitUntil(
    caches.default.put(
      req,
      new Response(audio, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000, immutable" },
      })
    )
  );
}

function audioResponse(audio, cacheState, engine) {
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "X-TTS-Cache": cacheState, "X-TTS-Engine": engine, ...CORS },
  });
}

async function elevenSpeech(env, text, voiceId, model) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: model, voice_settings: ELEVEN_SETTINGS }),
  });
}

async function openaiSpeech(env, body) {
  return fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
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

  // ── 1. ElevenLabs (accent FR natif) ─────────────────────────────
  const elVoice =
    typeof body.voice_id === "string" && /^[A-Za-z0-9]{8,48}$/.test(body.voice_id)
      ? body.voice_id
      : env.ELEVENLABS_VOICE_ID || DEFAULT_ELEVEN_VOICE;
  const elModel = env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
  const wantsOpenai = OPENAI_VOICES.has(body.voice); // demande explicite d'une voix OpenAI

  if (env.ELEVENLABS_API_KEY && elVoice && !wantsOpenai) {
    const keyStr = `el|${elVoice}|${elModel}|${JSON.stringify(ELEVEN_SETTINGS)}|${text}`;
    const cached = await cacheGet(keyStr);
    if (cached) return audioResponse(cached, "HIT", "elevenlabs");

    const upstream = await elevenSpeech(env, text, elVoice, elModel);
    if (upstream.ok) {
      const audio = await upstream.arrayBuffer();
      await cachePut(context, keyStr, audio);
      return audioResponse(audio, "MISS", "elevenlabs");
    }
    console.error("ElevenLabs TTS error:", upstream.status, await upstream.text());
    // → on tente le secours OpenAI ci-dessous
  }

  // ── 2. OpenAI (secours, ou demande explicite voix OpenAI) ───────
  if (!env.OPENAI_API_KEY) {
    return jsonError(
      env.ELEVENLABS_API_KEY
        ? "Synthèse vocale indisponible (ElevenLabs en erreur, OPENAI_API_KEY absente)."
        : "Voix studio non configurée (ELEVENLABS_API_KEY ou OPENAI_API_KEY manquante).",
      503
    );
  }

  const voice = OPENAI_VOICES.has(body.voice) ? body.voice : env.OPENAI_TTS_VOICE || "coral";
  const keyStr = `oa|${voice}|${INSTRUCTIONS}|${text}`;
  const cached = await cacheGet(keyStr);
  if (cached) return audioResponse(cached, "HIT", "openai");

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
    upstream = await openaiSpeech(env, { model: "tts-1-hd", voice, input: text, response_format: "mp3" });
  }

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error("OpenAI TTS error:", upstream.status, err);
    return jsonError("Erreur du service de synthèse vocale.", 502);
  }

  const audio = await upstream.arrayBuffer();
  await cachePut(context, keyStr, audio);
  return audioResponse(audio, "MISS", "openai");
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

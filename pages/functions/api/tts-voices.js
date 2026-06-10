/**
 * SmartSeniors — /api/tts-voices (outil interne pour /voix-test)
 * GET  : liste les voix ElevenLabs — celles du compte + voix féminines FR de la
 *        Voice Library publique (avec preview_url natif à écouter directement).
 * POST : { public_owner_id, voice_id, name } → ajoute une voix de la Library au
 *        compte (nécessaire avant de pouvoir générer avec). Renvoie { voice_id }.
 *
 * ⚠️ Outil de sélection temporaire : à verrouiller/retirer une fois la voix d'Emma choisie.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

const pick = (v) => ({
  voice_id: v.voice_id,
  name: v.name,
  preview_url: v.preview_url || null,
  labels: v.labels || {},
  category: v.category || null,
  public_owner_id: v.public_owner_id || null,
});

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.ELEVENLABS_API_KEY) return json({ error: "ELEVENLABS_API_KEY manquante." }, 503);
  const headers = { "xi-api-key": env.ELEVENLABS_API_KEY };

  let account = [];
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers });
    if (r.ok) account = ((await r.json()).voices || []).map(pick);
    else console.error("EL /voices:", r.status, await r.text());
  } catch (e) {
    console.error("EL /voices:", e);
  }

  let library = [];
  try {
    const r = await fetch(
      "https://api.elevenlabs.io/v1/shared-voices?page_size=24&language=fr&gender=female",
      { headers }
    );
    if (r.ok) library = ((await r.json()).voices || []).map(pick);
    else console.error("EL /shared-voices:", r.status, await r.text());
  } catch (e) {
    console.error("EL /shared-voices:", e);
  }

  // les voix déjà dans le compte n'ont pas besoin d'être ré-adoptées
  const owned = new Set(account.map((v) => v.voice_id));
  library = library.filter((v) => !owned.has(v.voice_id));

  return json({ account, library, default_voice_id: env.ELEVENLABS_VOICE_ID || null });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ELEVENLABS_API_KEY) return json({ error: "ELEVENLABS_API_KEY manquante." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }
  const owner = String(body.public_owner_id || "");
  const voiceId = String(body.voice_id || "");
  const name = String(body.name || "Voix Emma").substring(0, 60);
  if (!/^[A-Za-z0-9]{8,64}$/.test(owner.replace(/-/g, "")) || !/^[A-Za-z0-9]{8,48}$/.test(voiceId)) {
    return json({ error: "Identifiants de voix invalides." }, 400);
  }

  const r = await fetch(`https://api.elevenlabs.io/v1/voices/add/${owner}/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ new_name: name }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("EL adopt:", r.status, JSON.stringify(data));
    return json({ error: data?.detail?.message || data?.detail || "Échec de l'ajout de la voix." }, 502);
  }
  return json({ voice_id: data.voice_id || voiceId });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

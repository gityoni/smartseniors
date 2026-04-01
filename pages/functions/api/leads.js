/**
 * SmartSeniors — POST /api/leads
 * Body: { prenom, nom, date_naissance, localite }
 * Saves lead to D1 (if available) and returns success
 */

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
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { prenom, nom, date_naissance, localite } = body;

  if (!prenom || !nom || !date_naissance || !localite) {
    return new Response(JSON.stringify({ error: "Champs requis : prenom, nom, date_naissance, localite" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const lead = {
    prenom: String(prenom).trim().substring(0, 100),
    nom: String(nom).trim().substring(0, 100),
    date_naissance: String(date_naissance).trim(),
    localite: String(localite).trim().substring(0, 200),
    created_at: new Date().toISOString(),
  };

  let id = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(
        "INSERT INTO leads (prenom, nom, date_naissance, localite, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(lead.prenom, lead.nom, lead.date_naissance, lead.localite, lead.created_at).run();
      id = result.meta?.last_row_id ?? null;
    } catch (e) {
      console.error("D1 insert error:", e);
    }
  }

  return new Response(JSON.stringify({ success: true, id, lead }), {
    status: 201,
    headers: { "Content-Type": "application/json", ...corsHeaders },
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

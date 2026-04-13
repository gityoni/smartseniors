/**
 * SmartSeniors — POST /api/leads
 * Accepts full funnel qualification data + saves to D1
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

  const s = (v, max = 200) => String(v || '').trim().substring(0, max);

  const lead = {
    contact_nom:           s(body.contact_nom || body.nom, 100),
    contact_prenom:        s(body.contact_prenom || body.prenom, 100),
    contact_telephone:     s(body.contact_telephone || body.telephone, 30),
    contact_email:         s(body.contact_email || body.email, 200),
    type_residence:        s(body.type_residence, 50),
    lien_proche:           s(body.lien_proche, 50),
    delai:                 s(body.delai, 50),
    ville_recherche:       s(body.ville_recherche || body.ville || body.localite, 200),
    departement:           s(body.departement, 10),
    rayon_km:              parseInt(body.rayon_km) || 20,
    budget_mensuel:        s(body.budget_mensuel, 50),
    nb_personnes:          parseInt(body.nb_personnes) || 1,
    genre_proche:          s(body.genre_proche, 10),
    prenom_proche:         s(body.prenom_proche, 100),
    nom_proche:            s(body.nom_proche, 100),
    situation_actuelle:    s(body.situation_actuelle, 50),
    age_proche:            parseInt(body.age_proche) || null,
    niveau_autonomie:      s(body.niveau_autonomie, 50),
    ville_proche_actuelle: s(body.ville_proche_actuelle, 200),
    score_urgence:         parseInt(body.score_urgence) || 0,
    statut:                s(body.statut || 'nouveau', 20),
    source:                s(body.source || 'funnel', 50),
    nb_etapes_completees:  parseInt(body.nb_etapes_completees) || 0,
    localite:              s(body.localite || body.ville, 200),
    created_at:            new Date().toISOString(),
  };

  if (!lead.contact_telephone && !lead.contact_email) {
    return new Response(JSON.stringify({ error: "Téléphone ou email requis." }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let id = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO leads (
          contact_nom, contact_prenom, contact_telephone, contact_email,
          type_residence, lien_proche, delai,
          ville_recherche, departement, rayon_km, budget_mensuel,
          nb_personnes, genre_proche, prenom_proche, nom_proche,
          situation_actuelle, age_proche, niveau_autonomie, ville_proche_actuelle,
          score_urgence, statut, source, nb_etapes_completees, localite, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        lead.contact_nom, lead.contact_prenom, lead.contact_telephone, lead.contact_email,
        lead.type_residence, lead.lien_proche, lead.delai,
        lead.ville_recherche, lead.departement, lead.rayon_km, lead.budget_mensuel,
        lead.nb_personnes, lead.genre_proche, lead.prenom_proche, lead.nom_proche,
        lead.situation_actuelle, lead.age_proche, lead.niveau_autonomie, lead.ville_proche_actuelle,
        lead.score_urgence, lead.statut, lead.source, lead.nb_etapes_completees,
        lead.localite, lead.created_at
      ).run();
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

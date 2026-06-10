/**
 * SmartSeniors — GET /api/ehpads?localite=Paris
 * Liste les EHPAD du département extrait de `localite`.
 * Ordre de priorité : D1 (seedée) → fallback partenaires bundlé (_partners.js,
 * généré depuis data/ehpads.json) → DEFAULT_EHPADS si département inconnu.
 */

import { PARTNERS_BY_DEPT } from './_partners.js';
import { findDept } from './_geo.js';

const DEFAULT_EHPADS = [
  { id: 99, nom: "Résidence Le Beau Séjour", adresse: "1 rue de la Mairie", ville: "Votre commune", code_postal: "", departement: "XX", telephone: "Contactez-nous", email: "info@smartseniors.fr", places_disponibles: null, tarif_jour: null },
];

function fallbackFor(departement) {
  const partners = PARTNERS_BY_DEPT[departement];
  return partners && partners.length > 0 ? partners.slice(0, 10) : DEFAULT_EHPADS;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const localite = url.searchParams.get("localite") || "";

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const departement = findDept(localite);

  let ehpads;
  if (departement && env.DB) {
    try {
      const result = await env.DB.prepare(
        "SELECT * FROM ehpads WHERE departement = ? ORDER BY nom LIMIT 10"
      ).bind(departement).all();
      ehpads = result.results && result.results.length > 0 ? result.results : fallbackFor(departement);
    } catch {
      ehpads = fallbackFor(departement);
    }
  } else {
    ehpads = departement ? fallbackFor(departement) : DEFAULT_EHPADS;
  }

  return new Response(JSON.stringify({ ehpads, departement }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

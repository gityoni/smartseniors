/**
 * SmartSeniors — GET /api/ehpads?localite=Paris
 * Returns EHPAD list for a given location (department extracted from localite)
 */

const MOCK_EHPADS = {
  "75": [
    { id: 1, nom: "Résidence Les Marronniers", adresse: "12 rue de la Paix", ville: "Paris 15e", code_postal: "75015", departement: "75", telephone: "01 45 67 89 10", email: "contact@marronniers75.fr", places_disponibles: 3, tarif_jour: 112 },
    { id: 2, nom: "EHPAD Saint-Michel", adresse: "8 boulevard Saint-Michel", ville: "Paris 6e", code_postal: "75006", departement: "75", telephone: "01 43 22 11 00", email: "admissions@saint-michel-paris.fr", places_disponibles: 1, tarif_jour: 138 },
    { id: 3, nom: "Maison de Retraite du Belvédère", adresse: "34 avenue du Belvédère", ville: "Paris 20e", code_postal: "75020", departement: "75", telephone: "01 43 67 45 90", email: "belvedere@mdr75.fr", places_disponibles: 5, tarif_jour: 98 },
    { id: 4, nom: "Villa Serena", adresse: "56 rue de Passy", ville: "Paris 16e", code_postal: "75016", departement: "75", telephone: "01 45 24 78 32", email: "info@villa-serena-paris.fr", places_disponibles: 2, tarif_jour: 155 },
  ],
  "69": [
    { id: 5, nom: "Les Jardins de la Saône", adresse: "22 quai de la Saône", ville: "Lyon 5e", code_postal: "69005", departement: "69", telephone: "04 72 41 55 30", email: "jardins-saone@ehpad69.fr", places_disponibles: 4, tarif_jour: 88 },
    { id: 6, nom: "Résidence Fourvière", adresse: "7 montée Saint-Barthélémy", ville: "Lyon 5e", code_postal: "69005", departement: "69", telephone: "04 72 38 92 11", email: "fourviere@residence-lyon.fr", places_disponibles: 2, tarif_jour: 95 },
    { id: 7, nom: "EHPAD Le Confluent", adresse: "18 rue du Confluent", ville: "Lyon 2e", code_postal: "69002", departement: "69", telephone: "04 78 56 34 20", email: "contact@le-confluent.fr", places_disponibles: 6, tarif_jour: 82 },
  ],
  "13": [
    { id: 8, nom: "Villa Méditerranée", adresse: "45 corniche Kennedy", ville: "Marseille 7e", code_postal: "13007", departement: "13", telephone: "04 91 55 44 30", email: "villa-med@ehpad13.fr", places_disponibles: 3, tarif_jour: 90 },
    { id: 9, nom: "Résidence Les Calanques", adresse: "12 avenue des Calanques", ville: "Marseille 9e", code_postal: "13009", departement: "13", telephone: "04 91 73 88 20", email: "calanques@residence-marseille.fr", places_disponibles: 5, tarif_jour: 79 },
    { id: 10, nom: "EHPAD Provence Senior", adresse: "3 rue de la Canebière", ville: "Marseille 1er", code_postal: "13001", departement: "13", telephone: "04 91 30 45 67", email: "provence-senior@ehpad.fr", places_disponibles: 1, tarif_jour: 95 },
  ],
  "33": [
    { id: 11, nom: "Les Vignes d'Or", adresse: "8 allée des Vignes", ville: "Bordeaux", code_postal: "33000", departement: "33", telephone: "05 56 44 77 88", email: "vignes-or@ehpad33.fr", places_disponibles: 4, tarif_jour: 86 },
    { id: 12, nom: "Résidence Garonne", adresse: "27 quai de la Garonne", ville: "Bordeaux", code_postal: "33800", departement: "33", telephone: "05 57 83 21 40", email: "garonne@residence-bordeaux.fr", places_disponibles: 3, tarif_jour: 92 },
  ],
  "06": [
    { id: 13, nom: "Villa Azur", adresse: "32 promenade des Anglais", ville: "Nice", code_postal: "06000", departement: "06", telephone: "04 93 87 54 21", email: "villa-azur@ehpad06.fr", places_disponibles: 2, tarif_jour: 115 },
    { id: 14, nom: "Résidence Côte d'Azur", adresse: "16 boulevard Gambetta", ville: "Nice", code_postal: "06000", departement: "06", telephone: "04 93 22 78 90", email: "cote-azur@residence-nice.fr", places_disponibles: 4, tarif_jour: 108 },
  ],
  "31": [
    { id: 15, nom: "Les Capitouls", adresse: "5 rue des Capitouls", ville: "Toulouse", code_postal: "31000", departement: "31", telephone: "05 61 23 45 67", email: "capitouls@ehpad31.fr", places_disponibles: 6, tarif_jour: 80 },
    { id: 16, nom: "Résidence Garonne Midi", adresse: "88 allée de Barcelone", ville: "Toulouse", code_postal: "31000", departement: "31", telephone: "05 61 88 34 56", email: "garonne-midi@ehpad.fr", places_disponibles: 3, tarif_jour: 85 },
  ],
  "59": [
    { id: 17, nom: "Villa du Nord", adresse: "14 rue Nationale", ville: "Lille", code_postal: "59000", departement: "59", telephone: "03 20 55 43 21", email: "villa-nord@ehpad59.fr", places_disponibles: 5, tarif_jour: 75 },
    { id: 18, nom: "Résidence Flandres", adresse: "6 avenue du Peuple Belge", ville: "Lille", code_postal: "59800", departement: "59", telephone: "03 20 66 77 88", email: "flandres@residence-lille.fr", places_disponibles: 2, tarif_jour: 82 },
  ],
  "67": [
    { id: 19, nom: "Résidence Alsace Senior", adresse: "12 quai des Bateliers", ville: "Strasbourg", code_postal: "67000", departement: "67", telephone: "03 88 32 45 67", email: "alsace-senior@ehpad67.fr", places_disponibles: 3, tarif_jour: 88 },
    { id: 20, nom: "Villa Kléber", adresse: "2 place Kléber", ville: "Strasbourg", code_postal: "67000", departement: "67", telephone: "03 88 78 90 12", email: "villa-kleber@ehpad.fr", places_disponibles: 4, tarif_jour: 92 },
  ],
};

const DEFAULT_EHPADS = [
  { id: 99, nom: "Résidence Le Beau Séjour", adresse: "1 rue de la Mairie", ville: "Votre commune", code_postal: "", departement: "XX", telephone: "Contactez-nous", email: "info@smartseniors.fr", places_disponibles: null, tarif_jour: null },
];

function extractDepartement(localite) {
  if (!localite) return null;
  const codePostal = localite.match(/\b(\d{2})\d{3}\b/);
  if (codePostal) return codePostal[1];
  const startDigits = localite.trim().match(/^(\d{2})/);
  if (startDigits) return startDigits[1];
  const cityMap = {
    paris: "75", lyon: "69", marseille: "13", bordeaux: "33",
    nice: "06", toulouse: "31", lille: "59", strasbourg: "67",
    nantes: "44", rennes: "35", montpellier: "34", brest: "29",
    grenoble: "38", dijon: "21", nancy: "54", reims: "51",
    toulon: "83", angers: "49", clermont: "63",
  };
  const lower = localite.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [city, dept] of Object.entries(cityMap)) {
    if (lower.includes(city)) return dept;
  }
  return null;
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

  const departement = extractDepartement(localite);

  let ehpads;
  if (departement && env.DB) {
    try {
      const result = await env.DB.prepare(
        "SELECT * FROM ehpads WHERE departement = ? ORDER BY nom LIMIT 10"
      ).bind(departement).all();
      ehpads = result.results && result.results.length > 0 ? result.results : (MOCK_EHPADS[departement] || DEFAULT_EHPADS);
    } catch {
      ehpads = MOCK_EHPADS[departement] || DEFAULT_EHPADS;
    }
  } else {
    ehpads = departement ? (MOCK_EHPADS[departement] || DEFAULT_EHPADS) : DEFAULT_EHPADS;
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

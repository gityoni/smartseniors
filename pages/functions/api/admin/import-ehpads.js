/**
 * SmartSeniors — POST /api/admin/import-ehpads
 * Import en masse des EHPAD partenaires depuis un JSON
 *
 * Sécurisé par la variable d'env ADMIN_SECRET (Cloudflare Pages)
 *
 * Body JSON :
 * {
 *   secret: "votre_secret",
 *   mode: "append" | "replace",   // replace = vide la table avant import
 *   ehpads: [
 *     {
 *       nom, adresse, ville, code_postal, departement,
 *       telephone, email, places_disponibles, tarif_jour
 *     }, ...
 *   ]
 * }
 */

function extractDept(cp) {
  if (!cp) return null;
  const c = String(cp).trim().replace(/\s/g, '');
  if (c.length === 5 && /^\d{5}$/.test(c)) return c.substring(0, 2);
  if (/^\d{2}$/.test(c)) return c;
  return null;
}

function sqlEscape(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''").trim()}'`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } }); }

  // Auth
  const secret = env.ADMIN_SECRET || 'smartseniors-admin-2024';
  if (body.secret !== secret) {
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Base de données non disponible.' }), { status: 503, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  const ehpads = Array.isArray(body.ehpads) ? body.ehpads : [];
  if (ehpads.length === 0) {
    return new Response(JSON.stringify({ error: 'Aucun EHPAD fourni.' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  const mode = body.mode === 'replace' ? 'replace' : 'append';
  let inserted = 0, skipped = 0, errors = [];

  try {
    // Mode replace : vide la table
    if (mode === 'replace') {
      await env.DB.prepare('DELETE FROM ehpads').run();
    }

    // Insert en batch
    for (const e of ehpads) {
      const nom  = String(e.nom || '').trim();
      const email = String(e.email || '').trim();
      const tel   = String(e.telephone || '').trim();

      if (!nom || (!email && !tel)) { skipped++; continue; }

      const ville = String(e.ville || 'Non précisé').trim();
      const cp    = String(e.code_postal || '').trim();
      const dept  = String(e.departement || extractDept(cp) || '').trim();

      if (!dept) { skipped++; errors.push(`Département manquant : ${nom}`); continue; }

      try {
        await env.DB.prepare(
          `INSERT INTO ehpads (nom, adresse, ville, code_postal, departement, telephone, email, places_disponibles, tarif_jour)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          nom,
          String(e.adresse || '').trim() || null,
          ville, cp || null, dept,
          tel || null, email || null,
          parseInt(e.places_disponibles) || null,
          parseFloat(e.tarif_jour) || null
        ).run();
        inserted++;
      } catch (err) {
        errors.push(`Erreur insert ${nom} : ${err.message}`);
        skipped++;
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  return new Response(JSON.stringify({
    success: true,
    mode,
    inserted,
    skipped,
    errors: errors.slice(0, 20),
  }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

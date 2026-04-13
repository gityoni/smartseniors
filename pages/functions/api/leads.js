/**
 * SmartSeniors — POST /api/leads
 * 1. Sauvegarde le lead en D1
 * 2. Récupère les EHPAD partenaires du département
 * 3. Envoie un email de lead à chaque EHPAD via MailChannels
 */

// ── Labels lisibles ──────────────────────────────────────────────
const TYPE_LABEL = {
  ehpad_medicalise: 'EHPAD médicalisé',
  alzheimer:        'Spécialisé Alzheimer',
  autonomie:        'Résidence Autonomie',
  senior:           'Résidence Sénior',
  autre:            'Autre type',
  inconnu:          'Non précisé',
};
const DELAI_LABEL = {
  urgent:      'Dès que possible ⚡',
  '1_mois':    'Dans 1 mois',
  '1_3_mois':  'Entre 1 et 3 mois',
  '3_6_mois':  'Entre 3 et 6 mois',
  '6_mois_plus': 'Plus de 6 mois',
  inconnu:     'Non précisé',
};
const GIR_LABEL = {
  autonome:        'Autonome — GIR 5-6',
  semi_dependant:  'Semi-dépendant — GIR 3-4',
  tres_dependant:  'Très dépendant — GIR 1-2',
};
const SITUATION_LABEL = {
  domicile:         'Domicile',
  famille:          'Chez la famille',
  hopital:          'Hôpital / Clinique',
  autre_residence:  'Autre résidence',
  autre:            'Autre',
};

// ── Extraction département depuis localite ────────────────────────
function extractDept(localite) {
  if (!localite) return null;
  const cp = localite.match(/\b(\d{2})\d{3}\b/);
  if (cp) return cp[1];
  const d2 = localite.trim().match(/^(\d{2})/);
  if (d2) return d2[1];
  const map = {
    paris:'75', lyon:'69', marseille:'13', bordeaux:'33',
    nice:'06', toulouse:'31', lille:'59', strasbourg:'67',
    nantes:'44', rennes:'35', montpellier:'34', grenoble:'38',
  };
  const l = localite.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [city, dept] of Object.entries(map)) {
    if (l.includes(city)) return dept;
  }
  return null;
}

// ── Calcul âge depuis date de naissance ──────────────────────────
function calcAge(dateStr) {
  if (!dateStr) return null;
  const dob = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age > 0 ? age : null;
}

// ── Template email HTML pour les EHPAD partenaires ───────────────
function buildLeadEmail(lead, ehpadNom) {
  const typeRes   = TYPE_LABEL[lead.type_residence]   || lead.type_residence || 'Non précisé';
  const delai     = DELAI_LABEL[lead.delai]            || lead.delai         || 'Non précisé';
  const gir       = GIR_LABEL[lead.niveau_autonomie]  || lead.niveau_autonomie || 'Non précisé';
  const situation = SITUATION_LABEL[lead.situation_actuelle] || lead.situation_actuelle || 'Non précisé';
  const age       = lead.age_proche || (lead.date_naissance_proche ? calcAge(lead.date_naissance_proche) : null);
  const scoreBar  = '★'.repeat(Math.min(Math.round((lead.score_urgence || 0) / 2), 5)) + '☆'.repeat(Math.max(0, 5 - Math.round((lead.score_urgence || 0) / 2)));

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><style>
  body{font-family:Arial,sans-serif;background:#f5f0eb;margin:0;padding:0;}
  .wrap{max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1);}
  .header{background:linear-gradient(135deg,#3D2B1F,#5c3d28);padding:28px 32px;}
  .header h1{color:#EDE5D8;margin:0;font-size:1.3rem;}
  .header p{color:rgba(237,229,216,.6);margin:6px 0 0;font-size:.9rem;}
  .score-badge{display:inline-block;background:linear-gradient(135deg,#D4824A,#EAA070);color:#fff;border-radius:20px;padding:5px 14px;font-size:.85rem;font-weight:700;margin-top:10px;}
  .body{padding:28px 32px;}
  .section{margin-bottom:24px;}
  .section-title{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#D4824A;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #f0e8df;}
  .row{display:flex;gap:8px;margin-bottom:8px;align-items:baseline;}
  .lbl{font-size:.78rem;color:#9c8578;min-width:160px;flex-shrink:0;}
  .val{font-size:.88rem;color:#3D2B1F;font-weight:600;}
  .val.big{font-size:1rem;font-weight:700;}
  .val.urgent{color:#D4824A;}
  .cta{display:block;background:linear-gradient(135deg,#D4824A,#EAA070);color:#fff;text-decoration:none;text-align:center;border-radius:10px;padding:15px 24px;font-size:1rem;font-weight:700;margin:24px 0 0;}
  .footer{background:#f5f0eb;padding:16px 32px;font-size:.72rem;color:#9c8578;text-align:center;}
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🏠 Nouveau prospect SmartSeniors</h1>
    <p>Un famille cherche un établissement dans votre secteur</p>
    <div class="score-badge">Score urgence : ${lead.score_urgence || 0}/10 — ${scoreBar}</div>
  </div>
  <div class="body">

    <div class="section">
      <div class="section-title">Personne âgée</div>
      <div class="row"><span class="lbl">Nom complet</span><span class="val big">${lead.prenom_proche || '—'} ${lead.nom_proche || '—'}</span></div>
      ${lead.date_naissance_proche ? `<div class="row"><span class="lbl">Date de naissance</span><span class="val">${new Date(lead.date_naissance_proche).toLocaleDateString('fr-FR')}</span></div>` : ''}
      ${age ? `<div class="row"><span class="lbl">Âge</span><span class="val">${age} ans</span></div>` : ''}
      <div class="row"><span class="lbl">Genre</span><span class="val">${lead.genre_proche === 'femme' ? 'Femme' : lead.genre_proche === 'homme' ? 'Homme' : '—'}</span></div>
      <div class="row"><span class="lbl">Niveau d'autonomie</span><span class="val">${gir}</span></div>
      <div class="row"><span class="lbl">Situation actuelle</span><span class="val">${situation}</span></div>
      ${lead.ville_proche_actuelle ? `<div class="row"><span class="lbl">Ville actuelle</span><span class="val">${lead.ville_proche_actuelle}</span></div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Recherche</div>
      <div class="row"><span class="lbl">Type de résidence</span><span class="val">${typeRes}</span></div>
      <div class="row"><span class="lbl">Localisation souhaitée</span><span class="val">${lead.ville_recherche || '—'} (rayon ${lead.rayon_km || 20} km)</span></div>
      <div class="row"><span class="lbl">Délai d'entrée</span><span class="val urgent">${delai}</span></div>
      ${lead.budget_mensuel ? `<div class="row"><span class="lbl">Budget mensuel</span><span class="val">${lead.budget_mensuel.replace(/_/g,' ').replace('moins 2000','Moins de 2 000 €').replace('2000 3000','2 000 – 3 000 €').replace('3000 plus','Plus de 3 000 €')}</span></div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Contact famille — À appeler EN PRIORITÉ</div>
      <div class="row"><span class="lbl">Nom</span><span class="val big">${lead.contact_prenom || ''} ${lead.contact_nom || '—'}</span></div>
      <div class="row"><span class="lbl">Téléphone</span><span class="val big" style="color:#D4824A;">📞 ${lead.contact_telephone || '—'}</span></div>
      <div class="row"><span class="lbl">Email</span><span class="val">✉️ ${lead.contact_email || '—'}</span></div>
    </div>

    <a class="cta" href="mailto:${lead.contact_email || ''}?subject=Suite à votre demande EHPAD SmartSeniors&body=Bonjour ${lead.contact_prenom || ''},">
      ✉️ Répondre à la famille maintenant
    </a>

  </div>
  <div class="footer">
    Lead généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})} via SmartSeniors.fr<br>
    Ce lead vous est transmis en exclusivité pour votre établissement : ${ehpadNom}
  </div>
</div>
</body></html>`;
}

// ── Envoi email via MailChannels ──────────────────────────────────
async function sendLeadEmail(toEmail, toNom, lead) {
  const html = buildLeadEmail(lead, toNom);
  const typeRes = TYPE_LABEL[lead.type_residence] || 'EHPAD';
  const delai   = DELAI_LABEL[lead.delai] || '';
  const subject = `🏠 Nouveau lead SmartSeniors — ${lead.prenom_proche || 'Prospect'} ${lead.nom_proche || ''} — ${typeRes} à ${lead.ville_recherche || ''}${delai === 'Dès que possible ⚡' ? ' — URGENT ⚡' : ''}`;

  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail, name: toNom }] }],
      from: { email: 'leads@smartseniors.fr', name: 'SmartSeniors — Leads' },
      subject,
      content: [
        { type: 'text/plain', value: `Nouveau prospect SmartSeniors\n\nPersonne âgée : ${lead.prenom_proche || ''} ${lead.nom_proche || ''}\nDate de naissance : ${lead.date_naissance_proche || '—'}\nNiveau autonomie : ${GIR_LABEL[lead.niveau_autonomie] || '—'}\n\nRecherche : ${typeRes} à ${lead.ville_recherche || '—'}\nDélai : ${DELAI_LABEL[lead.delai] || '—'}\n\nContact famille :\nNom : ${lead.contact_prenom || ''} ${lead.contact_nom || ''}\nTél : ${lead.contact_telephone || '—'}\nEmail : ${lead.contact_email || '—'}` },
        { type: 'text/html', value: html },
      ],
    }),
  });
  return res.ok;
}

// ── Handler principal ─────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const s = (v, max = 200) => String(v || '').trim().substring(0, max);

  // Calcul âge si date de naissance fournie
  const dnp = s(body.date_naissance_proche, 10);
  const ageCalc = dnp ? calcAge(dnp) : (parseInt(body.age_proche) || null);

  const lead = {
    contact_nom:            s(body.contact_nom || body.nom, 100),
    contact_prenom:         s(body.contact_prenom || body.prenom, 100),
    contact_telephone:      s(body.contact_telephone || body.telephone, 30),
    contact_email:          s(body.contact_email || body.email, 200),
    type_residence:         s(body.type_residence, 50),
    lien_proche:            s(body.lien_proche, 50),
    delai:                  s(body.delai, 50),
    ville_recherche:        s(body.ville_recherche || body.ville || body.localite, 200),
    departement:            s(body.departement || extractDept(body.ville_recherche || body.ville || body.localite), 10),
    rayon_km:               parseInt(body.rayon_km) || 20,
    budget_mensuel:         s(body.budget_mensuel, 50),
    nb_personnes:           parseInt(body.nb_personnes) || 1,
    genre_proche:           s(body.genre_proche, 10),
    prenom_proche:          s(body.prenom_proche, 100),
    nom_proche:             s(body.nom_proche, 100),
    situation_actuelle:     s(body.situation_actuelle, 50),
    date_naissance_proche:  dnp,
    age_proche:             ageCalc,
    niveau_autonomie:       s(body.niveau_autonomie, 50),
    ville_proche_actuelle:  s(body.ville_proche_actuelle, 200),
    score_urgence:          parseInt(body.score_urgence) || 0,
    statut:                 s(body.statut || 'nouveau', 20),
    source:                 s(body.source || 'funnel', 50),
    nb_etapes_completees:   parseInt(body.nb_etapes_completees) || 0,
    localite:               s(body.localite || body.ville, 200),
    created_at:             new Date().toISOString(),
  };

  if (!lead.contact_telephone && !lead.contact_email) {
    return new Response(JSON.stringify({ error: 'Téléphone ou email requis.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // 1. Sauvegarde D1
  let id = null;
  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        INSERT INTO leads (
          contact_nom, contact_prenom, contact_telephone, contact_email,
          type_residence, lien_proche, delai,
          ville_recherche, departement, rayon_km, budget_mensuel,
          nb_personnes, genre_proche, prenom_proche, nom_proche,
          situation_actuelle, date_naissance_proche, age_proche,
          niveau_autonomie, ville_proche_actuelle,
          score_urgence, statut, source, nb_etapes_completees, localite, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        lead.contact_nom, lead.contact_prenom, lead.contact_telephone, lead.contact_email,
        lead.type_residence, lead.lien_proche, lead.delai,
        lead.ville_recherche, lead.departement, lead.rayon_km, lead.budget_mensuel,
        lead.nb_personnes, lead.genre_proche, lead.prenom_proche, lead.nom_proche,
        lead.situation_actuelle, lead.date_naissance_proche, lead.age_proche,
        lead.niveau_autonomie, lead.ville_proche_actuelle,
        lead.score_urgence, lead.statut, lead.source, lead.nb_etapes_completees,
        lead.localite, lead.created_at
      ).run();
      id = result.meta?.last_row_id ?? null;
    } catch (e) {
      console.error('D1 insert error:', e);
    }
  }

  // 2. Envoi email aux EHPAD partenaires du département
  //    Ne s'exécute que pour les leads "complets" (étapes > 10)
  const emailsSent = [];
  if (lead.nb_etapes_completees >= 10 && lead.departement) {
    let partnerEhpads = [];

    // Récupérer les EHPAD du département depuis D1
    if (env.DB) {
      try {
        const res = await env.DB.prepare(
          'SELECT nom, email FROM ehpads WHERE departement = ? AND email IS NOT NULL AND email != ""'
        ).bind(lead.departement).all();
        partnerEhpads = res.results || [];
      } catch (e) {
        console.error('D1 ehpad query error:', e);
      }
    }

    // Envoi en parallèle à tous les EHPAD partenaires
    const sendPromises = partnerEhpads.map(async (ehpad) => {
      try {
        const ok = await sendLeadEmail(ehpad.email, ehpad.nom, lead);
        if (ok) emailsSent.push(ehpad.nom);
      } catch (e) {
        console.error(`Email error for ${ehpad.nom}:`, e);
      }
    });

    // Envoi aussi au backoffice SmartSeniors (notification interne)
    const backofficeEmail = env.BACKOFFICE_EMAIL || 'leads@smartseniors.fr';
    sendPromises.push(
      sendLeadEmail(backofficeEmail, 'SmartSeniors Backoffice', lead)
        .catch(e => console.error('Backoffice email error:', e))
    );

    await Promise.all(sendPromises);
  }

  return new Response(JSON.stringify({
    success: true,
    id,
    emails_sent: emailsSent.length,
    lead,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

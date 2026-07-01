-- SmartSeniors — Cloudflare D1 Schema

CREATE TABLE IF NOT EXISTS leads (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Contact famille (rapide, pane 3)
  contact_nom           TEXT,
  contact_prenom        TEXT,
  contact_telephone     TEXT,
  contact_email         TEXT,
  -- Qualification funnel
  type_residence        TEXT,   -- ehpad_medicalise|alzheimer|autonomie|senior|autre|inconnu
  lien_proche           TEXT,   -- parent|conjoint|grand_parent|moi_meme|ass_sociale|autre
  delai                 TEXT,   -- urgent|1_mois|1_3_mois|3_6_mois|6_mois_plus|inconnu
  -- Établissement recherché
  ville_recherche       TEXT,
  departement           TEXT,
  rayon_km              INTEGER DEFAULT 20,
  -- Budget
  budget_mensuel        TEXT,   -- moins_2000|2000_3000|3000_plus|inconnu
  -- Personne âgée
  nb_personnes          INTEGER DEFAULT 1,
  genre_proche          TEXT,   -- homme|femme
  prenom_proche         TEXT,
  nom_proche            TEXT,
  situation_actuelle    TEXT,   -- domicile|famille|hopital|autre_residence|autre
  date_naissance_proche TEXT,   -- format YYYY-MM-DD (obligatoire dossier admission + APA)
  age_proche            INTEGER, -- calculé auto depuis date_naissance_proche
  niveau_autonomie      TEXT,   -- autonome|semi_dependant|tres_dependant
  ville_proche_actuelle TEXT,
  -- Scoring
  score_urgence         INTEGER DEFAULT 0,
  statut                TEXT DEFAULT 'nouveau', -- chaud|tiede|froid|nouveau
  source                TEXT DEFAULT 'funnel',
  nb_etapes_completees  INTEGER DEFAULT 0,
  -- Legacy compat
  localite              TEXT,
  -- Meta
  created_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ehpads (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nom                 TEXT    NOT NULL,
  adresse             TEXT,
  ville               TEXT    NOT NULL,
  code_postal         TEXT,
  departement         TEXT    NOT NULL,
  telephone           TEXT,
  email               TEXT,
  places_disponibles  INTEGER,
  tarif_jour          REAL,
  created_at          TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created  ON leads  (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_statut   ON leads  (statut);
CREATE INDEX IF NOT EXISTS idx_ehpads_dept    ON ehpads (departement);

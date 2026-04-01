-- SmartSeniors — Cloudflare D1 Schema

CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom      TEXT    NOT NULL,
  nom         TEXT    NOT NULL,
  date_naissance TEXT NOT NULL,
  localite    TEXT    NOT NULL,
  departement TEXT,
  created_at  TEXT    DEFAULT (datetime('now'))
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
CREATE INDEX IF NOT EXISTS idx_ehpads_dept    ON ehpads (departement);

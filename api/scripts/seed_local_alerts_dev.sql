-- Local dev seed for the PRISM alerts DB (anticipatory_action_alerts, kobo_users, alert).
-- Run from api/: poetry run python scripts/seed_alerts_db.py (after alembic upgrade head).
-- Idempotent: kobo_users uses ON CONFLICT; AA rows only insert if missing for country+type;
-- seed alerts replace rows with the fixed seed emails.

-- Anticipatory action (Mozambique) — skip if that country+type already exists
INSERT INTO anticipatory_action_alerts (country, emails, prism_url, type)
SELECT
  'Mozambique',
  ARRAY['email1@example.com']::varchar[],
  'https://prism.moz.wfp.org',
  'storm'::anticipatory_action_alerts_type_enum
WHERE NOT EXISTS (
  SELECT 1
  FROM anticipatory_action_alerts a
  WHERE
    a.country = 'Mozambique'
    AND a.type = 'storm'::anticipatory_action_alerts_type_enum
);

INSERT INTO anticipatory_action_alerts (country, emails, prism_url, type, metadata)
SELECT
  'Mozambique',
  ARRAY['email1@example.com']::varchar[],
  'https://prism.moz.wfp.org',
  'flood'::anticipatory_action_alerts_type_enum,
  '{"floodDatesUrl": "https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM anticipatory_action_alerts a
  WHERE
    a.country = 'Mozambique'
    AND a.type = 'flood'::anticipatory_action_alerts_type_enum
);

UPDATE anticipatory_action_alerts
SET metadata = '{"floodDatesUrl": "https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json"}'::jsonb
WHERE type = 'flood'::anticipatory_action_alerts_type_enum
  AND country ILIKE 'mozambique'
  AND metadata IS NULL;

-- Starlette Admin / API smoke tests: seed user (plain-text password when salt = 'false')
INSERT INTO kobo_users (
  username, password, salt, access, email, deployment, organization, details, created_at
)
VALUES (
  'local_dev_user',
  'localdev',
  'false',
  '{"province": "01"}'::jsonb,
  'local-dev@example.com',
  'local',
  'WFP',
  'Seed user for local testing',
  NOW()
)
ON CONFLICT (username) DO NOTHING;

-- Replace seed alerts so re-runs do not duplicate
DELETE FROM alert
WHERE email IN ('seed-alert-1@example.com', 'seed-alert-2@example.com');

INSERT INTO alert (
  email, prism_url, alert_name, alert_config, min, max, zones, active,
  created_at, updated_at, last_triggered
)
VALUES (
  'seed-alert-1@example.com',
  'https://prism.moz.wfp.org',
  'Seed rainfall threshold',
  '{"id": "rfh_dekad", "type": "wms", "title": "Rainfall", "serverLayerName": "rfh_dekad", "baseUrl": "https://api.earthobservation.vam.wfp.org/ows/", "wcsConfig": {}}'::jsonb,
  50,
  200,
  '{"type": "FeatureCollection", "name": "zones", "features": []}'::jsonb,
  true,
  NOW(),
  NOW(),
  TIMESTAMP '2026-01-15 10:00:00'
),
(
  'seed-alert-2@example.com',
  'https://prism.moz.wfp.org',
  'Seed inactive alert',
  '{"id": "test-layer", "type": "wms", "title": "Test layer", "serverLayerName": "layer", "baseUrl": "https://example.org/ows/", "wcsConfig": {}}'::jsonb,
  1,
  10,
  NULL,
  false,
  NOW(),
  NOW(),
  NULL
);

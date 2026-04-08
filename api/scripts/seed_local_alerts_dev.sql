-- Local dev seed for the PRISM alerts DB (anticipatory_action_alerts, user_info, alert,
-- plus CIAM-mapped users + permission grants).
-- Run from api/: poetry run python scripts/seed_alerts_db.py (after alembic upgrade head).
-- Idempotent: user_info uses ON CONFLICT; AA rows only insert if missing for country+type;
-- seed alerts replace rows with the fixed seed emails; users use ON CONFLICT (ciam_sub);
-- user_permissions use ON CONFLICT on the composite primary key.

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

INSERT INTO anticipatory_action_alerts (country, emails, prism_url, type)
SELECT
  'Mozambique',
  ARRAY['email1@example.com']::varchar[],
  'https://prism.moz.wfp.org',
  'flood'::anticipatory_action_alerts_type_enum
WHERE NOT EXISTS (
  SELECT 1
  FROM anticipatory_action_alerts a
  WHERE
    a.country = 'Mozambique'
    AND a.type = 'flood'::anticipatory_action_alerts_type_enum
);

-- Starlette Admin / API smoke tests: seed user (plain-text password when salt = 'false')
INSERT INTO user_info (
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

-- OIDC dev placeholders: replace `ciam_sub` with real CIAM `sub` values when testing login.
-- Regular user: only `prism.app`. Admin user: `prism.app` + `prism.admin`.
INSERT INTO users (ciam_sub, email, name, status)
VALUES (
    'local-seed|regular',
    'seed-regular@example.com',
    'Seed regular user',
    'active'::prism_user_status
), (
    'local-seed|admin',
    'seed-admin@example.com',
    'Seed admin user',
    'active'::prism_user_status
)
ON CONFLICT (ciam_sub) DO NOTHING;

INSERT INTO user_permissions (user_id, permission_id)
SELECT u.id, p.id
FROM users u
CROSS JOIN permissions p
WHERE
    u.ciam_sub = 'local-seed|regular'
    AND p.code = 'prism.app'
ON CONFLICT (user_id, permission_id) DO NOTHING;

INSERT INTO user_permissions (user_id, permission_id)
SELECT u.id, p.id
FROM users u
CROSS JOIN permissions p
WHERE
    u.ciam_sub = 'local-seed|admin'
    AND p.code IN ('prism.app', 'prism.admin')
ON CONFLICT (user_id, permission_id) DO NOTHING;

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

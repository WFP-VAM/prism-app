-- Local dev seed for the PRISM alerts DB (anticipatory_action_alerts, kobo_users, alert).
-- Run from api/: poetry run python scripts/seed_alerts_db.py (after alembic upgrade head).
-- Idempotent: kobo_users uses ON CONFLICT; AA rows only insert if missing for country+type;
-- seed alerts replace rows with the fixed seed emails.

-- ---------------------------------------------------------------------------
-- PRISM RBAC test users (fixed UUIDs b0000001…b000000c; auth_provider = ciam)
-- Matrix: aa / dashboard / scheduled_map / admin × cambodia / malawi / mozambique
-- Re-run replaces their user_permissions rows (see DELETE below).
-- Use with PRISM_ADMIN_AUTH_DISABLED=true and PRISM_DEV_USER_ID=<uuid> to impersonate.
-- ---------------------------------------------------------------------------
DELETE FROM user_permissions
WHERE user_id IN (
  'b0000001-0000-4000-8000-000000000001'::uuid,
  'b0000002-0000-4000-8000-000000000002'::uuid,
  'b0000003-0000-4000-8000-000000000003'::uuid,
  'b0000004-0000-4000-8000-000000000004'::uuid,
  'b0000005-0000-4000-8000-000000000005'::uuid,
  'b0000006-0000-4000-8000-000000000006'::uuid,
  'b0000007-0000-4000-8000-000000000007'::uuid,
  'b0000008-0000-4000-8000-000000000008'::uuid,
  'b0000009-0000-4000-8000-000000000009'::uuid,
  'b000000a-0000-4000-8000-00000000000a'::uuid,
  'b000000b-0000-4000-8000-00000000000b'::uuid,
  'b000000c-0000-4000-8000-00000000000c'::uuid
);

INSERT INTO users (id, ciam_sub, email, name, status, auth_provider)
VALUES
  ('b0000001-0000-4000-8000-000000000001'::uuid, 'seed-dev-cambodia-aa', 'seed-cambodia-aa@example.com', 'Seed Cambodia AA manager', 'active'::user_status, 'ciam'),
  ('b0000002-0000-4000-8000-000000000002'::uuid, 'seed-dev-cambodia-dashboard', 'seed-cambodia-dashboard@example.com', 'Seed Cambodia dashboard manager', 'active'::user_status, 'ciam'),
  ('b0000003-0000-4000-8000-000000000003'::uuid, 'seed-dev-cambodia-scheduled-map', 'seed-cambodia-scheduled-map@example.com', 'Seed Cambodia scheduled map manager', 'active'::user_status, 'ciam'),
  ('b0000004-0000-4000-8000-000000000004'::uuid, 'seed-dev-cambodia-admin', 'seed-cambodia-admin@example.com', 'Seed Cambodia admin', 'active'::user_status, 'ciam'),
  ('b0000005-0000-4000-8000-000000000005'::uuid, 'seed-dev-malawi-aa', 'seed-malawi-aa@example.com', 'Seed Malawi AA manager', 'active'::user_status, 'ciam'),
  ('b0000006-0000-4000-8000-000000000006'::uuid, 'seed-dev-malawi-dashboard', 'seed-malawi-dashboard@example.com', 'Seed Malawi dashboard manager', 'active'::user_status, 'ciam'),
  ('b0000007-0000-4000-8000-000000000007'::uuid, 'seed-dev-malawi-scheduled-map', 'seed-malawi-scheduled-map@example.com', 'Seed Malawi scheduled map manager', 'active'::user_status, 'ciam'),
  ('b0000008-0000-4000-8000-000000000008'::uuid, 'seed-dev-malawi-admin', 'seed-malawi-admin@example.com', 'Seed Malawi admin', 'active'::user_status, 'ciam'),
  ('b0000009-0000-4000-8000-000000000009'::uuid, 'seed-dev-mozambique-aa', 'seed-mozambique-aa@example.com', 'Seed Mozambique AA manager', 'active'::user_status, 'ciam'),
  ('b000000a-0000-4000-8000-00000000000a'::uuid, 'seed-dev-mozambique-dashboard', 'seed-mozambique-dashboard@example.com', 'Seed Mozambique dashboard manager', 'active'::user_status, 'ciam'),
  ('b000000b-0000-4000-8000-00000000000b'::uuid, 'seed-dev-mozambique-scheduled-map', 'seed-mozambique-scheduled-map@example.com', 'Seed Mozambique scheduled map manager', 'active'::user_status, 'ciam'),
  ('b000000c-0000-4000-8000-00000000000c'::uuid, 'seed-dev-mozambique-admin', 'seed-mozambique-admin@example.com', 'Seed Mozambique admin', 'active'::user_status, 'ciam')
ON CONFLICT (auth_provider, ciam_sub) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  status = EXCLUDED.status;

INSERT INTO user_permissions (user_id, permission_id, country)
SELECT u.id, p.id, grants.country
FROM (
  VALUES
    ('b0000001-0000-4000-8000-000000000001'::uuid, 'prism.aa_data.manage', 'cambodia'),
    ('b0000002-0000-4000-8000-000000000002'::uuid, 'prism.dashboard.manage', 'cambodia'),
    ('b0000003-0000-4000-8000-000000000003'::uuid, 'prism.map_exports.manage', 'cambodia'),
    ('b0000004-0000-4000-8000-000000000004'::uuid, 'prism.admin.access', '*'),
    ('b0000005-0000-4000-8000-000000000005'::uuid, 'prism.aa_data.manage', 'malawi'),
    ('b0000006-0000-4000-8000-000000000006'::uuid, 'prism.dashboard.manage', 'malawi'),
    ('b0000007-0000-4000-8000-000000000007'::uuid, 'prism.map_exports.manage', 'malawi'),
    ('b0000008-0000-4000-8000-000000000008'::uuid, 'prism.admin.access', '*'),
    ('b0000009-0000-4000-8000-000000000009'::uuid, 'prism.aa_data.manage', 'mozambique'),
    ('b000000a-0000-4000-8000-00000000000a'::uuid, 'prism.dashboard.manage', 'mozambique'),
    ('b000000b-0000-4000-8000-00000000000b'::uuid, 'prism.map_exports.manage', 'mozambique'),
    ('b000000c-0000-4000-8000-00000000000c'::uuid, 'prism.admin.access', '*')
) AS grants (user_id, permission_code, country)
JOIN users u ON u.id = grants.user_id
JOIN permissions p ON p.code = grants.permission_code
ON CONFLICT (user_id, permission_id, country) DO NOTHING;

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

-- ---------------------------------------------------------------------------
-- Map export schedules (fixed UUIDs a0000001…a0000005; names prefixed [Seed])
-- export_url targets the local frontend (yarn start → :3000), not the API.
-- The export worker rewrites localhost:3000 → host.docker.internal:3000.
-- Requires frontend/.env REACT_APP_API_URL=http://host.docker.internal
-- QA: make schedule-cron-dry-run  then  make schedule-cron
-- ---------------------------------------------------------------------------
DELETE FROM map_export_jobs
WHERE map_export_schedule_id IN (
  'a0000001-0000-4000-8000-000000000001'::uuid,
  'a0000002-0000-4000-8000-000000000002'::uuid,
  'a0000003-0000-4000-8000-000000000003'::uuid,
  'a0000004-0000-4000-8000-000000000004'::uuid,
  'a0000005-0000-4000-8000-000000000005'::uuid
);

DELETE FROM map_export_schedules
WHERE id IN (
  'a0000001-0000-4000-8000-000000000001'::uuid,
  'a0000002-0000-4000-8000-000000000002'::uuid,
  'a0000003-0000-4000-8000-000000000003'::uuid,
  'a0000004-0000-4000-8000-000000000004'::uuid,
  'a0000005-0000-4000-8000-000000000005'::uuid
);

INSERT INTO map_export_schedules (
  id,
  name,
  status,
  country,
  layer_id,
  admin_areas,
  cadence,
  dekad_interval,
  export_url,
  format,
  export_options,
  last_enqueued_date,
  created_at,
  updated_at
)
VALUES
  (
    'a0000001-0000-4000-8000-000000000001'::uuid,
    '[Seed] Will enqueue — PDF dekad rainfall',
    'active',
    'mozambique',
    'precip_blended_dekad',
    '',
    'every_n_dekads',
    1,
    'http://localhost:3000/export?date={date}&hazardLayerIds={layer_id}&bounds=22.29870619747473,-27.069605632989003,43.18421533413513,-10.19032408008239&zoom=4.976245242978448&aspectRatio=Auto&title=Mozambique%3A+%7Bdate_coverage%7D&fullLayerDescription=true&bottomLogoVisibility=false',
    'pdf',
    '{"viewportWidth": 1200, "viewportHeight": 1028}'::jsonb,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'a0000002-0000-4000-8000-000000000002'::uuid,
    '[Seed] Skips — already up to date',
    'active',
    'mozambique',
    'precip_blended_dekad',
    '',
    'every_n_dekads',
    1,
    'http://localhost:3000/export?date={date}&hazardLayerIds={layer_id}&bounds=22.29870619747473,-27.069605632989003,43.18421533413513,-10.19032408008239&zoom=4.976245242978448&aspectRatio=Auto&title=Mozambique%3A+%7Bdate_coverage%7D&fullLayerDescription=true&bottomLogoVisibility=false',
    'pdf',
    '{"viewportWidth": 1200, "viewportHeight": 1028}'::jsonb,
    '2099-12-31'::date,
    NOW(),
    NOW()
  ),
  (
    'a0000003-0000-4000-8000-000000000003'::uuid,
    '[Seed] Skips — no WMS layer data',
    'active',
    'mozambique',
    'seed_layer_with_no_wms_data',
    '',
    'monthly',
    1,
    'http://localhost:3000/export?date={date}&hazardLayerIds={layer_id}&bounds=22.29870619747473,-27.069605632989003,43.18421533413513,-10.19032408008239&zoom=4.976245242978448&aspectRatio=Auto&title=Mozambique%3A+%7Bdate_coverage%7D&fullLayerDescription=true&bottomLogoVisibility=false',
    'pdf',
    '{"viewportWidth": 1200, "viewportHeight": 1028}'::jsonb,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'a0000004-0000-4000-8000-000000000004'::uuid,
    '[Seed] Stopped — cron ignores',
    'stopped',
    'mozambique',
    'precip_blended_dekad',
    '',
    'every_n_dekads',
    1,
    'http://localhost:3000/export?date={date}&hazardLayerIds={layer_id}&bounds=22.29870619747473,-27.069605632989003,43.18421533413513,-10.19032408008239&zoom=4.976245242978448&aspectRatio=Auto&title=Mozambique%3A+%7Bdate_coverage%7D&fullLayerDescription=true&bottomLogoVisibility=false',
    'pdf',
    '{"viewportWidth": 1200, "viewportHeight": 1028}'::jsonb,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'a0000005-0000-4000-8000-000000000005'::uuid,
    '[Seed] Will enqueue — PNG (ZIP download)',
    'active',
    'mozambique',
    'precip_blended_8m',
    '',
    'monthly',
    1,
    'http://localhost:3000/export?date={date}&hazardLayerIds={layer_id}&bounds=22.29870619747473,-27.069605632989003,43.18421533413513,-10.19032408008239&zoom=4.976245242978448&aspectRatio=Auto&title=Mozambique%3A+%7Bdate_coverage%7D&fullLayerDescription=true&bottomLogoVisibility=false',
    'png',
    '{"viewportWidth": 1200, "viewportHeight": 1028}'::jsonb,
    NULL,
    NOW(),
    NOW()
  );

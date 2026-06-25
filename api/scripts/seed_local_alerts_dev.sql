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

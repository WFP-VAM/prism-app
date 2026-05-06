-- Basic-auth user for map export job E2E (salt = false => plaintext password in auth.py).
-- Run after alembic upgrade against the same DB the API uses.

INSERT INTO user_info (username, password, salt, access, created_at)
VALUES (
    'e2e_map_export',
    'changeme',
    'false',
    '{}'::jsonb,
    NOW()
)
ON CONFLICT (username) DO UPDATE
SET password = EXCLUDED.password,
    salt = EXCLUDED.salt;

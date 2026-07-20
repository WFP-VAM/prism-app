"""Dev-only CLI: seed local rows into the alerts DB. Not part of the prism_app package or API.

Inserts anticipatory-action metadata, kobo_users, sample alerts, five
``[Seed]`` map export schedules (see ``seed_local_alerts_dev.sql``), and nine
country-scoped **PRISM RBAC test users** (aa / dashboard / scheduled_map for
cambodia, malawi, mozambique).

Map export QA schedules:

- ``a0000001`` — active; cron should enqueue a PDF job
- ``a0000002`` — active; skips (``last_enqueued_date`` already ahead of WMS data)
- ``a0000003`` — active; skips (layer id absent from WMS GetCapabilities)
- ``a0000004`` — stopped; cron ignores
- ``a0000005`` — active; cron should enqueue a PNG (ZIP) job

RBAC test users: see ``seed_local_alerts_dev.sql`` and api/README.md (UUIDs
``b0000001`` … ``b000000b``). Impersonate with ``PRISM_DEV_USER_ID`` when
``PRISM_ADMIN_AUTH_DISABLED=true``.

After seeding: ``make schedule-cron-dry-run`` then ``make schedule-cron``.
Requires ``yarn start`` (frontend on :3000) and ``REACT_APP_API_URL=http://host.docker.internal``
in ``frontend/.env`` so the worker browser can reach the API.
"""

from __future__ import annotations

import os
import sys
from os import getenv
from pathlib import Path
from urllib.parse import quote_plus

import psycopg2

_SEED_RBAC_USERS = (
    ("b0000001-0000-4000-8000-000000000001", "seed-cambodia-aa@example.com"),
    ("b0000002-0000-4000-8000-000000000002", "seed-cambodia-dashboard@example.com"),
    ("b0000003-0000-4000-8000-000000000003", "seed-cambodia-scheduled-map@example.com"),
    ("b0000005-0000-4000-8000-000000000005", "seed-malawi-aa@example.com"),
    ("b0000006-0000-4000-8000-000000000006", "seed-malawi-dashboard@example.com"),
    ("b0000007-0000-4000-8000-000000000007", "seed-malawi-scheduled-map@example.com"),
    ("b0000009-0000-4000-8000-000000000009", "seed-mozambique-aa@example.com"),
    ("b000000a-0000-4000-8000-00000000000a", "seed-mozambique-dashboard@example.com"),
    (
        "b000000b-0000-4000-8000-00000000000b",
        "seed-mozambique-scheduled-map@example.com",
    ),
)


def _api_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _alerts_db_uri() -> str:
    """Match prism_app.database.database.DB_URI without importing prism_app."""
    explicit = getenv("PRISM_ALERTS_DATABASE_URL")
    if explicit:
        return explicit
    password = getenv("POSTGRES_PASSWORD")
    if password is None:
        raise SystemExit(
            "Set PRISM_ALERTS_DATABASE_URL or POSTGRES_PASSWORD for the alerts database."
        )
    user = getenv("POSTGRES_USER", "postgres")
    host = getenv("POSTGRES_HOST", "host.docker.internal")
    port = getenv("POSTGRES_PORT", "54321")
    database = getenv("POSTGRES_DB", "postgres")
    return (
        f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{database}"
    )


def _load_api_dotenv() -> None:
    """Populate os.environ from api/.env if present (same rules as alembic/env.py)."""
    env_path = _api_root() / ".env"
    if not env_path.is_file():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key or key in os.environ:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ[key] = value


def main() -> None:
    _load_api_dotenv()

    sql_path = Path(__file__).resolve().parent / "seed_local_alerts_dev.sql"
    if not sql_path.is_file():
        print(f"Missing seed SQL: {sql_path}", file=sys.stderr)
        sys.exit(1)

    sql = sql_path.read_text()
    conn = psycopg2.connect(_alerts_db_uri())
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(f"Seeded alerts DB using {sql_path.name}")
    print("RBAC: 9 country-scoped test users (b0000001…b000000b). See api/README.md.")
    for user_id, email in _SEED_RBAC_USERS:
        print(f"  PRISM_DEV_USER_ID={user_id}  # {email}")
    print(
        "Map export QA: open Admin → Map export schedules ([Seed] rows), "
        "then run make schedule-cron-dry-run and make schedule-cron."
    )


if __name__ == "__main__":
    main()

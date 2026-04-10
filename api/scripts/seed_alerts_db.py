"""Dev-only CLI: seed local rows into the alerts DB. Not part of the prism_app package or API.

Executes ``seed_local_alerts_dev.sql``, which inserts:

- ``anticipatory_action_alerts`` (Mozambique storm + flood, if missing)
- ``user_info`` (local dev admin user; ON CONFLICT DO NOTHING)
- ``alert`` (two sample threshold rows; re-run replaces fixed seed emails)

See alerting/README.md and api/README.md (Local dev seed data).
"""

from __future__ import annotations

import os
import sys
from os import getenv
from pathlib import Path
from urllib.parse import quote_plus

import psycopg2


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


if __name__ == "__main__":
    main()

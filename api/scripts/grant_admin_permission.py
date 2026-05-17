"""Grant `prism.admin.access` to a specific PRISM user id.

Usage:
    poetry run python scripts/grant_admin_permission.py <user_id>
"""

from __future__ import annotations

import argparse
import os
import sys
from os import getenv
from pathlib import Path
from urllib.parse import quote_plus
from uuid import UUID

import psycopg2

ADMIN_ACCESS = "prism.admin.access"


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


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Grant prism.admin.access to a PRISM user id."
    )
    parser.add_argument("user_id", help="UUID from users.id")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    try:
        user_id = UUID(args.user_id)
    except ValueError:
        print(f"Invalid UUID: {args.user_id}", file=sys.stderr)
        sys.exit(2)

    _load_api_dotenv()

    conn = psycopg2.connect(_alerts_db_uri())
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, ciam_sub FROM users WHERE id = %s::uuid",
                (str(user_id),),
            )
            user_row = cur.fetchone()
            if user_row is None:
                print(f"User not found: {user_id}", file=sys.stderr)
                sys.exit(1)

            cur.execute(
                "SELECT id FROM permissions WHERE code = %s",
                (ADMIN_ACCESS,),
            )
            permission_row = cur.fetchone()
            if permission_row is None:
                print(
                    f"Permission code not found: {ADMIN_ACCESS}. "
                    "Run migrations/seeds first.",
                    file=sys.stderr,
                )
                sys.exit(1)

            permission_id = permission_row[0]
            cur.execute(
                """
                INSERT INTO user_permissions (user_id, permission_id)
                VALUES (%s::uuid, %s::uuid)
                ON CONFLICT (user_id, permission_id) DO NOTHING
                """,
                (str(user_id), str(permission_id)),
            )
            inserted = cur.rowcount > 0
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    user_email = user_row[1] or "(no email)"
    user_sub = user_row[2]
    if inserted:
        print(
            f"Granted {ADMIN_ACCESS} to user {user_id} "
            f"(email={user_email}, ciam_sub={user_sub})."
        )
    else:
        print(
            f"User {user_id} already has {ADMIN_ACCESS} "
            f"(email={user_email}, ciam_sub={user_sub})."
        )


if __name__ == "__main__":
    main()

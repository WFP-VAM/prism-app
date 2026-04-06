"""Alembic environment: PRISM alerts DB migrations (SQLModel metadata)."""

import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context


def _load_api_dotenv() -> None:
    """Populate os.environ from api/.env if present (Poetry/alembic does not load .env)."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
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


_load_api_dotenv()

# Register all table models on SQLModel.metadata
from prism_app.database.alert_model import AlertModel  # noqa: F401
from prism_app.database.anticipatory_action_alerts_model import (  # noqa: F401
    AnticipatoryActionAlerts,
)
from prism_app.database.database import DB_URI
from prism_app.database.permission_model import Permission, UserPermission  # noqa: F401
from prism_app.database.prism_user_model import PrismUser  # noqa: F401
from prism_app.database.user_info_model import UserInfoModel  # noqa: F401
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def get_url() -> str:
    """Alerts DB URL (same value as `prism_app.database.database.DB_URI`)."""
    return DB_URI


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section) or {}
    section = dict(section)
    section["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

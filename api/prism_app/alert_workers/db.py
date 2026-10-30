"""PostgreSQL access for alert tables (``PRISM_ALERTS_DATABASE_URL``)."""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Generator, Mapping

from prism_app.alert_workers import settings
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

_ALERT_SELECT = text(
    """
    SELECT id, email, prism_url, alert_name, alert_config, min, max, zones,
           active, created_at, updated_at, last_triggered
    FROM alert
    WHERE active = true
    """,
)

_UPDATE_LAST = text("UPDATE alert SET last_triggered = :ts WHERE id = :id")

_AA_SELECT = text(
    """
    SELECT id, country, type::text AS type, emails, prism_url,
           last_triggered_at, last_ran_at, last_states, metadata
    FROM anticipatory_action_alerts
    WHERE country ILIKE :country AND type = CAST(:atype AS anticipatory_action_alerts_type_enum)
    """,
)

_AA_SELECT_BY_TYPE = text(
    """
    SELECT id, country, type::text AS type, emails, prism_url,
           last_triggered_at, last_ran_at, last_states, metadata
    FROM anticipatory_action_alerts
    WHERE type = CAST(:atype AS anticipatory_action_alerts_type_enum)
    """,
)

_AA_UPDATE = text(
    """
    UPDATE anticipatory_action_alerts
    SET last_states = (:last_states)::jsonb,
        last_ran_at = :last_ran_at,
        last_triggered_at = COALESCE(:last_triggered_at, last_triggered_at)
    WHERE id = :id
    """,
)


def _connect_args(_url: str) -> dict:
    """Match ``alerting`` docker: ``POSTGRES_SSL=true`` → require TLS."""
    if os.environ.get("POSTGRES_SSL", "").lower() in ("1", "true", "yes"):
        return {"sslmode": "require"}
    return {}


def get_alerts_engine() -> Engine:
    url = settings.alerts_database_url()
    if not url:
        raise RuntimeError("PRISM_ALERTS_DATABASE_URL is not set")
    return create_engine(url, pool_pre_ping=True, connect_args=_connect_args(url))


@contextmanager
def alerts_session(engine: Engine | None = None) -> Generator[Any, None, None]:
    eng = engine or get_alerts_engine()
    conn = eng.connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_active_alerts(conn: Any) -> list[dict[str, Any]]:
    rows = conn.execute(_ALERT_SELECT).mappings().all()
    return [dict(r) for r in rows]


def update_alert_last_triggered(conn: Any, alert_id: int, ts: Any) -> None:
    conn.execute(_UPDATE_LAST, {"id": alert_id, "ts": ts})


def _normalize_aa_row(row: dict[str, Any]) -> dict[str, Any]:
    if row.get("last_states") and isinstance(row["last_states"], str):
        row["last_states"] = json.loads(row["last_states"])
    if row.get("metadata") and isinstance(row["metadata"], str):
        row["metadata"] = json.loads(row["metadata"])
    return row


def fetch_aa_alerts(conn: Any, country: str, atype: str) -> list[dict[str, Any]]:
    rows = (
        conn.execute(
            _AA_SELECT,
            {"country": country, "atype": atype},
        )
        .mappings()
        .all()
    )
    return [_normalize_aa_row(dict(r)) for r in rows]


def fetch_all_aa_alerts_by_type(conn: Any, atype: str) -> list[dict[str, Any]]:
    rows = (
        conn.execute(
            _AA_SELECT_BY_TYPE,
            {"atype": atype},
        )
        .mappings()
        .all()
    )
    return [_normalize_aa_row(dict(r)) for r in rows]


def update_aa_alert(
    conn: Any,
    *,
    alert_id: int,
    last_states: Mapping[str, Any],
    last_ran_at: Any,
    last_triggered_at: Any | None,
) -> None:
    conn.execute(
        _AA_UPDATE,
        {
            "id": alert_id,
            "last_states": json.dumps(dict(last_states)),
            "last_ran_at": last_ran_at,
            "last_triggered_at": last_triggered_at,
        },
    )

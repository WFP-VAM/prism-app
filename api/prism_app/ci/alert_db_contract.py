"""Alerts schema contract (was ``yarn check-alerts-db-contract``)."""

from __future__ import annotations

import os
import sys

from sqlalchemy import create_engine, text

ALERT_COLUMNS = {
    "id": ("integer", "int4"),
    "email": ("character varying", "varchar"),
    "prism_url": ("character varying", "varchar"),
    "alert_name": ("character varying", "varchar"),
    "alert_config": ("jsonb", "jsonb"),
    "min": ("integer", "int4"),
    "max": ("integer", "int4"),
    "zones": ("jsonb", "jsonb"),
    "active": ("boolean", "bool"),
    "created_at": ("timestamp without time zone", "timestamp"),
    "updated_at": ("timestamp without time zone", "timestamp"),
    "last_triggered": ("timestamp without time zone", "timestamp"),
}

AA_COLUMNS = {
    "id": ("integer", "int4"),
    "country": ("character varying", "varchar"),
    "type": ("USER-DEFINED", "anticipatory_action_alerts_type_enum"),
    "emails": ("ARRAY", "_varchar"),
    "prism_url": ("character varying", "varchar"),
    "last_triggered_at": ("timestamp with time zone", "timestamptz"),
    "last_ran_at": ("timestamp with time zone", "timestamptz"),
    "last_states": ("jsonb", "jsonb"),
    "metadata": ("jsonb", "jsonb"),
}


def _check_table(
    rows: list, expected: dict[str, tuple[str, str]], table: str
) -> list[str]:
    err: list[str] = []
    by = {r[0]: r for r in rows}
    for col, (dt, udt) in expected.items():
        r = by.get(col)
        if not r:
            err.append(f"{table}: missing column {col}")
            continue
        if r[1] != dt or r[2] != udt:
            err.append(
                f"{table}.{col}: expected data_type={dt} udt={udt}, "
                f"got data_type={r[1]} udt={r[2]}",
            )
    return err


def main() -> None:
    url = os.environ.get("PRISM_ALERTS_DATABASE_URL")
    if not url:
        print("PRISM_ALERTS_DATABASE_URL required", file=sys.stderr)
        sys.exit(1)
    eng = create_engine(url)
    errors: list[str] = []
    with eng.connect() as c:
        n = c.execute(
            text(
                "SELECT 1 FROM pg_type WHERE typname = "
                "'anticipatory_action_alerts_type_enum'",
            ),
        ).scalar()
        if not n:
            errors.append("Missing enum type anticipatory_action_alerts_type_enum")
        for tbl, spec in (
            ("alert", ALERT_COLUMNS),
            ("anticipatory_action_alerts", AA_COLUMNS),
        ):
            rows = c.execute(
                text(
                    "SELECT column_name, data_type, udt_name FROM information_schema.columns "
                    "WHERE table_schema = 'public' AND table_name = :t ORDER BY ordinal_position",
                ),
                {"t": tbl},
            ).all()
            if not rows:
                errors.append(f"Missing table {tbl}")
                continue
            errors.extend(_check_table(rows, spec, tbl))
    if errors:
        print("Alerts DB contract check failed:\n" + "\n".join(errors), file=sys.stderr)
        sys.exit(1)
    print("Alerts DB contract OK")


if __name__ == "__main__":
    main()

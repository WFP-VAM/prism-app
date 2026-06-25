"""Opens pg + runs same SELECTs as Node ``smoke-alerts-db-pool``."""

from __future__ import annotations

import os
import sys

from prism_app.alert_workers import db


def main() -> None:
    if not os.environ.get("PRISM_ALERTS_DATABASE_URL"):
        print("PRISM_ALERTS_DATABASE_URL required", file=sys.stderr)
        sys.exit(1)
    with db.alerts_session() as conn:
        alerts = db.fetch_active_alerts(conn)
        aa = db.fetch_aa_alerts(conn, "Mozambique", "storm")
    print(
        "Alerts DB smoke OK (",
        len(alerts),
        "active alerts,",
        len(aa),
        "AA storm rows for Mozambique)",
    )


if __name__ == "__main__":
    main()

"""CLI for threshold + AA alert workers (see api/crons/cron_*_alert_run.sh)."""

from __future__ import annotations

import argparse
import logging
import sys

from prism_app.alert_workers import db, settings
from prism_app.alert_workers.aa_flood import run_flood_worker
from prism_app.alert_workers.aa_storm import run_storm_worker
from prism_app.alert_workers.smtp_mailer import (
    prepare_test_email_smtp,
    require_smtp_configured,
)
from prism_app.alert_workers.threshold_worker import run_threshold_alert_worker

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


def smoke_ci() -> None:
    """Match ``yarn smoke-alerting-workers`` + DB listing queries."""
    if not settings.alerts_database_url():
        logger.error("PRISM_ALERTS_DATABASE_URL required")
        sys.exit(1)
    with db.alerts_session() as conn:
        db.fetch_aa_alerts(conn, "Mozambique", "storm")
        db.fetch_aa_alerts(conn, "Mozambique", "flood")
    run_threshold_alert_worker()
    logger.info("Alert workers smoke OK (threshold + AA storm/flood queries)")


def main() -> None:
    p = argparse.ArgumentParser(description="PRISM alert workers (Python)")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("threshold", help="Run threshold email alert worker")
    sub.add_parser("smoke", help="CI smoke (DB queries + threshold worker)")

    ps = sub.add_parser("aa-storm", help="Run AA tropical storm worker")
    ps.add_argument(
        "--test-email",
        metavar="ADDR",
        help="Comma-separated override recipients (dev)",
    )

    pf = sub.add_parser("aa-flood", help="Run AA flood worker")
    pf.add_argument(
        "--test-email",
        metavar="ADDR",
        help="Comma-separated override recipients (dev)",
    )

    args = p.parse_args()

    if args.cmd == "threshold":
        require_smtp_configured()
        run_threshold_alert_worker()
    elif args.cmd == "smoke":
        smoke_ci()
    elif args.cmd == "aa-storm":
        use_test = bool(getattr(args, "test_email", None))
        prepare_test_email_smtp(use_test_email=use_test)
        require_smtp_configured()
        emails = (
            [e.strip() for e in args.test_email.split(",") if e.strip()]
            if use_test
            else None
        )
        run_storm_worker(emails)
    elif args.cmd == "aa-flood":
        use_test = bool(getattr(args, "test_email", None))
        prepare_test_email_smtp(use_test_email=use_test)
        require_smtp_configured()
        emails = (
            [e.strip() for e in args.test_email.split(",") if e.strip()]
            if use_test
            else None
        )
        run_flood_worker(emails)
    else:
        p.error("unknown command")


if __name__ == "__main__":
    main()

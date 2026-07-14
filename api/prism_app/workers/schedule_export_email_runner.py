"""Send a schedule export notification via Ethereal (dev / manual QA only).

Run inside ``export_map_worker`` (Playwright image) with Ethereal SMTP::

    make send-schedule-export-test-email EMAIL=you@example.com

Optional: load a real succeeded job from the dev database::

    make send-schedule-export-test-email EMAIL=you@example.com JOB_ID=<uuid>
"""

from __future__ import annotations

import argparse
import logging
import sys
import uuid
from unittest.mock import MagicMock, patch
from uuid import UUID

from prism_app.alert_workers import settings
from prism_app.alert_workers.smtp_mailer import prepare_test_email_smtp
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleCadence,
    MapExportScheduleFormat,
    MapExportScheduleStatus,
)
from prism_app.export_jobs.db import get_export_jobs_session_factory
from prism_app.export_jobs.schedule_export_email import send_schedule_export_email

logger = logging.getLogger(__name__)

_SAMPLE_PRISM_BASE = "https://prism.moz.wfp.org"
_SAMPLE_PRESIGN_URL = "https://example.com/schedule-export-test-download.pdf"


def _sample_job_and_schedule() -> tuple[MapExportJob, MapExportSchedule]:
    schedule_id = UUID("00000000-0000-4000-8000-0000000000bb")
    schedule = MapExportSchedule(
        id=schedule_id,
        name="Ethereal test schedule",
        status=MapExportScheduleStatus.active,
        country="mozambique",
        layer_id="precip_blended_dekad",
        cadence=MapExportScheduleCadence.monthly,
        export_url=f"{_SAMPLE_PRISM_BASE}/export?date={{date}}&layer_id={{layer_id}}",
        format=MapExportScheduleFormat.pdf,
        export_options={},
    )
    job = MapExportJob(
        id=str(uuid.uuid4()),
        request_fingerprint="ethereal-schedule-export-test",
        request_payload_json={
            "urls": [
                f"{_SAMPLE_PRISM_BASE}/export?date=2026-05-21&hazardLayerIds=precip_blended_dekad",
            ],
            "format": "pdf",
            "country": "mozambique",
            "publicMapUpload": True,
        },
        status="succeeded",
        s3_uri="s3://prism-dev/public_maps/mozambique/precip_blended_dekad/test.pdf",
        content_type="pdf",
        map_export_schedule_id=schedule_id,
    )
    return job, schedule


def _send_sample_test_email(recipient: str) -> None:
    job, schedule = _sample_job_and_schedule()
    session = MagicMock()
    with (
        patch(
            "prism_app.export_jobs.schedule_export_email.map_export_artifact_exists",
            return_value=True,
        ),
        patch(
            "prism_app.export_jobs.schedule_export_email.presign_export_get",
            return_value=_SAMPLE_PRESIGN_URL,
        ),
    ):
        send_schedule_export_email(
            session,
            job,
            schedule=schedule,
            recipient_email=recipient,
            force_send=True,
        )


def _send_db_job_test_email(job_id: str, recipient: str) -> None:
    factory = get_export_jobs_session_factory()
    session = factory()
    try:
        job = session.get(MapExportJob, job_id)
        if job is None:
            raise SystemExit(f"map_export_jobs row not found: {job_id!r}")
        send_schedule_export_email(
            session,
            job,
            recipient_email=recipient,
            force_send=True,
        )
    finally:
        session.close()


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
    )

    if settings.is_production():
        logger.error(
            "schedule_export_email_runner is for non-production Ethereal testing only",
        )
        return 1

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--test-email",
        required=True,
        metavar="ADDR",
        help="Recipient address (Ethereal inbox; not used for real delivery routing)",
    )
    parser.add_argument(
        "--job-id",
        metavar="UUID",
        help="Succeeded map_export_jobs id to load from PRISM_ALERTS_DATABASE_URL",
    )
    args = parser.parse_args(argv)

    recipient = args.test_email.strip()
    if not recipient:
        parser.error("--test-email must be non-empty")

    prepare_test_email_smtp(use_test_email=True)

    if args.job_id:
        _send_db_job_test_email(args.job_id.strip(), recipient)
    else:
        _send_sample_test_email(recipient)

    logger.info(
        "Schedule export test email requested for %s (check stdout for Ethereal preview URL)",
        recipient,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

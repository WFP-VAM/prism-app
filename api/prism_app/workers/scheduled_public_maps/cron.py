"""Enqueue map_export_jobs from active DB schedules (daily scheduled public maps).

Run inside the export_map_worker image (or any env with PRISM_ALERTS_DATABASE_URL):

    python -m prism_app.workers.scheduled_public_maps.cron

Active ``map_export_schedules`` rows are the default source of truth. Use
the API/Admin flows to create and manage schedules.

**Behavior**

- **Public layout**: DB-backed schedules always set ``publicMapUpload=True``.
  Worker writes ``public_maps/{country}/{layer}/{job_id}.{ext}``; ``country``
  from schedule payload only; ``layer`` from ``hazardLayerIds`` on the export URL.
- **Dates**: active schedules resolve ``layer_id`` against WFP datacube WMS
  GetCapabilities (``https://api.earthobservation.vam.wfp.org/ows``), apply
  cadence, and enqueue only the latest eligible date newer than
  ``last_enqueued_date``.
- **Priority**: jobs enqueue with priority 100 vs interactive default 200 —
  see ``export_jobs/claim.py`` (``ORDER BY priority DESC``).
"""

from __future__ import annotations

import argparse
import datetime
import logging
import sys
from typing import Any

from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleCadence,
    MapExportScheduleStatus,
)
from prism_app.export_jobs.db import get_export_jobs_session_factory
from prism_app.export_jobs.priority import MAP_EXPORT_JOB_PRIORITY_SCHEDULED_PUBLIC
from prism_app.export_jobs.service import enqueue_map_export_job
from prism_app.export_s3 import map_export_s3_client
from prism_app.models import MapExportRequestModel
from prism_app.utils import utc_now
from prism_app.workers.scheduled_public_maps.layer_days import (
    collect_times_for_layer_id,
    fetch_layer_days_map,
)
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

_CAPABILITIES_HTTP_TIMEOUT_SEC = 120.0


def _utc_date_from_ms(timestamp_ms: int) -> datetime.date:
    return datetime.datetime.fromtimestamp(
        timestamp_ms / 1000.0,
        tz=datetime.UTC,
    ).date()


def _dekad_key(day: datetime.date) -> tuple[int, int, int]:
    dekad = 1 if day.day <= 10 else 2 if day.day <= 20 else 3
    return day.year, day.month, dekad


def _quarter_key(day: datetime.date) -> tuple[int, int]:
    return day.year, (day.month - 1) // 3


def cadence_eligible_dates(
    days: list[datetime.date],
    cadence: MapExportScheduleCadence,
    dekad_interval: int,
) -> list[datetime.date]:
    sorted_days = sorted(set(days))
    if not sorted_days:
        return []

    if cadence == MapExportScheduleCadence.monthly:
        by_month: dict[tuple[int, int], datetime.date] = {}
        for day in sorted_days:
            by_month.setdefault((day.year, day.month), day)
        return list(by_month.values())

    if cadence == MapExportScheduleCadence.quarterly:
        by_quarter: dict[tuple[int, int], datetime.date] = {}
        for day in sorted_days:
            by_quarter.setdefault(_quarter_key(day), day)
        return list(by_quarter.values())

    by_dekad: dict[tuple[int, int, int], datetime.date] = {}
    for day in sorted_days:
        by_dekad.setdefault(_dekad_key(day), day)
    unique_dekad_days = list(by_dekad.values())
    if dekad_interval <= 1:
        return unique_dekad_days
    return [
        day
        for index, day in enumerate(unique_dekad_days)
        if index % dekad_interval == 0
    ]


def latest_eligible_date_for_schedule(
    schedule: MapExportSchedule,
    days_map: dict[str, list[int]],
) -> datetime.date | None:
    days = [
        _utc_date_from_ms(timestamp_ms)
        for timestamp_ms in collect_times_for_layer_id(days_map, schedule.layer_id)
    ]
    eligible = cadence_eligible_dates(
        days,
        schedule.cadence,
        schedule.dekad_interval,
    )
    if not eligible:
        return None
    return max(eligible)


class ScheduledMapExportRequest(BaseModel):
    """Translate one schedule/date pair into the worker's export job request."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    schedule: MapExportSchedule
    cover_date: datetime.date

    def concrete_export_url(self) -> str:
        return self.schedule.export_url.replace(
            "{date}",
            self.cover_date.isoformat(),
        ).replace(
            "{layer_id}",
            self.schedule.layer_id,
        )

    def viewport_value(self, key: str) -> int | None:
        raw = self.schedule.export_options.get(key)
        if raw is None:
            return None
        try:
            return int(raw)
        except (TypeError, ValueError):
            return None

    def to_map_export_request(self) -> MapExportRequestModel:
        payload: dict[str, Any] = {
            "urls": [self.concrete_export_url()],
            "format": self.schedule.format,
            "country": self.schedule.country,
            "publicMapUpload": True,
        }
        viewport_width = self.viewport_value("viewportWidth")
        if viewport_width is not None:
            payload["viewportWidth"] = viewport_width
        viewport_height = self.viewport_value("viewportHeight")
        if viewport_height is not None:
            payload["viewportHeight"] = viewport_height
        return MapExportRequestModel.model_validate(payload)


def process_active_schedules(
    session_factory,
    *,
    days_map: dict[str, list[int]] | None = None,
    dry_run: bool = False,
    s3_client: object | None = None,
    timeout_sec: float = _CAPABILITIES_HTTP_TIMEOUT_SEC,
) -> tuple[int, int]:
    """Process active DB schedules. Returns ``(enqueued, skipped)``."""
    if days_map is None:
        days_map = fetch_layer_days_map(timeout_sec=timeout_sec)

    enqueued = 0
    skipped = 0
    session: Session = session_factory()
    try:
        schedules = list(
            session.exec(
                select(MapExportSchedule).where(
                    MapExportSchedule.status == MapExportScheduleStatus.active
                )
            )
        )
        for schedule in schedules:
            now = utc_now()
            schedule.last_checked_at = now
            cover_date = latest_eligible_date_for_schedule(schedule, days_map)
            if cover_date is None:
                skipped += 1
                session.add(schedule)
                session.commit()
                continue
            if (
                schedule.last_enqueued_date is not None
                and cover_date <= schedule.last_enqueued_date
            ):
                skipped += 1
                session.add(schedule)
                session.commit()
                continue

            req = ScheduledMapExportRequest(
                schedule=schedule,
                cover_date=cover_date,
            ).to_map_export_request()
            if dry_run:
                logger.info(
                    "[dry-run] would enqueue schedule=%s date=%s url=%s",
                    schedule.id,
                    cover_date.isoformat(),
                    req.urls[0][:200],
                )
                skipped += 1
                session.add(schedule)
                session.commit()
                continue

            _job, status = enqueue_map_export_job(
                session,
                req,
                s3_client=s3_client,
                dedupe=True,
                priority=MAP_EXPORT_JOB_PRIORITY_SCHEDULED_PUBLIC,
                schedule_id=schedule.id,
                created_by_user_id=schedule.created_by_user_id,
            )
            schedule.last_enqueued_at = now
            schedule.last_enqueued_date = cover_date
            session.add(schedule)
            session.commit()
            if status == 202:
                enqueued += 1
            else:
                skipped += 1
    finally:
        session.close()
    return enqueued, skipped


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
    )
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="log actions without writing map_export_jobs",
    )
    args = parser.parse_args(argv)

    timeout_sec = _CAPABILITIES_HTTP_TIMEOUT_SEC
    s3_client = None if args.dry_run else map_export_s3_client()

    factory = get_export_jobs_session_factory()
    enqueued, skipped = process_active_schedules(
        factory,
        dry_run=args.dry_run,
        s3_client=s3_client,
        timeout_sec=timeout_sec,
    )
    logger.info(
        "scheduled_public_maps_cron finished enqueued=%s skipped=%s dry_run=%s",
        enqueued,
        skipped,
        args.dry_run,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

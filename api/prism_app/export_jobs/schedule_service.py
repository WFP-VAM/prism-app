"""Schedule helpers: payload validation, next_run_at, scheduled enqueue."""

from __future__ import annotations

from datetime import datetime

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.export_jobs.schedule_cron import compute_next_run_at
from prism_app.models import MapExportRequestModel
from sqlmodel import Session


def refresh_schedule_next_run_at(
    schedule: MapExportSchedule,
    *,
    base_time: datetime | None = None,
) -> None:
    """Set ``next_run_at`` from cron when the schedule still has remaining runs."""
    if schedule.runs_completed >= schedule.max_runs:
        schedule.next_run_at = None
        return
    schedule.next_run_at = compute_next_run_at(
        schedule.cron_expression,
        base_time=base_time,
    )


def enqueue_scheduled_map_export_job(
    session: Session,
    schedule: MapExportSchedule,
    request: MapExportRequestModel,
) -> MapExportJob:
    """
    Insert a queued job for a schedule fire without API dedupe.

    Caller commits after updating schedule counters / ``next_run_at``.
    """
    from prism_app.export_jobs.service import create_queued_map_export_job

    return create_queued_map_export_job(
        session,
        request,
        schedule_id=schedule.id,
    )


def reprepare_schedule_for_retry(schedule: MapExportSchedule) -> None:
    """Recompute ``next_run_at`` so a halted schedule can fire again."""
    from prism_app.utils import utc_now

    if schedule.runs_completed >= schedule.max_runs:
        raise ValueError("Schedule has already completed all configured runs.")
    refresh_schedule_next_run_at(schedule)
    if schedule.next_run_at is None:
        raise ValueError("Could not compute a next run time for this schedule.")
    schedule.updated_at = utc_now()

"""Schedule helpers: payload validation, next_run_at, scheduled enqueue."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.export_jobs.schedule_cron import (
    compute_next_run_at,
    validate_cron_expression,
)
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


def validate_schedule_fields(
    *,
    cron_expression: str,
    request_payload_json: dict[str, Any],
    max_runs: int,
) -> tuple[str, MapExportRequestModel, int]:
    """Validate admin-facing schedule inputs."""
    cron = validate_cron_expression(cron_expression)
    if max_runs < 1:
        raise ValueError("max_runs must be at least 1.")
    request = MapExportRequestModel.model_validate(request_payload_json)
    return cron, request, max_runs

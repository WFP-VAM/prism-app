"""Enqueue map export jobs for due schedules."""

from __future__ import annotations

import logging

from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.export_jobs.schedule_request import (
    map_export_request_from_schedule_export_urls,
)
from prism_app.export_jobs.schedule_service import (
    enqueue_scheduled_map_export_job,
    refresh_schedule_next_run_at,
)
from prism_app.utils import utc_now
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

SCHEDULE_FIRE_MAX_ATTEMPTS = 3


def fire_next_due_map_export_schedule(session: Session) -> bool:
    """
    Claim one due schedule, enqueue a job, advance counters, commit.

    Uses ``FOR UPDATE SKIP LOCKED`` on PostgreSQL when multiple workers run.
    """
    now = utc_now()
    stmt = (
        select(MapExportSchedule)
        .where(MapExportSchedule.runs_completed < MapExportSchedule.max_runs)
        .where(MapExportSchedule.next_run_at.is_not(None))  # type: ignore[union-attr]
        .where(MapExportSchedule.next_run_at <= now)
        .order_by(MapExportSchedule.next_run_at.asc())
        .limit(1)
    )
    bind = session.get_bind()
    if bind is not None and bind.dialect.name == "postgresql":
        stmt = stmt.with_for_update(skip_locked=True)

    schedule = session.exec(stmt).first()
    if schedule is None:
        session.commit()
        return False

    schedule_id = schedule.id
    for attempt in range(1, SCHEDULE_FIRE_MAX_ATTEMPTS + 1):
        try:
            request = map_export_request_from_schedule_export_urls(
                schedule.batch_map_url
            )
            enqueue_scheduled_map_export_job(session, schedule, request)

            fired_at = utc_now()
            schedule.runs_completed += 1
            schedule.last_run_at = fired_at
            schedule.updated_at = fired_at
            refresh_schedule_next_run_at(schedule, base_time=fired_at)
            session.add(schedule)
            session.commit()
            return True
        except Exception as exc:
            session.rollback()
            schedule = session.get(MapExportSchedule, schedule_id)
            if schedule is None:
                logger.error(
                    "Scheduled map export schedule disappeared while retrying "
                    "(schedule_id=%s)",
                    schedule_id,
                )
                return False
            logger.error(
                "Scheduled map export fire failed (schedule_id=%s attempt=%s/%s): %s",
                schedule_id,
                attempt,
                SCHEDULE_FIRE_MAX_ATTEMPTS,
                exc,
                exc_info=exc,
            )
            if attempt >= SCHEDULE_FIRE_MAX_ATTEMPTS:
                schedule.next_run_at = None
                schedule.updated_at = utc_now()
                session.add(schedule)
                session.commit()
                return False

    return False


def fire_due_map_export_schedules(session: Session) -> int:
    """Fire every due schedule visible to this worker; return jobs enqueued."""
    fired = 0
    while fire_next_due_map_export_schedule(session):
        fired += 1
    return fired

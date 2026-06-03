"""Claim the next queued map export job."""

from __future__ import annotations

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.utils import utc_now
from sqlmodel import Session, select


def claim_next_queued_map_export_job(session: Session) -> str | None:
    """
    Atomically pick one queued job, mark it running, commit.

    Uses ``FOR UPDATE SKIP LOCKED`` on PostgreSQL when multiple workers run.
    """
    stmt = (
        select(MapExportJob)
        .where(MapExportJob.status == "queued")
        .order_by(MapExportJob.priority.desc(), MapExportJob.created_at.asc())
        .limit(1)
    )
    bind = session.get_bind()
    if bind is not None and bind.dialect.name == "postgresql":
        stmt = stmt.with_for_update(skip_locked=True)

    job = session.exec(stmt).first()
    if job is None:
        session.commit()
        return None

    now = utc_now()
    job.status = "running"
    job.started_at = now
    job.updated_at = now
    session.add(job)
    session.commit()
    return job.id

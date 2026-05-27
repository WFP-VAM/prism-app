"""Create / dedupe map export jobs."""

from __future__ import annotations

from uuid import UUID

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs.fingerprint import compute_request_fingerprint
from prism_app.export_jobs.priority import MAP_EXPORT_JOB_PRIORITY_INTERACTIVE
from prism_app.export_s3 import map_export_artifact_exists
from prism_app.models import MapExportRequestModel
from prism_app.utils import utc_now
from sqlmodel import Session, select


def _origin_from_first_export_url(urls: list[str]) -> str | None:
    """Scheme + netloc of first map URL (audit); None if not http(s) with host."""
    if not urls:
        return None
    from urllib.parse import urlparse

    p = urlparse(urls[0].strip())
    if p.scheme in ("http", "https") and p.netloc:
        return f"{p.scheme}://{p.netloc}"
    return None


def _invalidate_stale_succeeded_job(session: Session, job: MapExportJob) -> None:
    """Mark succeeded job as failed when its artifact is gone (dedupe must re-run)."""
    fin = utc_now()
    job.status = "failed"
    job.s3_uri = None
    job.error_json = {
        "message": "Export artifact missing or inaccessible; job invalidated for redownload.",
        "type": "ArtifactMissing",
    }
    job.finished_at = fin
    job.updated_at = fin
    session.add(job)


def create_queued_map_export_job(
    session: Session,
    request: MapExportRequestModel,
    *,
    priority: int = MAP_EXPORT_JOB_PRIORITY_INTERACTIVE,
    schedule_id: str | None = None,
    created_by_user_id: UUID | None = None,
) -> MapExportJob:
    """Persist a new queued job row without committing."""
    fingerprint = compute_request_fingerprint(request)
    artifact_kind = "pdf" if request.format == "pdf" else "zip"
    job = MapExportJob(
        request_fingerprint=fingerprint,
        request_payload_json=request.model_dump(mode="json"),
        status="queued",
        origin_url=_origin_from_first_export_url(request.urls),
        content_type=artifact_kind,
        priority=priority,
        map_export_schedule_id=schedule_id,
        created_by_user_id=created_by_user_id,
    )
    session.add(job)
    return job


def enqueue_map_export_job(
    session: Session,
    request: MapExportRequestModel,
    s3_client: object | None = None,
    *,
    dedupe: bool = True,
    priority: int = MAP_EXPORT_JOB_PRIORITY_INTERACTIVE,
    schedule_id: str | None = None,
    created_by_user_id: UUID | None = None,
) -> tuple[MapExportJob, int]:
    """
    Return (job, http_status). New row with status queued -> 202;
    dedupe (in-flight or succeeded) -> 200.
    """
    fingerprint = compute_request_fingerprint(request)
    if dedupe:
        stmt = (
            select(MapExportJob)
            .where(MapExportJob.request_fingerprint == fingerprint)
            .where(MapExportJob.map_export_schedule_id == schedule_id)
            .order_by(MapExportJob.created_at.desc())
        )
        rows = list(session.exec(stmt))

        active = [r for r in rows if r.status in ("queued", "running")]
        if active:
            active.sort(key=lambda r: r.created_at, reverse=True)
            return active[0], 200

        succeeded = [r for r in rows if r.status == "succeeded"]
        if succeeded:
            succeeded.sort(key=lambda r: r.created_at, reverse=True)
            invalidated_any = False
            for job in succeeded:
                if map_export_artifact_exists(job.s3_uri, s3_client=s3_client):
                    return job, 200
                _invalidate_stale_succeeded_job(session, job)
                invalidated_any = True
            if invalidated_any:
                session.commit()

    job = create_queued_map_export_job(
        session,
        request,
        priority=priority,
        schedule_id=schedule_id,
        created_by_user_id=created_by_user_id,
    )
    session.commit()
    session.refresh(job)
    return job, 202


def cancel_map_export_job_if_queued(session: Session, job_id: str) -> str:
    """
    Mark a queued job as cancelled. Idempotent when already cancelled.

    Returns outcome: cancelled | already_cancelled | not_found | not_queued.

    Workers only claim rows with status ``queued``, so cancelled rows are never processed.
    """
    job = session.get(MapExportJob, job_id)
    if job is None:
        return "not_found"
    if job.status == "cancelled":
        session.commit()
        return "already_cancelled"
    if job.status != "queued":
        session.commit()
        return "not_queued"
    now = utc_now()
    job.status = "cancelled"
    job.finished_at = now
    job.updated_at = now
    job.error_json = {
        "message": "Cancelled before processing.",
        "type": "Cancelled",
    }
    session.add(job)
    session.commit()
    return "cancelled"

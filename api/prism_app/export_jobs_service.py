"""Create / dedupe map export jobs before SQS handoff."""

from __future__ import annotations

from collections.abc import Callable

from sqlmodel import Session, select

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_job_fingerprint import compute_request_fingerprint
from prism_app.models import MapExportRequestModel


def enqueue_map_export_job(
    session: Session,
    request: MapExportRequestModel,
    requested_by: str,
    sqs_send: Callable[[str], None],
) -> tuple[MapExportJob, int]:
    """
    Return (job, http_status). New queue work -> 202 and sqs_send called;
    dedupe (in-flight or succeeded) -> 200 and no SQS.
    """
    fingerprint = compute_request_fingerprint(request, requested_by)
    stmt = (
        select(MapExportJob)
        .where(
            MapExportJob.requested_by == requested_by,
            MapExportJob.request_fingerprint == fingerprint,
        )
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
        return succeeded[0], 200

    artifact_kind = "pdf" if request.format == "pdf" else "zip"
    job = MapExportJob(
        request_fingerprint=fingerprint,
        request_payload_json=request.model_dump(mode="json"),
        status="queued",
        requested_by=requested_by,
        content_type=artifact_kind,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    sqs_send(job.id)
    return job, 202

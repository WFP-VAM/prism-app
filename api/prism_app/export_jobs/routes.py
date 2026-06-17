"""HTTP routes for async map export jobs."""

# TODO(transition): Revisit merging batch UX with legacy POST /export-map once all clients use /export-map/jobs + polling.

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs.db import get_export_jobs_session
from prism_app.export_jobs.download_filename import (
    map_export_download_filename_from_payload,
)
from prism_app.export_jobs.fingerprint import compute_request_fingerprint
from prism_app.export_jobs.service import (
    cancel_map_export_job_if_queued,
    enqueue_map_export_job,
)
from prism_app.export_s3 import (
    is_file_artifact_uri,
    local_path_from_file_uri,
    map_export_artifact_exists,
    map_export_s3_client,
    presign_export_get,
)
from prism_app.models import MapExportJobEnqueueRequest
from prism_app.utils import utc_now
from sqlmodel import Session

router = APIRouter(prefix="/export-map", tags=["export-map"])


def get_s3_client_for_presign() -> object:
    """S3 client for browser-facing presigned GET URLs."""
    return map_export_s3_client(for_presign=True)


def _s3_client_for_artifact(uri: str | None, injected: object | None) -> object | None:
    if not uri or is_file_artifact_uri(uri):
        return None
    if injected is not None:
        return injected
    return map_export_s3_client()


@router.post("/jobs")
def create_map_export_job(
    body: MapExportJobEnqueueRequest,
    session: Session = Depends(get_export_jobs_session),
) -> JSONResponse:
    req = body.to_queued_request()
    job, status_code = enqueue_map_export_job(session, req, map_export_s3_client())
    fingerprint = compute_request_fingerprint(req)
    payload: dict[str, Any] = {
        "job_id": job.id,
        "status": job.status,
        "request_fingerprint": fingerprint,
        "origin_url": job.origin_url,
        "deduplicated": status_code == 200,
    }
    return JSONResponse(status_code=status_code, content=payload)


@router.get("/jobs/{job_id}")
def read_map_export_job(
    job_id: str,
    session: Session = Depends(get_export_jobs_session),
) -> dict[str, Any]:
    job = session.get(MapExportJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    verify_client = _s3_client_for_artifact(job.s3_uri, None)

    if job.status == "succeeded" and job.s3_uri:
        if not map_export_artifact_exists(job.s3_uri, s3_client=verify_client):
            fin = utc_now()
            job.status = "failed"
            job.error_json = {
                "message": "Export artifact missing or inaccessible.",
                "type": "ArtifactMissing",
            }
            job.s3_uri = None
            job.finished_at = fin
            job.updated_at = fin
            session.add(job)
            session.commit()

    download_filename: str | None = None
    if job.request_payload_json is not None:
        download_filename = map_export_download_filename_from_payload(
            job.request_payload_json
        )

    download_url: str | None = None
    local_artifact_path: str | None = None
    if job.status == "succeeded" and job.s3_uri:
        if is_file_artifact_uri(job.s3_uri):
            local_artifact_path = local_path_from_file_uri(job.s3_uri)
        else:
            presign_client = get_s3_client_for_presign()
            download_url = presign_export_get(
                job.s3_uri,
                presign_client,
                download_filename=download_filename,
            )

    payload: dict[str, Any] = {
        "job_id": job.id,
        "status": job.status,
        "request_fingerprint": job.request_fingerprint,
        "origin_url": job.origin_url,
        "progress_current": job.progress_current,
        "progress_total": job.progress_total,
        "download_url": download_url,
        "download_filename": download_filename,
        "local_artifact_path": local_artifact_path,
        "error": job.error_json,
    }
    return payload


@router.delete("/jobs/{job_id}", status_code=204)
def cancel_map_export_job_route(
    job_id: str,
    session: Session = Depends(get_export_jobs_session),
) -> Response:
    """Drop a queued job so workers never claim it."""
    outcome = cancel_map_export_job_if_queued(session, job_id)
    if outcome in ("cancelled", "already_cancelled"):
        return Response(status_code=204)
    if outcome == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")
    raise HTTPException(
        status_code=409,
        detail="Job can only be cancelled while queued.",
    )

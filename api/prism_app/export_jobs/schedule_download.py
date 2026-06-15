"""Resolve latest schedule export artifacts and build admin download responses."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs.download_filename import (
    map_export_download_filename_from_payload,
)
from prism_app.export_s3 import (
    is_file_artifact_uri,
    local_path_from_file_uri,
    map_export_artifact_exists,
    map_export_s3_client,
    presign_export_get,
)
from sqlalchemy.orm import Session
from sqlmodel import select
from starlette.exceptions import HTTPException
from starlette.responses import FileResponse, RedirectResponse, Response
from starlette.status import HTTP_303_SEE_OTHER, HTTP_503_SERVICE_UNAVAILABLE


def get_s3_client_for_presign() -> object | None:
    """Return an S3 client when boto3 can configure one; else None."""
    try:
        return map_export_s3_client()
    except Exception:  # noqa: BLE001 — NoRegionError, missing creds, etc.
        return None


def _s3_client_for_artifact(uri: str | None, injected: object | None) -> object | None:
    if not uri or is_file_artifact_uri(uri):
        return None
    if injected is not None:
        return injected
    try:
        return map_export_s3_client()
    except Exception:
        return None


def latest_succeeded_job_for_schedule(
    session: Session,
    schedule_id: UUID,
) -> MapExportJob | None:
    """Most recent succeeded export job with an artifact for ``schedule_id``."""
    return session.exec(
        select(MapExportJob)
        .where(
            MapExportJob.map_export_schedule_id == schedule_id,
            MapExportJob.status == "succeeded",
            MapExportJob.s3_uri.isnot(None),
        )
        .order_by(MapExportJob.finished_at.desc())
        .limit(1),
    ).first()


def schedule_export_download_response(
    job: MapExportJob,
    *,
    s3_client: object | None = None,
) -> Response:
    """Redirect or stream the export artifact for a succeeded job."""
    if job.status != "succeeded" or not job.s3_uri:
        raise HTTPException(status_code=404, detail="Export not available")

    verify_client = _s3_client_for_artifact(job.s3_uri, s3_client)
    if not map_export_artifact_exists(job.s3_uri, s3_client=verify_client):
        raise HTTPException(
            status_code=404,
            detail="Export file is missing or inaccessible",
        )

    download_filename: str | None = None
    if job.request_payload_json is not None:
        download_filename = map_export_download_filename_from_payload(
            job.request_payload_json,
        )

    if is_file_artifact_uri(job.s3_uri):
        path = Path(local_path_from_file_uri(job.s3_uri))
        return FileResponse(path, filename=download_filename or path.name)

    presign_client = verify_client or _s3_client_for_artifact(job.s3_uri, s3_client)
    if presign_client is None:
        raise HTTPException(
            status_code=HTTP_503_SERVICE_UNAVAILABLE,
            detail="S3 is not configured; cannot download this export",
        )
    url = presign_export_get(
        job.s3_uri,
        presign_client,
        download_filename=download_filename,
    )
    return RedirectResponse(url, status_code=HTTP_303_SEE_OTHER)

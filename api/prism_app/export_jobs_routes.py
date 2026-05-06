"""HTTP routes for async map export jobs."""

# TODO(transition): Revisit merging batch UX with legacy POST /export-map once all clients use /export-map/jobs + polling.

from __future__ import annotations

from typing import Any

import boto3
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlmodel import Session

from prism_app.auth import validate_user
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.user_info_model import UserInfoModel
from prism_app.export_job_fingerprint import compute_request_fingerprint
from prism_app.export_jobs_db import get_export_jobs_session
from prism_app.export_jobs_service import enqueue_map_export_job
from prism_app.export_s3 import (
    is_file_artifact_uri,
    local_path_from_file_uri,
    presign_export_get,
)
from prism_app.models import MapExportRequestModel


def get_s3_client_for_presign():
    return boto3.client("s3")


router = APIRouter(prefix="/export-map", tags=["export-map"])


@router.post("/jobs")
def create_map_export_job(
    body: MapExportRequestModel,
    user: UserInfoModel = Depends(validate_user),
    session: Session = Depends(get_export_jobs_session),
) -> JSONResponse:
    job, status_code = enqueue_map_export_job(session, body, user.username)
    fingerprint = compute_request_fingerprint(body, user.username)
    payload: dict[str, Any] = {
        "job_id": job.id,
        "status": job.status,
        "request_fingerprint": fingerprint,
        "deduplicated": status_code == 200,
    }
    return JSONResponse(status_code=status_code, content=payload)


@router.get("/jobs/{job_id}")
def read_map_export_job(
    job_id: str,
    user: UserInfoModel = Depends(validate_user),
    session: Session = Depends(get_export_jobs_session),
    s3_client: object = Depends(get_s3_client_for_presign),
) -> dict[str, Any]:
    job = session.get(MapExportJob, job_id)
    if job is None or job.requested_by != user.username:
        raise HTTPException(status_code=404, detail="Job not found")

    download_url: str | None = None
    local_artifact_path: str | None = None
    if job.status == "succeeded" and job.s3_uri:
        if is_file_artifact_uri(job.s3_uri):
            local_artifact_path = local_path_from_file_uri(job.s3_uri)
        else:
            download_url = presign_export_get(job.s3_uri, s3_client)

    return {
        "job_id": job.id,
        "status": job.status,
        "request_fingerprint": job.request_fingerprint,
        "progress_current": job.progress_current,
        "progress_total": job.progress_total,
        "download_url": download_url,
        "local_artifact_path": local_artifact_path,
        "error": job.error_json,
    }

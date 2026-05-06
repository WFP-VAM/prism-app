"""Poll ``map_export_jobs`` for queued work, run ``export_maps``, store artifact on S3 or disk.

Run: ``python -m prism_app.worker.export_map_worker``

Set ``EXPORT_MAP_S3_BUCKET`` for S3, **or** ``EXPORT_MAP_LOCAL_OUTPUT_DIR`` for local files
(``file:///…`` URI in DB; dev / Docker volume — do not use in production).
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import boto3
from sqlmodel import Session

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_job_claim import claim_next_queued_map_export_job
from prism_app.export_jobs_db import get_export_jobs_session_factory
from prism_app.export_maps import export_maps
from prism_app.export_s3 import put_map_export_bytes, put_map_export_bytes_local
from prism_app.models import MapExportRequestModel

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(UTC)


async def run_export_job(
    session: Session,
    job_id: str,
    *,
    local_output_dir: Path | None = None,
    s3_bucket: str | None = None,
    s3_client: Any | None = None,
) -> None:
    job = session.get(MapExportJob, job_id)
    if job is None:
        raise ValueError(f"map_export_jobs row not found: {job_id!r}")
    if job.status == "succeeded":
        logger.info("Job %s already succeeded; skipping", job_id)
        return
    if job.status == "failed":
        logger.info("Job %s already failed; skipping re-export", job_id)
        return
    if job.status != "running":
        logger.warning(
            "Job %s expected status running, got %s; skipping",
            job_id,
            job.status,
        )
        return

    req = MapExportRequestModel.model_validate(job.request_payload_json)
    file_bytes, _media = await export_maps(
        urls=req.urls,
        viewport_width=req.viewportWidth,
        viewport_height=req.viewportHeight,
        format_type=req.format,
    )
    kind = job.content_type or ("pdf" if req.format == "pdf" else "zip")

    if local_output_dir is not None:
        artifact_uri = await asyncio.to_thread(
            put_map_export_bytes_local,
            local_output_dir,
            job_id,
            kind,
            file_bytes,
        )
    else:
        if not s3_bucket or s3_client is None:
            raise RuntimeError("S3 mode requires bucket and s3_client")
        artifact_uri = await asyncio.to_thread(
            put_map_export_bytes,
            s3_bucket,
            job_id,
            kind,
            file_bytes,
            s3_client,
        )

    job = session.get(MapExportJob, job_id)
    if job is None:
        raise RuntimeError(f"job row disappeared mid-export: {job_id}")
    fin = _utc_now()
    job.status = "succeeded"
    job.s3_uri = artifact_uri
    job.finished_at = fin
    job.updated_at = fin
    session.add(job)
    session.commit()


def _mark_job_failed(session: Session, job_id: str, exc: BaseException) -> None:
    job = session.get(MapExportJob, job_id)
    if job is None:
        return
    if job.status == "succeeded":
        return
    fin = _utc_now()
    job.status = "failed"
    job.error_json = {"message": str(exc), "type": type(exc).__name__}
    job.finished_at = fin
    job.updated_at = fin
    session.add(job)
    session.commit()


async def amain() -> None:
    bucket = os.environ.get("EXPORT_MAP_S3_BUCKET", "").strip()
    local_raw = os.environ.get("EXPORT_MAP_LOCAL_OUTPUT_DIR", "").strip()
    idle_sec = float(os.getenv("EXPORT_JOB_POLL_IDLE_SEC", "2"))

    if bucket:
        local_dir: Path | None = None
        s3 = boto3.client("s3")
        logger.info("export_map_worker S3 mode (EXPORT_MAP_S3_BUCKET=%s)", bucket)
    elif local_raw:
        local_dir = Path(local_raw).resolve()
        s3 = None
        logger.info(
            "export_map_worker local artifact mode (EXPORT_MAP_LOCAL_OUTPUT_DIR=%s)",
            local_dir,
        )
    else:
        raise SystemExit(
            "export_map_worker needs EXPORT_MAP_S3_BUCKET or EXPORT_MAP_LOCAL_OUTPUT_DIR"
        )

    factory = get_export_jobs_session_factory()
    logger.info(
        "export_map_worker polling map_export_jobs (idle back-off %ss)", idle_sec
    )

    while True:
        session = factory()
        job_id: str | None = None
        try:
            job_id = await asyncio.to_thread(claim_next_queued_map_export_job, session)
        except Exception:
            logger.exception("claim_next_queued_map_export_job failed")
            session.rollback()
        finally:
            session.close()

        if not job_id:
            await asyncio.sleep(idle_sec)
            continue

        work = factory()
        try:
            try:
                await run_export_job(
                    work,
                    job_id,
                    local_output_dir=local_dir,
                    s3_bucket=bucket if bucket else None,
                    s3_client=s3,
                )
            except Exception as e:
                logger.exception("Export failed for job %s", job_id)
                work.rollback()
                try:
                    _mark_job_failed(work, job_id, e)
                except Exception:
                    logger.exception("Could not persist failed status for job %s", job_id)
        finally:
            work.close()


def main() -> None:
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
    )
    asyncio.run(amain())


if __name__ == "__main__":
    main()

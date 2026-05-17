"""Poll ``map_export_jobs`` for queued work, run ``export_maps``, store artifact on S3 or disk.

Run: ``python -m prism_app.worker.export_map_worker``

Set ``EXPORT_MAP_S3_BUCKET`` for S3 (bare name, ``bucket/prefix``, or ``s3://bucket/prefix``),
**or** ``EXPORT_MAP_LOCAL_OUTPUT_DIR`` for local files
(``file:///…`` URI in DB; dev / Docker volume — do not use in production).
If neither is set, defaults to ``DEFAULT_EXPORT_MAP_S3_BUCKET`` (see ``export_s3``).
When the queue is empty, the worker sleeps a fixed 2s before polling again.
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Any

from prism_app.database.map_export_job_model import MapExportJob
from prism_app.export_jobs.claim import claim_next_queued_map_export_job
from prism_app.export_jobs.db import get_export_jobs_session_factory
from prism_app.export_maps import export_maps
from prism_app.export_s3 import (
    DEFAULT_EXPORT_MAP_S3_BUCKET,
    map_export_s3_client,
    parse_export_map_s3_bucket_env,
    put_map_export_bytes,
    put_map_export_bytes_local,
)
from prism_app.models import MapExportRequestModel
from prism_app.utils import utc_now
from sqlmodel import Session

logger = logging.getLogger(__name__)

# Seconds to sleep when no queued map_export_jobs row is available.
_POLL_IDLE_SEC = 2.0


async def run_export_job(
    session: Session,
    job_id: str,
    *,
    local_output_dir: Path | None = None,
    s3_bucket: str | None = None,
    s3_object_prefix: str = "",
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
    total_maps = len(req.urls)

    t0 = utc_now()
    job.progress_total = total_maps
    job.progress_current = 0
    job.updated_at = t0
    session.add(job)
    session.commit()

    def report_progress(completed: int, total: int) -> None:
        row = session.get(MapExportJob, job_id)
        if row is None:
            return
        row.progress_current = completed
        row.progress_total = total
        row.updated_at = utc_now()
        session.add(row)
        session.commit()

    file_bytes, _media = await export_maps(
        urls=req.urls,
        viewport_width=req.viewportWidth,
        viewport_height=req.viewportHeight,
        format_type=req.format,
        progress_callback=report_progress,
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
            object_prefix=s3_object_prefix,
        )

    job = session.get(MapExportJob, job_id)
    if job is None:
        raise RuntimeError(f"job row disappeared mid-export: {job_id}")
    fin = utc_now()
    job.status = "succeeded"
    job.s3_uri = artifact_uri
    if job.progress_total is not None:
        job.progress_current = job.progress_total
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
    fin = utc_now()
    job.status = "failed"
    job.error_json = {"message": str(exc), "type": type(exc).__name__}
    job.finished_at = fin
    job.updated_at = fin
    session.add(job)
    session.commit()


async def amain() -> None:
    local_raw = os.environ.get("EXPORT_MAP_LOCAL_OUTPUT_DIR", "").strip()
    if "EXPORT_MAP_S3_BUCKET" not in os.environ and not local_raw:
        bucket_raw = DEFAULT_EXPORT_MAP_S3_BUCKET
    else:
        bucket_raw = os.environ.get("EXPORT_MAP_S3_BUCKET", "").strip()
    bucket, s3_prefix = parse_export_map_s3_bucket_env(bucket_raw)

    if bucket:
        local_dir: Path | None = None
        s3 = map_export_s3_client()
        logger.info(
            "export_map_worker S3 mode (bucket=%s prefix=%s raw=%s)",
            bucket,
            s3_prefix or "(none)",
            bucket_raw,
        )
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
        "export_map_worker polling map_export_jobs (idle back-off %ss)", _POLL_IDLE_SEC
    )

    def _claim_one_job_id() -> str | None:
        """Own Session inside worker thread (Session is not thread-safe)."""
        claim_session = factory()
        try:
            return claim_next_queued_map_export_job(claim_session)
        finally:
            claim_session.close()

    while True:
        job_id: str | None = None
        try:
            job_id = await asyncio.to_thread(_claim_one_job_id)
        except Exception:
            logger.exception("claim_next_queued_map_export_job failed")

        if not job_id:
            await asyncio.sleep(_POLL_IDLE_SEC)
            continue

        work = factory()
        try:
            try:
                await run_export_job(
                    work,
                    job_id,
                    local_output_dir=local_dir,
                    s3_bucket=bucket if bucket else None,
                    s3_object_prefix=s3_prefix,
                    s3_client=s3,
                )
            except Exception as e:
                logger.exception("Export failed for job %s", job_id)
                work.rollback()
                try:
                    _mark_job_failed(work, job_id, e)
                except Exception:
                    logger.exception(
                        "Could not persist failed status for job %s", job_id
                    )
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

"""Enqueue map_export_jobs from JSON config (daily scheduled public maps).

Run inside the export_map_worker image (or any env with PRISM_ALERTS_DATABASE_URL):

    python -m prism_app.workers.scheduled_public_maps.cron

Default config path: ``prism_app/workers/scheduled_public_maps/config/scheduled_public_maps.json``
(next to this module). Override with ``--config /path/to/file.json`` for tests or one-offs.

**Behavior**

- **Public layout**: optional per-job ``"public": true`` (requires non-empty ``country`` in config). Worker writes
   ``public_maps/{country}/{layer}/{job_id}.{ext}``; ``country`` from job payload only; ``layer`` from ``hazardLayerIds`` on the export URL.
- **Dates**: each ``layer_id`` is resolved against WFP datacube WMS GetCapabilities
  (``https://api.earthobservation.vam.wfp.org/ows``). Latest timestep → ``{date}`` as ``YYYY-MM-DD``.
- **Priority**: jobs enqueue with priority 100 vs interactive default 200 —
  see ``export_jobs/claim.py`` (``ORDER BY priority DESC``).
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

from prism_app.export_jobs.db import get_export_jobs_session_factory
from prism_app.export_jobs.priority import MAP_EXPORT_JOB_PRIORITY_SCHEDULED_PUBLIC
from prism_app.export_jobs.service import enqueue_map_export_job
from prism_app.export_s3 import map_export_s3_client
from prism_app.models import ExportFormat, MapExportRequestModel
from prism_app.workers.scheduled_public_maps.layer_days import (
    latest_date_yyyy_mm_dd_for_layer,
)
from pydantic import BaseModel, ConfigDict, Field, model_validator

logger = logging.getLogger(__name__)

_CAPABILITIES_HTTP_TIMEOUT_SEC = 120.0


class ScheduledPublicMapJobGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")

    country: str | None = Field(
        default=None,
        description="Optional; copied into map export job payload for public_maps path + logs.",
    )
    public: bool = Field(
        default=False,
        description="When true, worker uploads under public_maps/… (requires ``country``).",
    )
    layer_ids: list[str] = Field(..., min_length=1)
    export_url_template: str = Field(
        ...,
        min_length=1,
        description="Absolute /export URL pattern; must contain {date} and {layer_id}.",
    )
    format: ExportFormat = "pdf"
    viewportWidth: int | None = None
    viewportHeight: int | None = None

    @model_validator(mode="after")
    def validate_group(self) -> ScheduledPublicMapJobGroup:
        t = self.export_url_template
        if "{date}" not in t or "{layer_id}" not in t:
            raise ValueError(
                "export_url_template must include both {date} and {layer_id}"
            )
        if self.public:
            cty = self.country
            if not (cty and cty.strip()):
                raise ValueError("country is required when public is true")
        return self


class ScheduledPublicMapsFile(BaseModel):
    jobs: list[ScheduledPublicMapJobGroup]


def load_config(path: Path) -> ScheduledPublicMapsFile:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return ScheduledPublicMapsFile.model_validate(raw)


def _build_request(
    export_url: str,
    group: ScheduledPublicMapJobGroup,
    _layer_id: str,
) -> MapExportRequestModel:
    payload: dict[str, Any] = {
        "urls": [export_url],
        "format": group.format,
    }
    if group.viewportWidth is not None:
        payload["viewportWidth"] = group.viewportWidth
    if group.viewportHeight is not None:
        payload["viewportHeight"] = group.viewportHeight
    if group.country is not None and group.country.strip():
        payload["country"] = group.country.strip()
    if group.public:
        payload["publicMapUpload"] = True
    return MapExportRequestModel.model_validate(payload)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
    )
    parser = argparse.ArgumentParser(description=__doc__)
    default_config = (
        Path(__file__).resolve().parent / "config" / "scheduled_public_maps.json"
    )
    parser.add_argument(
        "--config",
        "-c",
        type=Path,
        default=default_config,
        help=f"JSON config file (default: {default_config})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="log actions without writing map_export_jobs",
    )
    args = parser.parse_args(argv)

    path: Path = args.config
    if not path.is_file():
        logger.error("Config file not found: %s", path)
        return 1

    try:
        config = load_config(path)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Invalid config %s: %s", path, exc)
        return 1

    timeout_sec = _CAPABILITIES_HTTP_TIMEOUT_SEC

    factory = get_export_jobs_session_factory()
    enqueued = 0
    skipped = 0
    idx = 0
    s3_client = None if args.dry_run else map_export_s3_client()

    for group in config.jobs:
        for layer_id in group.layer_ids:
            label = f"{group.country or '?'}:{layer_id}" if group.country else layer_id
            cover_date = latest_date_yyyy_mm_dd_for_layer(
                layer_id, timeout_sec=timeout_sec
            )
            if not cover_date:
                logger.warning("skip %s — no capability dates", label)
                continue
            export_url = group.export_url_template.replace(
                "{date}", cover_date
            ).replace("{layer_id}", layer_id)
            try:
                req = _build_request(export_url, group, layer_id)
            except ValueError as exc:
                logger.error("invalid export URL for %s: %s", label, exc)
                return 1

            if args.dry_run:
                logger.info(
                    "[dry-run] would enqueue %s date=%s url=%s",
                    label,
                    cover_date,
                    export_url[:200],
                )
                idx += 1
                continue

            session = factory()
            try:
                _job, status = enqueue_map_export_job(
                    session,
                    req,
                    s3_client=s3_client,
                    dedupe=True,
                    priority=MAP_EXPORT_JOB_PRIORITY_SCHEDULED_PUBLIC,
                )
                if status == 202:
                    enqueued += 1
                    logger.info(
                        "Enqueued %s date=%s http=%s", label, cover_date, status
                    )
                else:
                    skipped += 1
                    logger.info(
                        "Skipped duplicate or active %s date=%s http=%s",
                        label,
                        cover_date,
                        status,
                    )
            finally:
                session.close()
            idx += 1

    logger.info(
        "scheduled_public_maps_cron finished enqueued=%s skipped=%s ops=%s dry_run=%s",
        enqueued,
        skipped,
        idx,
        args.dry_run,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""E2E helpers: validate a MapExportRequest JSON file and render via export_maps."""

from __future__ import annotations

import json
from pathlib import Path

from prism_app.export_maps import export_maps
from prism_app.models import MapExportRequestModel


async def render_map_export_fixture(
    fixture_path: Path,
) -> tuple[bytes, str]:
    """
    Load fixture JSON, validate as MapExportRequestModel, return (body, content_type).
    """
    raw = json.loads(fixture_path.read_text(encoding="utf-8"))
    req = MapExportRequestModel.model_validate(raw)
    return await export_maps(
        urls=req.urls,
        viewport_width=req.viewportWidth,
        viewport_height=req.viewportHeight,
        format_type=req.format,
    )

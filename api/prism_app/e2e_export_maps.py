"""E2E helpers: validate a MapExportRequest JSON file or dict and render via export_maps."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from prism_app.export_maps import export_maps
from prism_app.models import MapExportRequestModel


async def render_map_export_fixture(
    fixture: Path | dict[str, Any],
) -> tuple[bytes, str]:
    if isinstance(fixture, Path):
        raw: dict[str, Any] = json.loads(fixture.read_text(encoding="utf-8"))
    else:
        raw = fixture
    req = MapExportRequestModel.model_validate(raw)
    return await export_maps(
        urls=req.urls,
        viewport_width=req.viewportWidth,
        viewport_height=req.viewportHeight,
        format_type=req.format,
    )

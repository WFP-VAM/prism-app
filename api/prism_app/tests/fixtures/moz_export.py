"""Mozambique map-export fixture URLs (see frontend useExportParams for defaults omitted here)."""

from __future__ import annotations

from typing import Any, Final

# Default frontend host for export-job tests; override via base_url kwarg or env in CI if needed.
MAP_EXPORT_FIXTURE_BASE_URL: Final[str] = (
    "https://staging-prism-frontend--1848-6327fmyc.web.app"
)

# Required non-defaults vs useExportParams: bounds+zoom (viewport), aspectRatio=Auto (else 4:3),
# title template, fullLayerDescription + bottomLogoVisibility (toggle defaults differ).
_MOZ_EXPORT_PATH: Final[str] = (
    "/export?hazardLayerIds=precip_blended_dekad&date={date}"
    "&bounds=22.29870619747473%2C-27.069605632989003%2C43.18421533413513%2C-10.19032408008239"
    "&zoom=4.976245242978448&aspectRatio=Auto"
    "&title=Mozambique%3A+%7Bdate_coverage%7D"
    "&fullLayerDescription=true&bottomLogoVisibility=false"
)


def moz_export_map_request_dict(
    *,
    base_url: str | None = None,
    dates: tuple[str, str, str] | None = None,
) -> dict[str, Any]:
    """JSON-serializable body for MapExportRequestModel (PDF, 3 dekads)."""
    base = (base_url or MAP_EXPORT_FIXTURE_BASE_URL).rstrip("/")
    ds = dates or ("2026-04-01", "2026-04-11", "2026-04-21")
    urls = [f"{base}{_MOZ_EXPORT_PATH.format(date=d)}" for d in ds]
    return {
        "urls": urls,
        "viewportWidth": 1200,
        "viewportHeight": 1028,
        "format": "pdf",
    }

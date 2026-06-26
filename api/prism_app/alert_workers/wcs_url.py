"""WCS GetCoverage URL builder (WCS 1.0.x), matching ``prism-common``."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from prism_app.alert_workers.bbox_utils import bbox_to_string, check_extent, scale_image


def _sorted_format_url(base_url: str, params: dict[str, Any]) -> str:
    """Merge ``params`` into ``base_url`` query and sort keys (prism-common)."""
    parsed = urlparse(base_url)
    merged = dict(parse_qsl(parsed.query, keep_blank_values=True))
    for k, v in params.items():
        if v is None:
            merged.pop(k, None)
        else:
            merged[k] = str(v)
    query = urlencode(sorted(merged.items()))
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            query,
            parsed.fragment,
        ),
    )


def parse_service(url: str) -> str | None:
    parsed = urlparse(url)
    q = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if q.get("service"):
        return q["service"]
    import re

    m = re.search(r"(wcs|wfs|wms|wmts|wps)/?$", parsed.path, re.I)
    return m.group(1).upper() if m else None


def get_capabilities_url(
    service_url: str,
    *,
    version: str = "1.0.0",
    extra_params: dict[str, str] | None = None,
) -> str:
    parsed = urlparse(service_url)
    base_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if extra_params:
        base_params.update(extra_params)
    service = base_params.get("service") or parse_service(service_url)
    if not service:
        raise ValueError("unable to set service parameter")
    merged = {
        **base_params,
        "request": "GetCapabilities",
        "service": service,
        "version": version,
    }
    return _sorted_format_url(
        f"{parsed.scheme}://{parsed.netloc}{parsed.path}",
        merged,
    )


def create_get_coverage_url(
    *,
    bbox: tuple[float, float, float, float],
    layer_id: str,
    url: str,
    date: datetime | date,
    version: str = "1.0.0",
    crs: str = "EPSG:4326",
    raster_format: str = "GeoTIFF",
    width: int | None = None,
    height: int | None = None,
    max_pixels: int = 5096,
    resolution: int = 256,
) -> str:
    check_extent(bbox)
    if width is None or height is None:
        w, h = scale_image(bbox, resolution=resolution, max_pixels=max_pixels)
        width, height = w, h
    if isinstance(date, datetime):
        time_s = date.strftime("%Y-%m-%d")
    else:
        time_s = date.isoformat()
    if version.startswith("2"):
        raise NotImplementedError("WCS 2.x GetCoverage not ported for alerts")
    return _sorted_format_url(
        url,
        {
            "request": "GetCoverage",
            "service": "WCS",
            "version": version,
            "coverage": layer_id,
            "crs": crs,
            "bbox": bbox_to_string(bbox),
            "width": str(width),
            "height": str(height),
            "format": raster_format,
            "time": time_s,
        },
    )

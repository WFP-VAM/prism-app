"""Build stable client download filenames for map export artifacts (mirrors frontend batch naming)."""

from __future__ import annotations

from typing import Literal
from urllib.parse import parse_qs, urlparse

_UNSAFE_FILENAME_CHARS = frozenset('<>:"/\\|?*')


def sanitize_filename_part(value: str) -> str:
    s = "".join(
        "_" if (ord(ch) < 32 or ord(ch) == 127 or ch in _UNSAFE_FILENAME_CHARS) else ch
        for ch in value.strip()
    )
    while "__" in s:
        s = s.replace("__", "_")
    return s.strip("_")


def iso_date_to_snake(date_str: str) -> str:
    """Normalize common URL date fragments to ``YYYY_MM_DD`` stem segment."""
    t = date_str.strip()
    t = t.replace("/", "_").replace("\\", "_")
    return t.replace("-", "_")


def extract_dates_from_urls_sorted(urls: list[str]) -> list[str]:
    """Return sorted unique date query values (ISO strings sort chronologically when day-first avoided)."""
    from prism_app.utils import extract_dates_from_urls

    raw = extract_dates_from_urls(urls)
    return sorted(dict.fromkeys(raw))


def extract_primary_hazard_layer_id(urls: list[str]) -> str:
    if not urls:
        return "layer"
    parsed = urlparse(urls[0].strip())
    qs = parse_qs(parsed.query, keep_blank_values=True)
    raw = (qs.get("hazardLayerIds") or qs.get("hazardLayerIds[]") or [None])[0]
    if not raw:
        return "layer"
    first = raw.split(",")[0].strip()
    return first if first else "layer"


def build_map_export_download_filename(
    *,
    country: str,
    layer_id: str,
    urls: list[str],
    format_type: Literal["pdf", "png"],
    admin_area: str | None = None,
) -> str:
    safe_country = sanitize_filename_part(country) or "export"
    safe_area = sanitize_filename_part(admin_area) if admin_area else None
    safe_layer = sanitize_filename_part(layer_id) or "layer"
    ext = ".pdf" if format_type == "pdf" else ".zip"

    prefix = f"{safe_country}_{safe_area}" if safe_area else safe_country

    dates = extract_dates_from_urls_sorted(urls)
    if not dates:
        return f"{prefix}_{safe_layer}_export{ext}"

    snakes = [iso_date_to_snake(d) for d in dates]
    start_snake = snakes[0]
    end_snake = snakes[-1]
    date_stem = (
        start_snake if start_snake == end_snake else f"{start_snake}_to_{end_snake}"
    )
    base = f"{prefix}_{safe_layer}_{date_stem}"
    return f"{base}{ext}"


def map_export_download_filename_from_payload(payload: dict) -> str | None:
    """Derive artifact download filename from stored ``request_payload_json``."""
    from prism_app.models import MapExportRequestModel

    try:
        req = MapExportRequestModel.model_validate(payload)
    except Exception:
        return None
    layer_id = extract_primary_hazard_layer_id(req.urls)
    return build_map_export_download_filename(
        country=req.country,
        layer_id=layer_id,
        urls=req.urls,
        format_type=req.format,
        admin_area=req.adminArea,
    )

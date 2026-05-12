"""Build map export job requests from schedule export URL text."""

from __future__ import annotations

from prism_app.models import ExportFormat, MapExportRequestModel
from prism_app.utils import validate_export_url

DEFAULT_SCHEDULE_EXPORT_FORMAT: ExportFormat = "pdf"


def parse_schedule_export_urls(value: str) -> list[str]:
    """Split pasted schedule text into non-empty export URLs."""
    return [line.strip() for line in value.splitlines() if line.strip()]


def normalize_schedule_export_urls(value: str) -> str:
    """Canonical newline-separated export URLs for persistence."""
    return "\n".join(parse_schedule_export_urls(value))


def map_export_request_from_schedule_export_urls(value: str) -> MapExportRequestModel:
    """Validate schedule export URLs and build the queued job payload."""
    urls = parse_schedule_export_urls(value)
    if not urls:
        raise ValueError("At least one export URL is required.")
    for url in urls:
        validate_export_url(url)
    return MapExportRequestModel(urls=urls, format=DEFAULT_SCHEDULE_EXPORT_FORMAT)

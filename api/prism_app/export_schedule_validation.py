"""Schedule export_url placeholder checks (client URLs may encode ``{`` as ``%7B``)."""

from __future__ import annotations

from prism_app.utils import validate_export_url

_PLACEHOLDER_ENCODINGS = (
    ("%7Bdate%7D", "{date}"),
    ("%7Blayer_id%7D", "{layer_id}"),
)


def normalize_schedule_export_url(export_url: str) -> str:
    """Return export_url with literal ``{date}`` / ``{layer_id}`` placeholders."""
    normalized = export_url
    for encoded, literal in _PLACEHOLDER_ENCODINGS:
        normalized = normalized.replace(encoded, literal)
    return normalized


def validate_schedule_export_url(export_url: str, layer_id: str) -> str:
    """Validate template placeholders and export rules; return canonical export_url."""
    canonical = normalize_schedule_export_url(export_url)
    missing = [
        placeholder
        for placeholder in ("{date}", "{layer_id}")
        if placeholder not in canonical
    ]
    if missing:
        raise ValueError(
            f"export_url missing placeholders: {', '.join(missing)}",
        )
    sample_url = canonical.replace("{date}", "2000-01-01").replace(
        "{layer_id}",
        layer_id,
    )
    validate_export_url(sample_url)
    return canonical

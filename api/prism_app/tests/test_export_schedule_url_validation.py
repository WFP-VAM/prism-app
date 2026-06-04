"""Tests for schedule export_url contract validation."""

from __future__ import annotations

import pytest
from prism_app.export_schedule_validation import (
    normalize_schedule_export_url,
    validate_schedule_export_url,
)


def test_validate_schedule_export_url_accepts_template_with_placeholders() -> None:
    url = (
        "http://localhost/export?"
        "date={date}&hazardLayerIds={layer_id}&bounds=1,2,3,4"
    )
    assert validate_schedule_export_url(url, "precip_blended_dekad") == url


def test_validate_schedule_export_url_accepts_encoded_placeholders() -> None:
    encoded = (
        "http://localhost:3000/export?"
        "bounds=1,2,3,4&date=%7Bdate%7D&hazardLayerIds=%7Blayer_id%7D"
    )
    canonical = validate_schedule_export_url(encoded, "precip_blended_dekad")
    assert "{date}" in canonical
    assert "{layer_id}" in canonical
    assert "%7Bdate%7D" not in canonical


def test_normalize_schedule_export_url_decodes_braces() -> None:
    assert (
        normalize_schedule_export_url("http://x/export?date=%7Bdate%7D")
        == "http://x/export?date={date}"
    )


def test_validate_schedule_export_url_rejects_missing_layer_placeholder() -> None:
    with pytest.raises(ValueError, match="layer_id"):
        validate_schedule_export_url(
            "http://localhost/export?date={date}",
            "precip_blended_dekad",
        )

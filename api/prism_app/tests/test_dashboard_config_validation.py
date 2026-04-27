"""Unit tests for dashboard JSON validation (admin ingest)."""

import json
from pathlib import Path

import pytest

from pydantic import ValidationError

from prism_app.dashboard_config_validation import (
    DashboardConfigPayload,
    format_dashboard_config_validation_message,
    validate_and_dump_dashboard_config,
)


def _sample_list() -> list[dict]:
    repo = Path(__file__).resolve().parents[3]
    raw = json.loads(
        (repo / "frontend" / "test" / "fixtures" / "dashboard-config.sample.json").read_text()
    )
    assert isinstance(raw, list) and len(raw) >= 1
    return raw


def _sample_one_row() -> dict:
    rows = _sample_list()
    return rows[0]


def test_validate_single_object_as_one_item_list() -> None:
    row = _sample_one_row()
    out = validate_and_dump_dashboard_config(row)
    assert len(out) == 1
    assert out[0]["title"] == row["title"]
    assert "path" in out[0] and out[0]["path"]


def test_validate_one_element_array() -> None:
    row = _sample_one_row()
    out = validate_and_dump_dashboard_config([row])
    assert len(out) == 1
    assert out[0]["title"] == row["title"]


def test_validate_full_multidashboard_file() -> None:
    full = _sample_list()
    out = validate_and_dump_dashboard_config(full)
    assert len(out) == len(full) == 3
    for i, row in enumerate(out):
        assert row["title"] == full[i]["title"]
        assert "path" in row and row["path"]


def test_reject_empty_array() -> None:
    with pytest.raises(ValueError, match="at least one"):
        validate_and_dump_dashboard_config([])


def test_reject_primitives() -> None:
    with pytest.raises(ValueError, match="JSON object or a non-empty"):
        validate_and_dump_dashboard_config("string")
    with pytest.raises(ValueError):
        validate_and_dump_dashboard_config(None)


def test_format_validation_message_brief_no_pydantic_url() -> None:
    try:
        DashboardConfigPayload.model_validate(
            {
                "title": "Test",
                "firstColumn": [{"type": "MAP", "preSelectedMapLayers": []}],
                "pathdf": "rainfall-anomaly-2024-2025-rainy-season",
            }
        )
    except ValidationError as e:
        msg = format_dashboard_config_validation_message(e)
    else:
        raise AssertionError("expected validation error")
    assert "errors.pydantic.dev" not in msg
    assert "Extra inputs are not permitted" not in msg
    assert "for dashboard config" in msg
    assert "1 validation error" in msg
    assert "pathdf" in msg


def test_extra_field_in_row_raises_valueerror_with_brief_message() -> None:
    row = _sample_one_row()
    row = {**row, "isEditabledd": True}
    with pytest.raises(ValueError) as exc_info:
        validate_and_dump_dashboard_config([row])
    msg = str(exc_info.value)
    assert "errors.pydantic.dev" not in msg
    assert "Extra inputs are not permitted" not in msg
    assert "for dashboard config" in msg
    assert "0.isEditabledd" in msg

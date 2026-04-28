"""Unit tests for dashboard layout JSON validation (admin ingest)."""

import json
from pathlib import Path

import pytest
from prism_app.dashboard_config_validation import (
    DashboardConfigPayload,
    format_dashboard_config_validation_message,
    validate_and_dump_dashboard_config,
)
from pydantic import ValidationError


def _sample_list() -> list[dict]:
    repo = Path(__file__).resolve().parents[3]
    raw = json.loads(
        (
            repo / "frontend" / "test" / "fixtures" / "dashboard-config.sample.json"
        ).read_text()
    )
    assert isinstance(raw, list) and len(raw) >= 1
    return raw


def _sample_one_row() -> dict:
    rows = _sample_list()
    return rows[0]


def _sample_config_only() -> dict:
    row = _sample_one_row()
    return {
        "firstColumn": row["firstColumn"],
        "secondColumn": row.get("secondColumn", []),
        "thirdColumn": row.get("thirdColumn", []),
    }


def test_validate_single_config_object() -> None:
    config = _sample_config_only()
    out = validate_and_dump_dashboard_config(config)
    assert len(out["firstColumn"]) == len(config["firstColumn"])
    assert len(out["secondColumn"]) == len(config["secondColumn"])
    assert len(out["thirdColumn"]) == len(config["thirdColumn"])
    assert out["firstColumn"][0]["type"] == config["firstColumn"][0]["type"]
    assert out["secondColumn"][0]["type"] == config["secondColumn"][0]["type"]


def test_reject_array_config_payload() -> None:
    with pytest.raises(ValueError, match="JSON object"):
        validate_and_dump_dashboard_config([_sample_config_only()])


def test_reject_primitives() -> None:
    with pytest.raises(ValueError, match="JSON object"):
        validate_and_dump_dashboard_config("string")
    with pytest.raises(ValueError):
        validate_and_dump_dashboard_config(None)


def test_format_validation_message_brief_no_pydantic_url() -> None:
    try:
        DashboardConfigPayload.model_validate(
            {
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
    row = _sample_config_only()
    row = {**row, "isEditabledd": True}
    with pytest.raises(ValueError) as exc_info:
        validate_and_dump_dashboard_config(row)
    msg = str(exc_info.value)
    assert "errors.pydantic.dev" not in msg
    assert "Extra inputs are not permitted" not in msg
    assert "for dashboard config" in msg
    assert "isEditabledd" in msg


def test_dump_excludes_null_optional_fields_for_frontend_parity() -> None:
    row = {
        "firstColumn": [{"type": "TEXT", "content": "ok"}],
        "secondColumn": [
            {
                "type": "TABLE",
                "startDate": "2026-01-01",
                "hazardLayerId": "hazard_layer",
                "baselineLayerId": "baseline_layer",
                "stat": "mean",
                "threshold": None,
            },
            {
                "type": "CHART",
                "startDate": "2026-01-01",
                "layerId": "some_layer",
                "adminUnitId": None,
            },
        ],
    }

    out = validate_and_dump_dashboard_config(row)
    second_col = out["secondColumn"]
    assert "threshold" not in second_col[0]
    assert "adminUnitId" not in second_col[1]

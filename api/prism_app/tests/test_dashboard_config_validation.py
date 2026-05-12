"""Unit tests for dashboard layout JSON validation (admin ingest)."""

import json

import pytest
from prism_app.dashboard.dashboard_config_validation import (
    DashboardConfigPayload,
    format_dashboard_config_validation_message,
    validate_and_dump_dashboard_config,
)
from pydantic import ValidationError

SAMPLE_DASHBOARD_ROWS = json.loads("""
[
  {
    "title": "Rainfall anomaly - 2024/2025 rainy season",
    "isEditable": true,
    "firstColumn": [
      {
        "type": "MAP",
        "defaultDate": "2024-12-21",
        "title": "Rainfall anomaly - Oct to Dec 2024",
        "mapPosition": "left",
        "minMapBounds": [29.48, -28.92, 43.52, -7.08],
        "preSelectedMapLayers": [
          { "layerId": "precip_blended_anomaly_3m", "opacity": 0.8 }
        ]
      }
    ],
    "secondColumn": [
      {
        "type": "MAP",
        "defaultDate": "2025-03-21",
        "title": "Rainfall anomaly - Jan to Mar 2025",
        "mapPosition": "right",
        "minMapBounds": [29.48, -28.92, 43.52, -7.08],
        "preSelectedMapLayers": [
          { "layerId": "precip_blended_anomaly_3m", "opacity": 0.8 }
        ]
      }
    ],
    "thirdColumn": [
      {
        "type": "TEXT",
        "content": "Analyzing the precipitation anomaly for the 2024/25 rainy season, two distinct periods of precipitation can be observed: the first half of the season with well-below-normal rainfall (left side map) and the second half of the season (right side map) with normal to above-normal rainfall across most of the country, with geographic areas where below-normal rainfall continues to be observed, particularly in central and northern Cabo Province.",
        "textUpdatedAt": "2025-09-01"
      }
    ]
  },
  {
    "title": "SPI - 2024/2025 rainy season",
    "firstColumn": [
      {
        "type": "MAP",
        "title": "SPI - Oct 2024 - March 2025",
        "defaultDate": "2025-03-21",
        "mapPosition": "left",
        "minMapBounds": [31, -25, 40, -11],
        "preSelectedMapLayers": [
          { "layerId": "spi_blended_6m", "opacity": 0.7 }
        ]
      }
    ],
    "secondColumn": [
      {
        "type": "TEXT",
        "content": "The six-month Standardized Precipitation Index (SPI) provides a cumulative view of rainfall anomalies and helps contextualize the decadal and monthly fluctuations observed throughout the 2024/25 season. The SPI map clearly highlights severe rainfall deficits (SPI < -1.5; orange to red hues) in several areas of the country, with the greatest concern in the provinces of Cabo Delgado and Niassa. Areas in the provinces of Nampula, Tete, Inhambane, and Maputo also demonstrate an accumulation of rainfall deficits between October 2024 and March 2025. Only a few areas of the country recorded above-normal SPI values \u200b\u200b(blue and purple hues), likely associated with episodes of intense rainfall in February and March of 2025. However, these surpluses were spatially limited and short-lived, without translating into a widespread or sustained improvement in seasonal conditions. Thus, the six-month SPI consolidates evidence of widespread and prolonged water stress, conditions that likely compromised agricultural production, reduced the availability of local water resources, and increased food insecurity in the most affected regions.",
        "textUpdatedAt": "2025-03-01"
      },
      {
        "type": "TABLE",
        "startDate": "2025-03-21",
        "hazardLayerId": "spi_blended_6m",
        "baselineLayerId": "admin_boundaries",
        "stat": "mean",
        "addResultToMap": false,
        "sortColumn": "mean",
        "sortOrder": "asc"
      }
    ],
    "thirdColumn": []
  },
  {
    "title": "Oct - Dec 2024 rainfall anomaly",
    "isEditable": true,
    "firstColumn": [
      {
        "type": "MAP",
        "defaultDate": "2024-12-21",
        "mapPosition": "left",
        "minMapBounds": [31, -25, 40, -11],
        "title": "Rainfall anomaly - Oct - Dec 2024",
        "preSelectedMapLayers": [
          { "layerId": "precip_blended_anomaly_3m", "opacity": 0.7 }
        ]
      }
    ],
    "secondColumn": [
      {
        "type": "CHART",
        "startDate": "2023-12-21",
        "endDate": "2024-12-21",
        "layerId": "precip_blended_anomaly_3m",
        "adminUnitLevel": 0
      },
      {
        "type": "TEXT",
        "content": "Between October and December 2024, most of southern and central Mozambique experienced below-average rainfall, with anomalies typically ranging from 40–80% of the long-term average. Northern Mozambique also show deficits, though slightly less severe. Only small coastal areas near Beira and southern Mozambique approach near-normal conditions (around 80–100%). The time-series chart for Mozambique indicates that rainfall anomalies were near normal through early 2024, followed by a prolonged dry period from mid-year onward, with values steadily declining below 100%. A brief recovery occurred around October–November 2024, when rainfall approached normal levels, but by December 2024, conditions again deteriorated, signaling a return to below-normal rainfall to close the year. Overall, the data suggest a persistent dry trend across much of the region, with only temporary improvement late in the season.",
        "textUpdatedAt": "2025-03-01"
      }
    ]
  }
]
""")


def _sample_config_only() -> dict:
    row = SAMPLE_DASHBOARD_ROWS[0]
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

"""Unit tests for dashboard read normalization helpers."""

from prism_app.published_dashboards import _omit_none_keys


def test_omit_none_keys_removes_nested_null_object_fields() -> None:
    payload = {
        "title": "A",
        "secondColumn": [
            {
                "type": "TABLE",
                "threshold": None,
                "stat": "mean",
            },
            {
                "type": "CHART",
                "adminUnitId": None,
                "layerId": "x",
            },
        ],
    }

    out = _omit_none_keys(payload)
    second_col = out["secondColumn"]
    assert "threshold" not in second_col[0]
    assert "adminUnitId" not in second_col[1]
    assert second_col[1]["layerId"] == "x"


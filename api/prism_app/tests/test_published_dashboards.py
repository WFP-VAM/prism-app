"""Unit tests for dashboard read normalization helpers."""

from prism_app.dashboard.published_dashboards import served_statuses
from prism_app.dashboard.util import omit_none_keys
from prism_app.database.dashboard_model import DashboardStatus


def test_served_statuses_published_only_by_default() -> None:
    assert served_statuses(include_staging=False) == [DashboardStatus.published]


def test_served_statuses_includes_staging_when_requested() -> None:
    statuses = served_statuses(include_staging=True)
    assert DashboardStatus.published in statuses
    assert DashboardStatus.staging in statuses
    # Drafts and archived are never served.
    assert DashboardStatus.draft not in statuses
    assert DashboardStatus.archived not in statuses


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

    out = omit_none_keys(payload)
    second_col = out["secondColumn"]
    assert "threshold" not in second_col[0]
    assert "adminUnitId" not in second_col[1]
    assert second_col[1]["layerId"] == "x"

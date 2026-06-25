"""API tests for GET /dashboards (published, country-scoped)."""

from unittest.mock import patch

from fastapi.testclient import TestClient
from prism_app.main import app

client = TestClient(app)


def test_get_dashboards_requires_country():
    r = client.get("/dashboards")
    assert r.status_code == 422


def test_get_dashboards_503_when_db_inactive():
    with patch("prism_app.main.alert_db") as mock_db:
        mock_db.active = False
        r = client.get("/dashboards", params={"country": "moz"})
    assert r.status_code == 503
    assert "unavailable" in r.json()["detail"].lower()


def test_get_dashboards_returns_merged_config():
    sample = [
        {
            "title": "A",
            "isEditable": True,
            "firstColumn": [],
            "secondColumn": [],
            "thirdColumn": [],
        }
    ]
    with patch("prism_app.main.alert_db") as mock_db:
        mock_db.active = True
        mock_db.engine = object()
        with patch(
            "prism_app.main.merge_published_dashboard_rows_for_country",
            return_value=sample,
        ) as m:
            r = client.get("/dashboards", params={"country": "moz"})
    assert r.status_code == 200
    assert r.json() == sample
    m.assert_called_once_with(mock_db.engine, "moz", include_staging=False)


def test_get_dashboards_forwards_include_staging():
    with patch("prism_app.main.alert_db") as mock_db:
        mock_db.active = True
        mock_db.engine = object()
        with patch(
            "prism_app.main.merge_published_dashboard_rows_for_country",
            return_value=[],
        ) as m:
            r = client.get(
                "/dashboards",
                params={"country": "moz", "include_staging": "true"},
            )
    assert r.status_code == 200
    m.assert_called_once_with(mock_db.engine, "moz", include_staging=True)

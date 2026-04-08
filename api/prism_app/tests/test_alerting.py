import json
import os

import pytest
from fastapi.testclient import TestClient
from prism_app.main import app

client = TestClient(app)


@pytest.mark.network
def test_stats_endpoint_for_alerting():
    """
    Call /stats with known-good parameters.
    Downloads a GeoTIFF (needs network); writable cache comes from tests/conftest.py.
    """
    file_path = os.path.join(os.path.dirname(__file__), "test_alerting_zones.json")
    with open(file_path) as f:
        zones = json.load(f)

    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://data.apps.fao.org/static/data/c3s/MAPSET/AGERA5-ET0-D/C3S.AGERA5-ET0-D.2026-01-D2.tif",
            "zones": zones,
            "geojson_out": False,
        },
    )
    assert response.status_code == 200
    response_object = response.json()
    # assert response is a list of length 1
    assert isinstance(response_object, list)
    assert len(response_object) == 1

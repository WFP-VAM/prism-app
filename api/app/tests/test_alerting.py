import json
import os

from app.database.database import AlertsDataBase
from app.main import app
from app.scripts.add_users import add_users
from fastapi.testclient import TestClient

client = TestClient(app)

import logging

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_stats_endpoint_for_alerting():
    """
    Call /stats with known-good parameters.
    This endpoint can be slow (>1 min) so this test is deactivated by default.
    """
    file_path = os.path.join(os.path.dirname(__file__), "test_alerting_zones.json")
    with open(file_path) as f:
        zones = json.load(f)

    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://api.earthobservation.vam.wfp.org/ows/?bbox=39.65475%2C-13.29948%2C40.22682%2C-12.93309&coverage=rfb_blended_moz_dekad&crs=EPSG%3A4326&format=GeoTIFF&height=61&request=GetCoverage&service=WCS&time=2024-07-21&version=1.0.0&width=94",
            "zones": zones,
            "geojson_out": False,
        },
    )
    assert response.status_code == 200
    repsonse_object = response.json()
    # assert response is a list of length 1
    assert isinstance(repsonse_object, list)
    assert len(repsonse_object) == 1

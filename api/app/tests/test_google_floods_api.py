from app.googleflood import get_google_floods_gauges
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_get_google_floods_gauges():
    """
    This test is not used in the API, but is used to test the get_google_floods_gauges function
    It is used to ensure that the get_google_floods_gauges function returns a valid GeoJSON object
    """
    gauges = get_google_floods_gauges("BD")
    assert gauges["type"] == "FeatureCollection"
    for feature in gauges["features"]:
        assert feature["geometry"]["type"] == "Point"
        assert len(feature["geometry"]["coordinates"]) == 2
        assert "gaugeId" in feature["properties"]
        assert "issuedTime" in feature["properties"]
        assert "severity" in feature["properties"]


def test_get_google_floods_gauges_api():
    """
    This test is used to test the API endpoint for getting Google Floods gauges
    """
    response = client.get("/google-floods/gauges/?region_code=BD")
    assert response.status_code == 200

    response_geojson = response.json()
    assert response_geojson["type"] == "FeatureCollection"
    assert len(response_geojson["features"]) > 0


def test_get_google_floods_gauges_api_case_insensitive():
    """
    This test is used to test the API endpoint for getting Google Floods gauges with a case insensitive region code
    """
    response = client.get("/google-floods/gauges/?region_code=bd")
    assert response.status_code == 200

    response_geojson = response.json()
    assert response_geojson["type"] == "FeatureCollection"
    assert len(response_geojson["features"]) > 0


def test_get_google_floods_gauges_api_requires_valid_region_code():
    """
    This test is used to test the API endpoint for getting Google Floods gauges with an invalid region code
    """
    response = client.get("/google-floods/gauges/?region_code=usa")
    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "region code must be provided and exactly two characters (iso2)."
    )

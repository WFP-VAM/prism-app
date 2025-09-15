import logging

import pytest
from app.googleflood import get_google_floods_gauges, get_google_floods_inundations
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

logging.getLogger("vcr").setLevel(logging.WARNING)


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
)
def test_get_google_floods_gauges():
    """
    Test get_google_floods_gauges returns valid GeoJSON.
    """
    gauges = get_google_floods_gauges(["BD"])
    assert gauges["type"] == "FeatureCollection"
    assert len(gauges["features"]) > 0
    for feature in gauges["features"]:
        assert feature["geometry"]["type"] == "Point"
        assert len(feature["geometry"]["coordinates"]) == 2
        assert "gaugeId" in feature["properties"]
        assert "issuedTime" in feature["properties"]
        assert "severity" in feature["properties"]
        assert "siteName" in feature["properties"]
        assert "thresholds" in feature["properties"]
        assert "gaugeValueUnit" in feature["properties"]


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
    ignore_hosts=["testserver"],
)
def test_get_google_floods_gauges_api():
    """
    Test API endpoint for Google Floods gauges.
    """
    response = client.get("/google-floods/gauges/?region_codes=BD")
    assert response.status_code == 200

    response_geojson = response.json()
    assert response_geojson["type"] == "FeatureCollection"
    assert len(response_geojson["features"]) > 0


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
    ignore_hosts=["testserver"],
)
def test_get_google_floods_gauges_api_case_insensitive():
    """
    Test API with case insensitive region code.
    """
    response = client.get("/google-floods/gauges/?region_codes=bd")
    assert response.status_code == 200

    response_geojson = response.json()
    assert response_geojson["type"] == "FeatureCollection"
    assert len(response_geojson["features"]) > 0


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
    ignore_hosts=["testserver"],
)
def test_get_google_floods_gauges_api_requires_valid_region_code():
    """
    Test API with invalid region code.
    """
    response = client.get("/google-floods/gauges/?region_codes=usa")
    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Region code 'usa' must be exactly two characters (iso2)."
    )


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
    ignore_hosts=["testserver"],
)
def test_get_google_floods_gauge_forecast():
    """
    Test API for Google Floods gauge forecast.
    """
    response = client.get("/google-floods/gauges/forecasts/?gauge_ids=hybas_1121465590")
    assert response.status_code == 200
    response_json = response.json()
    assert len(response_json) == 1
    assert len(response_json["hybas_1121465590"]) > 0
    assert isinstance(response_json["hybas_1121465590"][0]["value"][0], str)
    assert isinstance(response_json["hybas_1121465590"][0]["value"][1], float)


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
    ignore_hosts=["testserver"],
)
def test_get_google_floods_gauge_forecast_multiple_gauges():
    """
    Test API for multiple gauge forecasts.
    """
    gauge_ids = ["hybas_1121465590", "hybas_1121499110"]
    response = client.get(
        "/google-floods/gauges/forecasts/?gauge_ids=" + ",".join(gauge_ids)
    )
    assert response.status_code == 200
    response_json = response.json()
    assert len(response_json) == 2
    for gauge_id, gauge in response_json.items():
        assert gauge_id in gauge_ids
        assert len(gauge) > 0
        assert isinstance(gauge[0]["value"][0], str)
        assert isinstance(gauge[0]["value"][1], float)
    assert len(response.json()) > 0


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
    ignore_hosts=["testserver"],
)
def test_get_google_floods_inundations():
    floods = get_google_floods_inundations(["BD"], run_sequentially=True)
    assert len(floods) > 0


@pytest.mark.vcr(
    match_on=["uri", "method"],
    filter_headers=["Authorization"],
    filter_query_parameters=["key"],
    ignore_hosts=["testserver"],
)
def test_get_google_floods_inundation_api():
    response = client.get(
        "/google-floods/inundations?region_codes=BD&run_sequentially=true"
    )
    assert response.status_code == 200
    assert len(response.json()) > 0

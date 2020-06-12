"""Tests files for the analytics API."""
from app.zonal_stats import calculate_stats


def test_calculate_stats_json_output():
    """
    Test that calculate_stats given a geojson input and
    """

    zones = '/app/tests/small_admin_boundaries.json'
    geotiff = '/app/tests/raster_sample.tif'
    features = calculate_stats(zones, geotiff, geojson_out=False)
    assert len(features) == 26
    assert True


def test_calculate_stats_geojson_output():
    """
    Test that calculate_stats given a geojson input and
    """

    zones = '/app/tests/small_admin_boundaries.json'
    geotiff = '/app/tests/raster_sample.tif'
    features = calculate_stats(zones, geotiff, geojson_out=True)
    assert len(features) == 26
    assert features[0]['type'] == 'Feature'
    assert True

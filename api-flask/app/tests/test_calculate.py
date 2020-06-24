"""Tests files for the analytics API."""
from app.zonal_stats import calculate_stats


def test_calculate_stats_json_output():
    """ Test calculate_stats with geojson_out=False."""

    zones = '/app/tests/small_admin_boundaries.json'
    geotiff = '/app/tests/raster_sample.tif'
    features = calculate_stats(zones, geotiff, geojson_out=False)
    assert len(features) == 26
    assert True


def test_calculate_stats_geojson_output():
    """ Test calculate_stats with geojson_out=True."""

    zones = '/app/tests/small_admin_boundaries.json'
    geotiff = '/app/tests/raster_sample.tif'
    features = calculate_stats(zones, geotiff, geojson_out=True)
    assert len(features) == 26
    assert features[0]['type'] == 'Feature'
    assert True


def test_calculate_stats_with_group_by():
    """ Test calculate_stats with a group_by argument."""

    zones = '/app/tests/small_admin_boundaries.json'
    geotiff = '/app/tests/raster_sample.tif'
    features = calculate_stats(
        zones, geotiff, group_by='ADM1_PCODE', geojson_out=False)
    assert len(features) == 4
    assert True

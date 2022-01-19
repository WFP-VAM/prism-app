"""Tests files for the analytics API."""
from datetime import datetime, timezone
from unittest.mock import patch

from app.kobo import get_form_responses
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
        zones,
        geotiff,
        group_by='ADM1_PCODE',
        geojson_out=False,
        intersect_threshold=1
    )
    assert len(features) == 4
    assert True


def test_calculate_stats_wfs_polygons():
    """ Test calculate_stats with a group_by argument."""

    zones = '/app/tests/small_admin_boundaries.json'
    geotiff = '/app/tests/raster_sample.tif'
    wfs_response = {'filter_property_key': 'label', 'path': '/app/tests/wfs_response.json'}

    features = calculate_stats(
        zones, geotiff, geojson_out=False, wfs_response=wfs_response)
    assert len(features) == 5

    features = calculate_stats(
        zones, geotiff, group_by='ADM1_PCODE', geojson_out=False, wfs_response=wfs_response)
    assert len(features) == 2

    assert True


@patch('app.kobo.get_responses_from_kobo')
@patch('app.kobo.get_kobo_params')
def test_kobo_response_form(kobo_params, kobo_data):
    """ Test form response parsing. """
    form_fields = {
        'name': 'name',
        'datetime': 'date',
        'geom': 'geom',
        'filters': {
            'status': 'Approved'
        }
    }
    kobo_params.return_value = (('test', 'test'), form_fields)

    kobo_data_json = [
        {
            'date': '2019-09-22T21:35:54',
            'geom': '21.908012 95.986908 0 0',
            'value': '2',
            '_validation_status': {'label': 'Approved'},
            'username': 'jorge'
        },
        {
            'date': '2021-01-01T10:00:08',
            'geom': '21.916222 95.955971 0 0',
            'value': '3',
            '_validation_status': {'label': 'Approved'},
            'username': 'test'
        }
    ]

    labels = {'value': 'integer', 'geom': 'geopoint', 'username': 'username', 'date': 'datetime'}
    kobo_data.return_value = (kobo_data_json, labels)

    begin = datetime(2000, 1, 1).replace(tzinfo=timezone.utc)
    end = datetime(2030, 1, 1).replace(tzinfo=timezone.utc)
    forms = get_form_responses(begin, end)

    assert len(forms) == 2

    assert forms[0]['lat'] == 21.908012
    assert forms[0]['lon'] == 95.986908
    assert forms[0]['value'] == 2
    assert forms[0]['status'] == 'Approved'

    form_fields = {
        'name': 'name',
        'datetime': 'date',
        'geom': 'geom',
        'filters': {
            'status': 'Approved',
            'username': 'jorge'
        }
    }
    kobo_params.return_value = (('test', 'test'), form_fields)
    forms = get_form_responses(begin, end)

    assert len(forms) == 1

    # Test Filter
    begin = datetime(2000, 1, 1).replace(tzinfo=timezone.utc)
    end = datetime(2020, 1, 1).replace(tzinfo=timezone.utc)
    forms = get_form_responses(begin, end)
    assert len(forms) == 1

    assert True

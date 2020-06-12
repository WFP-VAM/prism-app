"""Tests files for the analytics API."""
from app.main import calculate_stats


def test_calculate_stats():
    """
    Test that _iterate_in_slices always stays below the given output size.

    Specifically tests the case when the batch size foes not fit evenlty into the
    total size. In addition, test that no extra iterations are required.
    """

    zones = '/app/tests/small_admin_boundaries.json'
    geotiff = '/app/tests/raster_sample.tif'
    features = calculate_stats(zones, geotiff)
    print(features)
    assert len(features) == 26
    assert True

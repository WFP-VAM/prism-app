"""Calulate zonal statistics and return a json or a geojson."""
import json
import logging

from rasterstats import zonal_stats

from timer import timed

logger = logging.getLogger('root')


DEFAULT_STATS = ['min', 'max', 'mean', 'median']


def _extract_features_properties(zones):
    with open(zones) as json_file:
        geojson_data = json.load(json_file)
    features = geojson_data.get('features', [])
    return [feature['properties'] for feature in features]


@timed
def calculate_stats(
    zones,
    geotiff,
    group_by=None,
    stats=DEFAULT_STATS,
    prefix='stats_',
    geojson_out=False
):
    """Calculate stats."""
    stats = zonal_stats(
        zones,
        geotiff,
        stats=stats,
        prefix=prefix,
        geojson_out=geojson_out
    )

    if not geojson_out:
        feature_properties = _extract_features_properties(zones)
        stats = [{**properties, **stat}
                 for stat, properties in zip(stats, feature_properties)]
    return stats

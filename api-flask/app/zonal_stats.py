"""Calulate zonal statistics and return a json or a geojson."""
import logging
from collections import defaultdict
from json import dump, load

from rasterstats import zonal_stats

from shapely.geometry import mapping, shape
from shapely.ops import cascaded_union

from timer import timed

logger = logging.getLogger(__name__)


DEFAULT_STATS = ['min', 'max', 'mean', 'median']


def _extract_features_properties(zones):
    with open(zones) as json_file:
        geojson_data = load(json_file)
    features = geojson_data.get('features', [])
    return [feature['properties'] for feature in features]


def _group_zones(zones, group_by):
    """Group zones by a key id and merge polygons."""
    with open(zones) as json_file:
        geojson_data = load(json_file)

    features = geojson_data.get('features', [])

    grouped_polygons = defaultdict(list)

    for zone_feature in features:
        grouped_polygons[zone_feature['properties'][group_by]].append(
            shape(zone_feature['geometry'])
        )

    new_features = []
    for group_id, polygons in grouped_polygons.items():
        new_geometry = mapping(cascaded_union(polygons))

        new_features.append(
            dict(
                type='Feature',
                id=group_id,
                properties=dict([(group_by, group_id)]),
                geometry=dict(
                    type=new_geometry['type'],
                    coordinates=new_geometry['coordinates'])
            )
        )

    outjson = dict(type='FeatureCollection', features=new_features)

    output_file = '{zones}.{group_by}'.format(zones=zones, group_by=group_by)

    with open(output_file, 'w') as outfile:
        dump(outjson, outfile)

    return output_file


@ timed
def calculate_stats(
    zones,
    geotiff,
    group_by=None,
    stats=DEFAULT_STATS,
    prefix='stats_',
    geojson_out=False
):
    """Calculate stats."""
    if group_by:
        zones = _group_zones(zones, group_by)

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

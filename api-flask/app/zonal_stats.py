"""Calulate zonal statistics and return a json or a geojson."""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from json import dump, load
from urllib.parse import urlencode

from app.caching import cache_file, get_json_file
from app.timer import timed

from rasterstats import zonal_stats

from shapely.geometry import mapping, shape
from shapely.ops import cascaded_union


logger = logging.getLogger(__name__)


DEFAULT_STATS = ['min', 'max', 'mean', 'median']


def get_wfs_response(wfs_params):
    """
    Execute Web Feature Service (WFS) request to external OGC server.

    This request returns geospatial features that match required filters within cql_filter param.

    https://docs.geoserver.org/stable/en/user/services/wfs/reference.html
    """
    cql_filter = []
    if 'time' in wfs_params.keys():
        from_date = datetime.strptime(wfs_params.get('time'), '%Y-%m-%d')
        to_date = from_date + timedelta(days=1)

        time_filters = ['timestamp AFTER {}'.format(from_date.isoformat()),
                        'timestamp BEFORE {}'.format(to_date.isoformat())]

        cql_filter.extend(time_filters)

    params = {
        'service': 'WFS',
        'version': '1.0.0',
        'request': 'GetFeature',
        'typeName': wfs_params.get('layer_name'),
        'outputFormat': 'application/json',
    }

    if len(cql_filter) > 0:
        params['cql_filter'] = ' AND '.join(cql_filter)

    wfs_url = '{url}?{params}'.format(url=wfs_params.get('url'), params=urlencode(params))

    wfs_response_path = cache_file(url=wfs_url, prefix='wfs')

    return wfs_response_path


def _extract_features_properties(zones, is_path=True):
    if is_path is True:
        with open(zones) as json_file:
            zones = load(json_file)
    return [f['properties'] for f in zones.get('features', [])]


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


def _create_shapely_geoms(geojson_dict):
    """Read and parse geojson dictionary geometries into shapely objects."""
    return [shape(f.get('geometry')) for f in geojson_dict.get('features')
            if f.get('geometry').get('type') in ['MultiPolygon', 'Polygon']]


def _get_intersected_polygons(zones_geojson, wfs_geojson):
    """Generate polygon intersection between each zone and polygons from wfs response."""
    wfs_shapes = _create_shapely_geoms(wfs_geojson)

    intersected_zones = []
    for zone in zones_geojson.get('features'):
        geom = shape(zone.get('geometry'))

        filtered = [geom.intersection(s) for s in wfs_shapes if geom.intersects(s)]

        if len(filtered) == 0:
            continue

        merged_geom = cascaded_union(filtered)

        properties = zone.get('properties', {})
        # Store as dictionary in order to be used by the frontend.
        properties['geometry'] = mapping(merged_geom)

        intersected_zone = {
            'properties': properties,
            'geom': merged_geom
        }

        intersected_zones.append(intersected_zone)

    return {'features': intersected_zones}


@timed
def calculate_stats(
    zones,
    geotiff,
    group_by=None,
    stats=DEFAULT_STATS,
    prefix='stats_',
    geojson_out=False,
    wfs_response=None
):
    """Calculate stats."""
    if group_by:
        zones = _group_zones(zones, group_by)

    stats_input = zones
    is_path = True
    if wfs_response:
        zones_geojson = get_json_file(zones)
        wfs_geojson = get_json_file(wfs_response)

        zones = _get_intersected_polygons(zones_geojson, wfs_geojson)
        is_path = False
        stats_input = [s.get('geom') for s in zones.get('features')]

    try:
        stats = zonal_stats(
            stats_input,
            geotiff,
            stats=stats,
            prefix=prefix,
            geojson_out=geojson_out
        )
    except Exception as e:
        logger.warn(e)
        stats = []

    if not geojson_out:
        feature_properties = _extract_features_properties(zones, is_path)
        stats = [{**properties, **stat}
                 for stat, properties in zip(stats, feature_properties)]
    return stats

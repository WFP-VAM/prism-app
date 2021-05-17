"""Calulate zonal statistics and return a json or a geojson."""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from json import dump, load

from app.caching import get_geojson_file
from app.timer import timed

from rasterstats import zonal_stats

import requests

from shapely.geometry import GeometryCollection, mapping, shape
from shapely.ops import cascaded_union

from werkzeug.exceptions import InternalServerError

logger = logging.getLogger(__name__)


DEFAULT_STATS = ['min', 'max', 'mean', 'median']


def get_wfs_response(wfs_params, zones):
    """
    Execute Web Feature Service (WFS) request to external OGC server.

    This request returns geospatial features that match required filters within cql_filter param.

    https://docs.geoserver.org/stable/en/user/services/wfs/reference.html
    """
    geoms = [shape(f['geometry']) for f in zones.get('features')]
    envelope = GeometryCollection(geoms).envelope.wkt

    # We make a list and then join
    cql_filter = ['OVERLAPS(shape, {})'.format(envelope)]

    if 'time' in wfs_params.keys():
        from_date = datetime.strptime(wfs_params.get('time'), '%Y-%m-%d')
        to_date = from_date + timedelta(days=1)

        time_filters = ['pub_date AFTER {}'.format(from_date.isoformat()),
                        'pub_date BEFORE {}'.format(to_date.isoformat())]

        cql_filter.extend(time_filters)

    cql_filter = ' AND '.join(cql_filter)

    params = {
        'service': 'WFS',
        'version': '1.0.0',
        'request': 'GetFeature',
        'typeName': wfs_params.get('layer_name'),
        'outputFormat': 'application/json',
        'cql_filter': cql_filter
    }

    resp = requests.get(wfs_params.get('url'), params)
    if resp.status_code != 200:
        logger.error(resp.content)
        err_message = 'Received status code from WFS request: {}'.format(resp.status_code)

        raise InternalServerError(err_message)

    # A WFS response should be always a json response.
    return resp.json()


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


def _get_intersected_polygons(zones_geojson, wfs_response):
    """Generate polygon intersection between each zone and polygons from wfs response."""
    wfs_shapes = _create_shapely_geoms(wfs_response)

    intersected_zones = []
    for zone in zones_geojson.get('features'):
        geom = shape(zone.get('geometry'))

        filtered = [geom.intersection(s) for s in wfs_shapes if geom.intersects(s)]

        if len(filtered) == 0:
            continue

        intersected_zone = {
            'properties': zone.get('properties'),
            'geom': cascaded_union(filtered)
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
        zones_geojson = get_geojson_file(zones)

        zones = _get_intersected_polygons(zones_geojson, wfs_response)
        is_path = False
        stats_input = [s.get('geom') for s in zones.get('features')]

    stats = zonal_stats(
        stats_input,
        geotiff,
        stats=stats,
        prefix=prefix,
        geojson_out=geojson_out
    )

    if not geojson_out:
        feature_properties = _extract_features_properties(zones, is_path)
        stats = [{**properties, **stat}
                 for stat, properties in zip(stats, feature_properties)]
    return stats

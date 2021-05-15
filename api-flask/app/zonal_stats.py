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


def _create_geoms(geojson_dict):
    """Read and parse geojson dictionary geometries into shapely objects."""
    geometries = {}
    for feature in geojson_dict.get('data').get('features'):
        key = feature.get('properties').get(geojson_dict.get('key'))
        geom = shape(feature.get('geometry'))

        geometries[key] = geom

    return geometries


def _compute_wfs_stats(zones_dict, wfs_response, geotiff, stats_params):
    """Compute stats for each individual polygon and geotiff image."""
    wfs_geoms = [shape(f.get('geometry')) for f in wfs_response.get('features')
                 if f.get('geometry').get('type') in ['MultiPolygon', 'Polygon']]
    zones_geoms = _create_geoms(zones_dict)

    results = []
    keys = []
    for key, value in zones_geoms.items():
        filtered = [value.intersection(g) for g in wfs_geoms if value.intersects(g)]

        if len(filtered) == 0:
            continue
        results.append(cascaded_union(filtered))
        keys.append({zones_dict['key']: key})

    stats = zonal_stats(results, geotiff, **stats_params)
    parsed_stats = []
    for stat in stats:
        props = {k: v if v is None else int(v) for k, v in stat['properties'].items()}
        props['geometry'] = stat['geometry']
        parsed_stats.append(props)

    output = [{**key, **stat}
              for stat, key in zip(parsed_stats, keys)]

    return output


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

    if wfs_response:
        zones_key = group_by if group_by else 'TS'
        zones_geojson = get_geojson_file(zones)
        zones_dict = {'key': zones_key, 'data': zones_geojson}

        stats_params = dict(
            stats=stats,
            geojson_out=True,
            prefix=prefix
        )
        zones = _compute_wfs_stats(
            zones_dict,
            wfs_response,
            geotiff,
            stats_params
        )

        return zones

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

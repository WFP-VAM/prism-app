"""Flask API for geospatial utils."""
from werkzeug.exceptions import BadRequest, InternalServerError, NotFound
import logging
from urllib.parse import ParseResult, urlunparse, urlencode
from distutils.util import strtobool
from os import getenv

from app.errors import handle_error, make_json_error

from app.database.alert_database import AlertsDataBase
from app.database.alert_model import AlchemyEncoder, AlertModel

from caching import cache_file, cache_geojson

from flask import Flask, Response, json, jsonify, request

from flask_caching import Cache

from flask_cors import CORS

from timer import timed

from zonal_stats import calculate_stats

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['PROPAGATE_EXCEPTIONS'] = True
app.debug = True
CORS(app)

# For more configuration options, check out the documentation
# Caching durations are in seconds.
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

alert_db = AlertsDataBase()

for code in [400, 401, 403, 404, 405, 500]:
    app.register_error_handler(code, make_json_error)
app.register_error_handler(Exception, handle_error)

@timed
@cache.memoize(3600)
def _calculate_stats(zones, geotiff, stats, prefix, group_by, geojson_out):
    """Calculate stats."""
    return calculate_stats(
        zones,
        geotiff,
        stats=stats,
        prefix=prefix,
        group_by=group_by,
        geojson_out=geojson_out
    )


@app.route('/stats', methods=['POST'])
@timed
def stats():
    """Return zonal statistics."""
    # Accept data as json or form.
    data = request.get_json() or request.form
    geotiff_url = data.get('geotiff_url')
    zones_url = data.get('zones_url')
    zonesGeojson = data.get('zones')

    if geotiff_url is None:
        logger.error('Received {}'.format(data))
        raise BadRequest('geotiff_url is required.')

    if zonesGeojson is None and zones_url is None:
        logger.error('Received {}'.format(data))
        raise BadRequest('One of zones or zones_url is required.')

    geojson_out = strtobool(data.get('geojson_out', 'False'))
    group_by = data.get('group_by')

    geotiff = cache_file(
        prefix='raster',
        url=geotiff_url
    )

    # TODO - Add validation for zones.
    if (zonesGeojson is not None):
        zones = cache_geojson(
            prefix='zones_geojson',
            geojson=zonesGeojson
        )
    else:
        zones = cache_file(
            prefix='zones',
            url=zones_url
        )

    features = _calculate_stats(
        zones,
        geotiff,
        stats=['min', 'max', 'mean', 'median', 'sum', 'std'],
        prefix='stats_',
        group_by=group_by,
        geojson_out=geojson_out
    )

    return jsonify(features)


@app.route('/alerts-all', methods=['GET'])
def alerts_all():
    """Get all alerts in current table."""
    results = alert_db.readall()
    return Response(json.dumps(results, cls=AlchemyEncoder), mimetype='application/json')


@app.route('/alerts/<id>', methods=['GET'])
def get_alert_by_id(id: str = '1'):
    """Get alert data from DB given id."""

    try:
        id = int(id)
    except Exception as e:
        logger.error(f'Failed to fetch alerts: {e}')
        raise InternalServerError('Invalid id')

    results = alert_db.read(AlertModel.id == id)
    return Response(json.dumps(results, cls=AlchemyEncoder), mimetype='application/json')


@app.route('/alerts', methods=['POST'])
def write_alerts():
    """Post new alerts."""
    if not request.is_json:
        raise InternalServerError('InvalidInput')

    try:
        data = request.json
        alert = AlertModel(**data)
        alert_db.write(alert)

    except Exception as e:
        logger.error(e)
        raise e

    return Response(response='Success', status=200)


@app.route('/demo', methods=['GET'])
@timed
def stats_demo():
    """Return examples of zonal statistics."""
    # The GET endpoint is used for demo purposes only
    geotiff_url = urlunparse(
        ParseResult(
            scheme='https',
            netloc='mongolia.sibelius-datacube.org:5000',
            path='/',
            params='',
            query=urlencode({
                'service': 'WCS',
                'request': 'GetCoverage',
                'version': '1.0.0',
                'coverage': 'ModisAnomaly',
                'crs': 'EPSG:4326',
                'bbox': '86.5,36.7,119.7,55.3',
                'width': '1196',
                'height': '672',
                'format': 'GeoTIFF',
                'time': '2020-03-01'
            }),
            fragment='',
        )
    )

    zones_url = urlunparse(
        ParseResult(
            scheme='https',
            netloc='prism-admin-boundaries.s3.us-east-2.amazonaws.com',
            path='mng_admin_boundaries.json',
            params='',
            query='',
            fragment=''
        )
    )

    geotiff = cache_file(
        prefix='raster_test',
        url=geotiff_url
    )

    zones = cache_file(
        prefix='zones_test',
        url=zones_url
    )

    geojson_out = request.args.get('geojson_out', 'False')
    group_by = request.args.get('group_by', None)

    geojson_out = strtobool(geojson_out)

    features = _calculate_stats(
        zones,
        geotiff,
        stats=['min', 'max', 'mean', 'median', 'sum', 'std'],
        prefix='stats_',
        group_by=group_by,
        geojson_out=geojson_out
    )

    # TODO - Properly encode before returning. Mongolian characters are returned as hex.
    return jsonify(features)


if __name__ == '__main__' and getenv('FLASK_ENV') == 'development':
    # Only for debugging while developing
    app.run(host='0.0.0.0', debug=True, port=80)

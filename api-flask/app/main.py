"""Flask API for geospatial utils."""
import logging
from distutils.util import strtobool
from os import getenv
from urllib.parse import ParseResult, urlencode, urlunparse

from app.caching import cache_file, cache_geojson
from app.database.alert_database import AlertsDataBase
from app.database.alert_model import AlchemyEncoder, AlertModel
from app.errors import handle_error, make_json_error
from app.timer import timed
from app.zonal_stats import calculate_stats, get_wfs_response

from ews import get_ews_location_response, get_ews_response, parse_ews_params

from flask import Flask, Response, json, jsonify, request

from flask_caching import Cache

from flask_cors import CORS

from kobo import get_form_responses, parse_datetime_params

import rasterio

from werkzeug.exceptions import BadRequest, InternalServerError, NotFound


logging.basicConfig(level=logging.DEBUG)
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
def _calculate_stats(zones,
                     geotiff,
                     stats,
                     prefix,
                     group_by,
                     geojson_out,
                     wfs_response):
    """Calculate stats."""
    return calculate_stats(
        zones,
        geotiff,
        stats=stats,
        prefix=prefix,
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=wfs_response
    )


@app.route('/stats', methods=['POST'])
@timed
def stats():
    """Return zonal statistics."""
    # Accept data as json or form.
    logger.debug('New stats request:')
    logger.debug(request)
    data = request.get_json() or request.form
    geotiff_url = data.get('geotiff_url')
    zones_url = data.get('zones_url')
    zones_geojson = data.get('zones')

    if geotiff_url is None:
        logger.error('Received {}'.format(data))
        raise BadRequest('geotiff_url is required.')

    if zones_geojson is None and zones_url is None:
        logger.error('Received {}'.format(data))
        raise BadRequest('One of zones or zones_url is required.')

    geojson_out = strtobool(data.get('geojson_out', 'False'))
    group_by = data.get('group_by')

    geotiff = cache_file(
        prefix='raster',
        url=geotiff_url,
        extension='tif'
    )

    # TODO - Add validation for zones.
    if (zones_geojson is not None):
        zones = cache_geojson(
            prefix='zones_geojson',
            geojson=zones_geojson
        )
    else:
        zones = cache_file(
            prefix='zones',
            url=zones_url,
            extension='json',
        )

    wfs_params = data.get('wfs_params', None)

    wfs_response = None
    if wfs_params is not None:
        # Validate required keys.
        required_keys = ['layer_name', 'url', 'time']
        missing = [f for f in required_keys if f not in wfs_params.keys()]

        if len(missing) > 0:
            logger.error('Received {}'.format(data))
            err_message = '{} required within wfs_params object'
            joined_missing = ','.join(missing)

            raise BadRequest(err_message.format(joined_missing))

        wfs_response = get_wfs_response(wfs_params)

    features = _calculate_stats(
        zones,
        geotiff,
        stats=['min', 'max', 'mean', 'median', 'sum', 'std'],
        prefix='stats_',
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=wfs_response
    )

    return jsonify(features)


# TODO - Secure endpoint
# @app.route('/alerts-all', methods=['GET'])
# def alerts_all():
#     """Get all alerts in current table."""
#     results = alert_db.readall()
#     return Response(json.dumps(results, cls=AlchemyEncoder), mimetype='application/json')
@app.route('/kobo/forms', methods=['GET'])
def get_kobo_forms():
    """Get all form responses."""
    begin_datetime, end_datetime = parse_datetime_params()
    form_responses = get_form_responses(begin_datetime, end_datetime)

    return Response(json.dumps(form_responses), mimetype='application/json')


@app.route('/ews/location/data', methods=['GET'])
def get_ews_location_data():
    """Get datapoints for only one location."""
    _, begin_datetime, end_datetime = parse_ews_params()
    resp = get_ews_location_response(begin_datetime, end_datetime)
    return Response(json.dumps(resp), mimetype='application/json')


@app.route('/ews/data', methods=['GET'])
@cache.cached(timeout=900, query_string=True)
def get_ews_data():
    """Get all early warning from all locations."""
    only_dates, begin_datetime, end_datetime = parse_ews_params()
    ews_responses = get_ews_response(only_dates, begin_datetime, end_datetime)
    return Response(json.dumps(ews_responses), mimetype='application/json')


@app.route('/alerts/<id>', methods=['GET'])
def alert_by_id(id: str = '1'):
    """Get alert data from DB given id."""
    try:
        id = int(id)
    except ValueError as e:
        logger.error(f'Failed to fetch alerts: {e}')
        raise InternalServerError('Invalid id')

    alert = alert_db.readone(id)
    if alert is None:
        raise NotFound(f'No alert was found with id {id}')

    # secure endpoint with simple email verification
    if request.args.get('email', '').lower() != alert.email.lower():
        raise InternalServerError('Access denied. Email addresses do not match.')

    if request.args.get('deactivate'):
        status = alert_db.deactivate(alert)
        if not status:
            raise InternalServerError('Failed to deactivate alert')

        return Response(response='Alert successfully deactivated.', status=200)

    return Response(json.dumps(alert, cls=AlchemyEncoder), mimetype='application/json')


@app.route('/alerts', methods=['POST'])
def write_alerts():
    """Post new alerts."""
    if not request.is_json:
        raise InternalServerError('InvalidInput')

    try:
        data = request.json
        alert = AlertModel(**data)
        alert_db.write(alert)

    except rasterio.errors.RasterioError as e:
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
        url=geotiff_url,
        extension='tif'
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
        geojson_out=geojson_out,
        wfs_response=None
    )

    # TODO - Properly encode before returning. Mongolian characters are returned as hex.
    return jsonify(features)


if __name__ == '__main__' and getenv('FLASK_ENV') == 'development':
    PORT = int(getenv('PORT', 80))
    # Only for debugging while developing
    app.run(host='0.0.0.0', debug=True, port=PORT)

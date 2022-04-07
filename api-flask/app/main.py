"""Flask API for geospatial utils."""
import logging
from distutils.util import strtobool
from os import getenv
from urllib.parse import ParseResult, urlencode, urlunparse

from app.caching import cache_file, cache_geojson
from app.database.alert_database import AlertsDataBase
from app.database.alert_model import AlchemyEncoder, AlertModel
from app.errors import handle_error, make_json_error
from app.kobo import get_form_responses, parse_datetime_params
from app.timer import timed
from app.validation import validate_intersect_parameter
from app.zonal_stats import calculate_stats, get_wfs_response

from flask import Flask, Response, json, request

from flask_caching import Cache

from flask_cors import CORS

from flask_restx import Api, Resource, fields

import rasterio

import json

from werkzeug.exceptions import BadRequest, InternalServerError, NotFound


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['PROPAGATE_EXCEPTIONS'] = True
app.debug = True
CORS(app)

api = Api(app)

# For more configuration options, check out the documentation
# Caching durations are in seconds.
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

alert_db = AlertsDataBase()

for code in [400, 401, 403, 404, 405, 500]:
    app.register_error_handler(code, make_json_error)
app.register_error_handler(Exception, handle_error)

with open('statsdata.txt', encoding='utf-8') as f:
    stats_data = f.read()

file_stats_dic = json.loads(stats_data)

with open('alertdata.txt', encoding='utf-8') as f:
    alert_data = f.read()

file_alert_dic = json.loads(alert_data)

stats_dic = {
    'geotiff_url': fields.String(file_stats_dic["geotiff_url"]),
    'zones_url': fields.String(file_stats_dic["zones_url"]),
    'group_by': fields.String(file_stats_dic["group_by"]),
}

stats_model = api.model('Stats', stats_dic)

alerts_dic = {
    'email': fields.String(file_alert_dic["email"]),
    'prism_url': fields.String(file_alert_dic["prism_url"]),
    'alert_Name': fields.String(file_alert_dic["alert_name"]),
    'alert_config': fields.Raw(file_alert_dic["alert_config"]),
    'zones': fields.Raw(file_alert_dic["zones"]),
}

logger.debug(file_alert_dic["zones"])

alerts_model = api.model('Alerts', alerts_dic)

@timed
@cache.memoize(3600)
def _calculate_stats(zones,
                     geotiff,
                     stats,
                     prefix,
                     group_by,
                     geojson_out,
                     wfs_response,
                     intersect_comparison):
    """Calculate stats."""
    return calculate_stats(
        zones,
        geotiff,
        stats=stats,
        prefix=prefix,
        group_by=group_by,
        geojson_out=geojson_out,
        wfs_response=wfs_response,
        intersect_comparison=intersect_comparison
    )


@api.route('/stats')
class Stats(Resource):
    """Class Stats which takes a post method."""

    @timed
    @api.expect(stats_model)
    def post(self):
        """Return zonal statistics."""
        # Accept data as json or form.
        logger.debug('New stats request:')
        logger.debug(request)
        data = request.get_json() or request.form
        geotiff_url = data.get('geotiff_url')
        zones_url = data.get('zones_url')
        zones_geojson = data.get('zones')
        intersect_comparison_string = data.get('intersect_comparison')

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

        intersect_comparison = None
        if intersect_comparison_string is not None:
            intersect_comparison = validate_intersect_parameter(
                intersect_comparison_string
            )

        features = _calculate_stats(
            zones,
            geotiff,
            stats=['min', 'max', 'mean', 'median', 'sum', 'std'],
            prefix='stats_',
            group_by=group_by,
            geojson_out=geojson_out,
            wfs_response=wfs_response,
            intersect_comparison=intersect_comparison
        )

        return features


# TODO - Secure endpoint
# @app.route('/alerts-all', methods=['GET'])
# def alerts_all():
#     """Get all alerts in current table."""
#     results = alert_db.readall()
#     return Response(json.dumps(results, cls=AlchemyEncoder), mimetype='application/json')

@api.route('/kobo/forms')
class Get_kobo_forms(Resource):
    """Class Get_kobo_forms which takes a get method."""

    def get(self):
        """Get all form responses."""
        begin_datetime, end_datetime = parse_datetime_params()
        form_responses = get_form_responses(begin_datetime, end_datetime)

        return Response(json.dumps(form_responses), mimetype='application/json')


@api.route('/alerts/<id>')
class Alert_by_id(Resource):
    """Class Alert_by_id which takes a get method."""

    def get(self, id: str = '1'):
        """Get alert data from DB given id."""
        try:
            id = int(id)
        except ValueError as e:
            logger.error(f'Failed to fetch alerts: {e}')
            raise BadRequest('Invalid id')

        alert = alert_db.readone(id)
        if alert is None:
            raise NotFound(f'No alert was found with id {id}')

        # secure endpoint with simple email verification
        if request.args.get('email', '').lower() != alert.email.lower():
            raise BadRequest('Access denied. Email addresses do not match.')

        if request.args.get('deactivate'):
            status = alert_db.deactivate(alert)
            if not status:
                raise InternalServerError('Failed to deactivate alert')

            return Response(response='Alert successfully deactivated.', status=200)

        return Response(json.dumps(alert, cls=AlchemyEncoder), mimetype='application/json')


@api.route('/alerts')
class Write_alerts(Resource):
    """Class Write_alerts which takes a post method."""

    @api.expect(alerts_model)
    def post(self):
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


@api.route('/demo')
class Stats_demo(Resource):
    """Class Stats_demo which takes a get method."""

    @timed
    def get(self):
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

        intersect_comparison_string = request.args.get('intersect_comparison', None)

        intersect_comparison = None
        if intersect_comparison_string is not None:
            intersect_comparison = validate_intersect_parameter(
                intersect_comparison_string
            )

        features = _calculate_stats(
            zones,
            geotiff,
            stats=['min', 'max', 'mean', 'median', 'sum', 'std'],
            prefix='stats_',
            group_by=group_by,
            geojson_out=geojson_out,
            wfs_response=None,
            intersect_comparison=intersect_comparison
        )

        # TODO - Properly encode before returning. Mongolian characters are returned as hex.
        return features


if __name__ == '__main__' and getenv('FLASK_ENV') == 'development':
    PORT = int(getenv('PORT', 80))
    # Only for debugging while developing
    app.run(host='0.0.0.0', debug=True, port=PORT)

"""Flask API for geospatial utils."""
import logging
from distutils.util import strtobool
from os import getenv

from caching import cache_file, cache_geojson

from database.alert_database import AlertsDataBase
from database.alert_model import AlertModel

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
CORS(app)

# For more configuration options, check out the documentation
# Caching durations are in seconds.
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

alert_db = AlertsDataBase()


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
        return Response(
            response='400: geotiff_url is required.',
            status=400
        )

    if zonesGeojson is None and zones_url is None:
        logger.error('Received {}'.format(data))
        return Response(
            response='400: One of zones or zones_url is required.',
            status=400
        )

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


@app.route('/alerts', methods=['POST'])
def alerts():
    """Post new alerts."""
    if request.method == 'POST':
        if request.is_json:
            data = json.loads(request.get_data())
            logger.info('Received body: {}'.format(data))
            alert = AlertModel(**data)
            try:
                alert_db.write(alert)
                return Response(response='Success', status=200)
            except Exception as e:
                logger.error(e)
                return Response(
                    response='500: OperationalError.',
                    status=500
                )
        else:
            logger.error('Unrecognized operation.')
            return Response(
                response='500: Unrecognized operation.',
                status=500
            )


@app.route('/demo', methods=['GET'])
@timed
def stats_demo():
    """Return examples of zonal statistics."""
    # The GET endpoint is used for demo purposes only
    geotiff_url = 'https://mongolia.sibelius-datacube.org:5000/?service=WCS&'\
        'request=GetCoverage&version=1.0.0&coverage=ModisAnomaly&'\
        'crs=EPSG%3A4326&bbox=86.5%2C36.7%2C119.7%2C55.3&width=1196&'\
        'height=672&format=GeoTIFF&time=2020-03-01'

    zones_url = 'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/'\
                'mng_admin_boundaries.json'

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

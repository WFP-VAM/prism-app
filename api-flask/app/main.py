"""Flask API for geospatial utils."""
import logging
from distutils.util import strtobool

from caching import cache_file

from flask import Flask, jsonify, request

from flask_caching import Cache

from flask_cors import CORS

from timer import timed

from zonal_stats import calculate_stats

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

CORS(app)

# For more configuration options, check out the documentation
# Caching durations are in seconds.
cache = Cache(app, config={'CACHE_TYPE': 'simple'})


@timed
@cache.memoize(50)
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
    geotiff_url = data.get('geotiff_url', None)
    zones_url = data.get('zones_url', None)
    if not (geotiff_url and zones_url):
        logger.warning('Received {}'.format(data))
        raise Exception('geotiff_url and zones_url are both required.')

    geojson_out = strtobool(data.get('geojson_out', 'False'))
    group_by = data.get('group_by', None)

    geotiff = cache_file(
        prefix='raster',
        url=geotiff_url
    )

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

    # TODO - Properly encode before returning. Mongolian characters are returned as hex.
    return jsonify(features)


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


if __name__ == '__main__':
    # Only for debugging while developing
    app.run(host='0.0.0.0', debug=True, port=80)

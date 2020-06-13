"""Flask API for geospatial utils."""
import logging

from caching import cache_file

from flask import Flask, jsonify, request
from flask.logging import default_handler

from flask_caching import Cache

from timer import timed

from zonal_stats import calculate_stats

root = logging.getLogger()
root.addHandler(default_handler)
logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)

app = Flask(__name__)

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


@app.route('/', methods=['GET', 'POST'])
@timed
def stats():
    """Return zonal statistics."""
    if request.method == 'POST':
        geotiff_url = request.form.get('geotiff_url', None)
        zones_url = request.form.get('zones_url', None)
        if not (geotiff_url and zones_url):
            raise Exception('geotiff_url and zones_url are both required.')

        geojson_out = request.form.get('geojson_out', False)
        group_by = request.form.get('group_by', None)

        geotiff = cache_file(
            prefix='test',
            url=geotiff_url
        )
        zones = zones_url

    # The GET endpoint is used for testing purposes
    if request.method == 'GET':
        geotiff_url = 'https://mongolia.sibelius-datacube.org:5000/?service=WCS&'\
            'request=GetCoverage&version=1.0.0&coverage=ModisAnomaly&'\
            'crs=EPSG%3A4326&bbox=86.5%2C36.7%2C119.7%2C55.3&width=1196&'\
            'height=672&format=GeoTIFF&time=2020-03-01'

        geotiff = cache_file(
            prefix='test',
            url=geotiff_url
        )
        zones = './admin_boundaries.json'
        geojson_out = False
        group_by = None

    features = _calculate_stats(
        zones,
        geotiff,
        stats=['min', 'max', 'mean', 'median', 'sum', 'std'],
        prefix='stats_',
        group_by=group_by,
        geojson_out=geojson_out
    )
    return jsonify(features)


if __name__ == '__main__':
    # Only for debugging while developing
    app.run(host='0.0.0.0', debug=True, port=80)

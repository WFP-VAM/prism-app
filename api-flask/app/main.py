import logging

from flask import Flask, jsonify
from flask.logging import default_handler
from rasterstats import zonal_stats
from caching import cache
from timer import timed


root = logging.getLogger()
root.addHandler(default_handler)
logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)

app = Flask(__name__)


@timed
def calculate_stats(zones, geotiff, stats, prefix="stats_", geojson_out=False):
    return zonal_stats(
        zones,
        geotiff,
        stats=stats,
        prefix=prefix,
        geojson_out=geojson_out
    )


@app.route("/")
@timed
def stats():
    geotiff = cache(
        prefix="test",
        url="https://mongolia.sibelius-datacube.org:5000/?service=WCS&request=GetCoverage&version=1.0.0&coverage=ModisAnomaly&crs=EPSG%3A4326&bbox=86.5%2C36.7%2C119.7%2C55.3&width=1196&height=672&format=GeoTIFF&time=2020-03-01"
    )
    zones = "./admin_boundaries.json"
    features = calculate_stats(
        zones,
        geotiff,
        stats=["mean"],
        # stats=["count", "sum", "mean", "median", "std", "min", "max", "range"],
        prefix="stats_",
        geojson_out=False
    )
    return jsonify(features)


if __name__ == "__main__":
    # Only for debugging while developing
    app.run(host="0.0.0.0", debug=True, port=80)

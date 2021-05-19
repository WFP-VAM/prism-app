"""Methods to cache remote files."""
import hashlib
import json
import logging
import os

from app.timer import timed

import rasterio

import requests

from werkzeug.exceptions import InternalServerError

logger = logging.getLogger(__name__)

CACHE_DIRECTORY = os.getenv('CACHE_DIRECTORY', '/cache/')


@timed
def cache_file(url, prefix, extension='cache'):
    """Locally cache files fetched from a url."""
    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        data=url,
        extension=extension,
    )
    # If the file exists, return path.
    if os.path.isfile(cache_filepath):
        logger.info('Returning cached file for {}.'.format(url))

        # if the file is a geotiff, confirm that we can open it.
        if extension == 'tif':
            try:
                rasterio.open(cache_filepath)
                return cache_filepath
            except Exception:
                pass
        else:
            return cache_filepath

    # If the file does not exist, download and return path.
    response = requests.get(url, verify=False)

    try:
        response.raise_for_status()
    except Exception as e:
        logger.error(e, url)
        raise InternalServerError('The file you requested is not available - {url}'.format(
            url=url)
        )

    with open(cache_filepath, 'wb') as f:
        f.write(response.content)

    logger.info('Caching file for {}.'.format(url))
    return cache_filepath


@timed
def cache_geojson(geojson, prefix):
    """Locally store geojson needed for a request."""
    json_string = json.dumps(geojson)

    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        data=json_string,
        extension='json',
    )

    with open(cache_filepath, 'w') as f:
        f.write(json_string)

    logger.info('Caching geojson in file.')
    return cache_filepath


def get_json_file(cached_filepath):
    """Return geojson object as python dictionary."""
    with open(cached_filepath, 'rb') as f:
        return json.load(f)


def _get_cached_filepath(prefix, data, extension='cache'):
    """Return the filepath where a cached response would live for the given inputs."""
    filename = '{prefix}_{hash_string}.{extension}'.format(
        prefix=prefix,
        hash_string=_hash_value(data),
        extension=extension,
    )
    logger.debug('Cached filepath: ' + os.path.join(CACHE_DIRECTORY, filename))
    return os.path.join(CACHE_DIRECTORY, filename)


def _hash_value(value):
    """Hash value to help identify what cached file to use."""
    return hashlib.md5(value.encode('utf-8')).hexdigest()[:9]

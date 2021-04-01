"""Methods to cache remote files."""
import hashlib
import json
import logging
import os

import requests

from timer import timed

logger = logging.getLogger(__name__)

CACHE_DIRECTORY = '/cache/'


@timed
def cache_file(url, prefix):
    """Locally cache files fetched from a url."""
    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        data=url,
    )
    # If the file exists, return path.
    if os.path.isfile(cache_filepath):
        logger.info('Returning cached file for {}.'.format(url))
        return cache_filepath
    # If the file does not exist, download and return path.
    else:
        r = requests.get(url, verify=False)

        with open(cache_filepath, 'wb') as f:
            f.write(r.content)

        logger.info('Caching file for {}.'.format(url))
        return cache_filepath


@timed
def cache_geojson(geojson, prefix):
    """Locally store needed for a request."""
    json_string = json.dumps(geojson)

    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        data=json_string,
    )

    with open(cache_filepath, 'w') as f:
        f.write(json_string)

    logger.info('Caching geojson in file.')
    return cache_filepath


def _get_cached_filepath(prefix, data):
    """Return the filepath where a cached response would live for the given inputs."""
    filename = '{prefix}_{hash_string}.cache'.format(
        prefix=prefix,
        hash_string=_hash_value(data),
    )
    logger.debug('Cached filepath: ' + os.path.join(CACHE_DIRECTORY, filename))
    return os.path.join(CACHE_DIRECTORY, filename)


def _hash_value(value):
    """Hash value to help identify what cached file to use."""
    return hashlib.md5(value.encode('utf-8')).hexdigest()[:9]

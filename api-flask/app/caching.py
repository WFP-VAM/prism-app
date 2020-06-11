"""Methods to cache remote files."""
import json
import logging
import os
import requests
import hashlib

from timer import timed

logger = logging.getLogger('root')

CACHE_DIRECTORY = '/cache/'


@timed
def cache(url, prefix):
    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        url=url,
    )
    # If the file exists, return path.
    if os.path.isfile(cache_filepath):
        logger.warning('Returning cached file for {}.'.format(url))
        return cache_filepath
    # If the file does not exist, calculate and write to the cache.
    else:
        r = requests.get(url, verify=False)

        with open(cache_filepath, 'wb') as f:
            f.write(r.content)

        # urllib.request.urlretrieve(url, cache_filepath)
        logger.warning('Caching file for {}.'.format(url))
        return cache_filepath


def _get_cached_filepath(prefix, url):
    """Return the filepath where a cached response would live for the given inputs."""
    filename = '{prefix}_{hash_string}.cache'.format(
        prefix=prefix,
        hash_string=_hash_value(url),
    )
    logger.warning('file ' + os.path.join(CACHE_DIRECTORY, filename))
    return os.path.join(CACHE_DIRECTORY, filename)


def _hash_value(value):
    """
    Hash hint value to help identify what cached file to use.

    Attempts to convert unhashable types to hashable equivalents.
    """
    # TODO: Handle other unhashable objects.
    return hashlib.md5(value.encode('utf-8')).hexdigest()[:9]

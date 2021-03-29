"""Methods to cache remote files."""
import hashlib
import logging
import os

import requests

from timer import timed

logger = logging.getLogger(__name__)

# on Mac use a dir that you have permission to
CACHE_DIRECTORY = '/tmp/'


@timed
def cache_file(url, prefix):
    """Locally cache files fetched from a url."""
    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        url=url,
    )
    # If the file exists, return path.
    if os.path.isfile(cache_filepath):
        logger.info('Returning cached file for {}.'.format(url))
        return cache_filepath
    # If the file does not exist, download and return path.
    else:
        r = requests.get(url, verify=False)

        logger.info('Checking path: {}'.format(''.join(cache_filepath.split(os.sep)[:-1])))

        os.makedirs(''.join(cache_filepath.split(os.sep)[:-1]), exist_ok=True)

        with open(cache_filepath, 'wb') as f:
            f.write(r.content)

        logger.info('Caching file for {}.'.format(url))
        return cache_filepath


def _get_cached_filepath(prefix, url):
    """Return the filepath where a cached response would live for the given inputs."""
    filename = '{prefix}_{hash_string}.cache'.format(
        prefix=prefix,
        hash_string=_hash_value(url),
    )
    logger.debug('Cached filepath: ' + os.path.join(CACHE_DIRECTORY, filename))
    return os.path.join(CACHE_DIRECTORY, filename)


def _hash_value(value):
    """Hash value to help identify what cached file to use."""
    return hashlib.md5(value.encode('utf-8')).hexdigest()[:9]

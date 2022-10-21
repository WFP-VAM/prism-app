"""Methods to cache remote files."""
import hashlib
import json
import logging
import os

import rasterio  # type: ignore
import requests
from app.timer import timed
from fastapi import HTTPException

from .models import FilePath, GeoJSON

logger = logging.getLogger(__name__)

CACHE_DIRECTORY = os.getenv("CACHE_DIRECTORY", "/cache/")


@timed
def cache_file(url: str, prefix: str, extension: str = "cache") -> FilePath:
    """Locally cache files fetched from a url."""
    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        data=url,
        extension=extension,
    )
    # If the file exists, return path.
    if is_file_valid(cache_filepath):
        return cache_filepath

    # If the file does not exist, download and return path.
    response = requests.get(url, verify=False)

    try:
        response.raise_for_status()
    except requests.HTTPError as e:
        logger.error(e)
        raise HTTPException(
            status_code=500, detail=f"The file you requested is not available - {url}"
        )

    with open(cache_filepath, "wb") as f:
        f.write(response.content)

    logger.info("Caching file for {}.".format(url))
    return cache_filepath


@timed
def cache_geojson(geojson: GeoJSON, prefix: str) -> FilePath:
    """Locally store geojson needed for a request."""
    json_string = json.dumps(geojson)

    cache_filepath = _get_cached_filepath(
        prefix=prefix,
        data=json_string,
        extension="json",
    )

    with open(cache_filepath, "w") as f:
        f.write(json_string)

    logger.info("Caching geojson in file.")
    return cache_filepath


def get_json_file(cached_filepath: FilePath) -> GeoJSON:
    """Return geojson object as python dictionary."""
    with open(cached_filepath, "rb") as f:
        return json.load(f)


def _get_cached_filepath(prefix: str, data: str, extension: str = "cache") -> FilePath:
    """Return the filepath where a cached response would live for the given inputs."""
    filename = "{prefix}_{hash_string}.{extension}".format(
        prefix=prefix,
        hash_string=_hash_value(data),
        extension=extension,
    )
    logger.debug("Cached filepath: " + os.path.join(CACHE_DIRECTORY, filename))
    return FilePath(os.path.join(CACHE_DIRECTORY, filename))


def _hash_value(value: str) -> str:
    """Hash value to help identify what cached file to use."""
    return hashlib.md5(value.encode("utf-8")).hexdigest()[:9]


def is_file_valid(filepath) -> bool:
    """Test if a file exists and is valid. For .tif, also try to read it."""
    if os.path.isfile(filepath):
        # if the file is a geotiff, confirm that we can open it.
        is_tif = ".tif" in filepath
        if is_tif:
            try:
                rasterio.open(filepath)
                return True
            except rasterio.errors.RasterioError:
                return False
        return True

    return False

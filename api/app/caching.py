"""Methods to cache remote files."""
import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Any, Optional

import rasterio  # type: ignore
import requests
from app.timer import timed
from fastapi import HTTPException

from .models import FilePath, GeoJSON

logger = logging.getLogger(__name__)

CACHE_DIRECTORY = os.getenv("CACHE_DIRECTORY", "/cache/")
MAX_TIME_DIFF = int(os.getenv("MAX_TIME_DIFF", 30))  # minutes


def get_kobo_path(form_id: str) -> str:
    """Creates kobo path and file name. Form id is encoded to avoid traversal directory attacks."""
    file_name: str = "{}.json".format(form_id.encode("utf-8").hex())
    return os.path.join(CACHE_DIRECTORY, file_name)


def cache_kobo_form(
    form_id: str, form_responses: dict[str, Any], form_labels: dict[str, Any]
) -> None:
    """Saves kobo form data and metadata in the cache directory"""
    file_path = get_kobo_path(form_id)
    logger.debug(f"Caching form {form_id}")

    form_dict = {
        "labels": form_labels,
        "responses": form_responses,
    }

    with open(file_path, "w") as file:
        json.dump(form_dict, file)


def get_kobo_form_cached(form_id: str) -> Optional[dict[str, Any]]:
    """Checks if the kobo form is cached."""
    file_path = get_kobo_path(form_id)

    if os.path.isfile(file_path) is False:
        return None

    created_timestamp: float = os.path.getctime(file_path)
    created_datetime: datetime = datetime.fromtimestamp(created_timestamp)

    minutes_diff = (
        (datetime.now() - created_datetime).total_seconds()
    ) / 60  # minutes.

    if minutes_diff > MAX_TIME_DIFF:
        return None

    logger.debug(f"Using cached form {form_id}")
    # Get data from cache.
    with open(file_path, "r") as file:
        form_data = json.load(file)

    return form_data


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

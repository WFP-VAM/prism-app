import logging
import os
from time import time
from uuid import uuid4

import boto3
from app.timer import timed
from cachetools import TTLCache, cached
from fastapi import HTTPException
from odc.geo.xr import write_cog
from odc.stac import configure_rio, stac_load
from pystac_client import Client

logger = logging.getLogger(__name__)

STAC_URL = "https://api.earthobservation.vam.wfp.org/stac"

STAC_AWS_ACCESS_KEY_ID = os.getenv("STAC_AWS_ACCESS_KEY_ID")
STAC_AWS_SECRET_ACCESS_KEY = os.getenv("STAC_AWS_SECRET_ACCESS_KEY")

GEOTIFF_BUCKET_NAME = "prism-stac-geotiff"

configure_rio(
    cloud_defaults=True,
    aws={
        "aws_access_key_id": STAC_AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": STAC_AWS_SECRET_ACCESS_KEY,
    },
)


@timed
def generate_geotiff_from_stac_api(
    collection: str,
    bbox: [float, float, float, float],
    date: str,
    band: str | None = None,
) -> str:
    """Query the stac API with the params and generate a geotiff"""
    catalog = Client.open(STAC_URL)

    query_answer = catalog.search(bbox=bbox, collections=[collection], datetime=[date])
    items = list(query_answer.items())

    if not items:
        raise HTTPException(status_code=500, detail="Collection not found in stac API")

    # TODO - what should happen if the STAC API returns multiple dataset
    # or if the selected band is not available?

    # Filter data to the correct band if requested.
    available_bands = items[0].assets.keys()
    logger.debug("available bands: %s", available_bands)
    bands = [band] if band and band in available_bands else None

    try:
        collections_dataset = stac_load(items, bbox=bbox, bands=bands, chunks={})
        logger.debug("collections dataset: %s", collections_dataset)
    except Exception as e:
        logger.warning("Failed to load dataset")
        raise e

    # Add the actual outputed band info to the filename
    final_band = list(collections_dataset.keys())[0]
    band_suffix = "_" + final_band if (final_band != "band") else ""
    file_path = f"{collection}{band_suffix}_{date}_{str(uuid4())[:8]}.tif"

    try:
        write_cog(collections_dataset[final_band], file_path)
    except Exception as e:
        logger.warning("An error occured writing file")
        raise e

    logger.debug("returning file: %s", file_path)
    return file_path


def upload_to_s3(file_path: str) -> str:
    """Upload to s3"""
    s3_client = boto3.client("s3")
    s3_filename = os.path.basename(file_path)

    s3_client.upload_file(file_path, GEOTIFF_BUCKET_NAME, s3_filename)
    return s3_filename


@cached(cache=TTLCache(maxsize=128, ttl=60 * 60 * 24 * 6))
def generate_geotiff_and_upload_to_s3(
    collection: str,
    bbox: [float, float, float, float],
    date: str,
    band: str | None = None,
) -> str:
    """
    Query the stac API with the params, generate a geotiff, save it in an S3 bucket

    """
    file_path = generate_geotiff_from_stac_api(collection, bbox, date, band)
    s3_filename = upload_to_s3(file_path)
    os.remove(file_path)

    return s3_filename


def get_geotiff(
    collection: str,
    bbox: [float, float, float, float],
    date: str,
    band: str | None = None,
):
    """Generate a geotiff and return presigned download url"""
    s3_filename = generate_geotiff_and_upload_to_s3(collection, bbox, date, band)

    s3_client = boto3.client("s3")
    presigned_download_url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": GEOTIFF_BUCKET_NAME, "Key": s3_filename},
        ExpiresIn=3600,
    )
    return presigned_download_url

import logging
import os
import re
import urllib.error
import urllib.request
from functools import lru_cache
from urllib.parse import urlparse

import boto3
from botocore.config import Config
from cachetools import TTLCache, cached
from fastapi import HTTPException
from pystac_client import Client

logger = logging.getLogger(__name__)

STAC_URL = "https://api.earthobservation.vam.wfp.org/stac"

STAC_AWS_ACCESS_KEY_ID = os.getenv("STAC_AWS_ACCESS_KEY_ID")
STAC_AWS_SECRET_ACCESS_KEY = os.getenv("STAC_AWS_SECRET_ACCESS_KEY")

# 5-minute presigned URL lifetime; cache slightly under that to avoid serving stale URLs
PRESIGNED_URL_EXPIRES_IN = 300
_CACHE_TTL = 240


def _parse_s3_href(href: str) -> tuple[str, str, str | None]:
    """
    Parse an asset href into (bucket, key, region).

    Region is returned when it can be read directly from the URL; otherwise None
    and the caller should look it up via get_bucket_region().

    Supports:
      s3://bucket/path/to/file.tif
      https://bucket.s3.amazonaws.com/path/to/file.tif
      https://bucket.s3.region.amazonaws.com/path/to/file.tif
    """
    if href.startswith("s3://"):
        parsed = urlparse(href)
        bucket = parsed.netloc
        key = parsed.path.lstrip("/")
        return bucket, key, None

    # HTTPS virtual-hosted style: https://<bucket>.s3[.<region>].amazonaws.com/<key>
    match = re.match(
        r"https://([^.]+)\.s3(?:\.([a-z0-9-]+))?\.amazonaws\.com/(.+)", href
    )
    if match:
        bucket = match.group(1)
        region = match.group(2)  # None when URL has no explicit region
        key = match.group(3)
        return bucket, key, region

    raise ValueError(f"Unrecognised S3 href format: {href!r}")


@lru_cache(maxsize=64)
def _get_bucket_region(bucket: str) -> str:
    """
    Discover the AWS region for a bucket without IAM permissions.

    S3 always returns the ``x-amz-bucket-region`` header on any response to the
    global endpoint, including 301 redirects and 403 auth errors, so no
    s3:GetBucketLocation permission is required.
    """
    url = f"https://{bucket}.s3.amazonaws.com/"
    req = urllib.request.Request(url, method="HEAD")
    region = None
    try:
        with urllib.request.urlopen(req) as resp:
            region = resp.headers.get("x-amz-bucket-region")
    except urllib.error.HTTPError as exc:
        region = exc.headers.get("x-amz-bucket-region")
    except urllib.error.URLError as exc:
        logger.warning("Could not reach S3 to determine bucket region: %s", exc)

    region = region or "us-east-1"
    logger.debug("Bucket '%s' is in region '%s'", bucket, region)
    return region


@cached(cache=TTLCache(maxsize=256, ttl=_CACHE_TTL))
def get_presigned_cog_url(
    collection: str,
    date: str | None = None,
    band: str | None = None,
) -> str:
    """
    Look up a COG asset in the STAC catalog and return a short-lived pre-signed
    URL that the browser can use for byte-range requests.

    Args:
        collection: STAC collection ID (matches ``additional_query_params.collection``
                    or ``server_layer_name`` in layer config).
        date:       Optional ISO-8601 date string for temporal filtering.
        band:       Optional asset key / band name within the STAC item.

    Returns:
        A pre-signed HTTPS URL valid for ``PRESIGNED_URL_EXPIRES_IN`` seconds.
    """
    catalog = Client.open(STAC_URL)

    datetime_params = [date] if date is not None else None
    results = catalog.search(
        collections=[collection],
        datetime=datetime_params,
    )
    items = list(results.items())

    if not items:
        raise HTTPException(
            status_code=404,
            detail=f"No items found for collection '{collection}'"
            + (f" on date '{date}'" if date else ""),
        )

    item = items[0]
    available_assets = item.assets

    if not available_assets:
        raise HTTPException(
            status_code=404,
            detail=f"Item '{item.id}' in collection '{collection}' has no assets",
        )

    # Resolve asset key: prefer requested band if present, else first asset
    if band and band in available_assets:
        asset_key = band
    else:
        if band:
            logger.warning(
                "Band '%s' not found in item '%s'; available: %s. Falling back to first asset.",
                band,
                item.id,
                list(available_assets.keys()),
            )
        asset_key = next(iter(available_assets))

    href = available_assets[asset_key].href
    logger.debug("Resolved asset href for '%s/%s': %s", collection, asset_key, href)

    try:
        bucket, key, region_from_href = _parse_s3_href(href)
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    # Use region from href when available; otherwise look it up so SigV4 signing
    # uses the correct regional endpoint (wrong region → AuthorizationQueryParametersError).
    region = region_from_href or _get_bucket_region(bucket)

    s3_client = boto3.client(
        "s3",
        aws_access_key_id=STAC_AWS_ACCESS_KEY_ID,
        aws_secret_access_key=STAC_AWS_SECRET_ACCESS_KEY,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )

    presigned_url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=PRESIGNED_URL_EXPIRES_IN,
    )

    logger.debug(
        "Generated presigned URL for s3://%s/%s (expires in %ds)",
        bucket,
        key,
        PRESIGNED_URL_EXPIRES_IN,
    )

    return presigned_url

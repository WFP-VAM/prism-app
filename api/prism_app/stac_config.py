"""Shared STAC catalog URL, AWS credentials, and client helpers."""

import os
from typing import Any

import boto3
from botocore.config import Config

STAC_URL = "https://api.earthobservation.vam.wfp.org/stac"

STAC_AWS_ACCESS_KEY_ID = os.getenv("STAC_AWS_ACCESS_KEY_ID")
STAC_AWS_SECRET_ACCESS_KEY = os.getenv("STAC_AWS_SECRET_ACCESS_KEY")

_STAC_S3_CONFIG = Config(
    signature_version="s3v4",
    ignore_configured_endpoint_urls=True,
)


def stac_s3_client(*, region_name: str | None = None) -> Any:
    """S3 client for STAC asset buckets (SigV4, ignores AWS_ENDPOINT_URL)."""
    kwargs: dict[str, Any] = {
        "aws_access_key_id": STAC_AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": STAC_AWS_SECRET_ACCESS_KEY,
        "config": _STAC_S3_CONFIG,
    }
    if region_name is not None:
        kwargs["region_name"] = region_name
    return boto3.client("s3", **kwargs)

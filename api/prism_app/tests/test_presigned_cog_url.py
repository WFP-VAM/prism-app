"""Tests for the /cog_presigned_url endpoint and presigned_cog_url module."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from prism_app.main import app
from prism_app.presigned_cog_url import _parse_s3_href, get_presigned_cog_url

client = TestClient(app)

FAKE_PRESIGNED_URL = "https://bucket.s3.amazonaws.com/path/file.tif?X-Amz-Signature=abc"


# ---------------------------------------------------------------------------
# Unit tests: _parse_s3_href
# ---------------------------------------------------------------------------


class TestParseS3Href:
    def test_s3_uri(self):
        bucket, key = _parse_s3_href("s3://my-bucket/path/to/file.tif")
        assert bucket == "my-bucket"
        assert key == "path/to/file.tif"

    def test_s3_uri_with_nested_key(self):
        bucket, key = _parse_s3_href("s3://my-bucket/a/b/c/d.tif")
        assert bucket == "my-bucket"
        assert key == "a/b/c/d.tif"

    def test_https_virtual_hosted_no_region(self):
        bucket, key = _parse_s3_href(
            "https://my-bucket.s3.amazonaws.com/path/to/file.tif"
        )
        assert bucket == "my-bucket"
        assert key == "path/to/file.tif"

    def test_https_virtual_hosted_with_region(self):
        bucket, key = _parse_s3_href(
            "https://my-bucket.s3.us-east-1.amazonaws.com/subdir/file.tif"
        )
        assert bucket == "my-bucket"
        assert key == "subdir/file.tif"

    def test_unsupported_format_raises(self):
        with pytest.raises(ValueError, match="Unrecognised S3 href format"):
            _parse_s3_href("https://example.com/not-s3/file.tif")

    def test_plain_http_raises(self):
        with pytest.raises(ValueError, match="Unrecognised S3 href format"):
            _parse_s3_href("http://not-s3.com/file.tif")


# ---------------------------------------------------------------------------
# Unit tests: get_presigned_cog_url (mocked STAC + boto3)
# ---------------------------------------------------------------------------


def _make_mock_item(asset_hrefs: dict[str, str]) -> MagicMock:
    """Build a minimal pystac.Item mock with the given asset hrefs."""
    item = MagicMock()
    item.id = "mock-item-id"
    assets = {}
    for key, href in asset_hrefs.items():
        asset = MagicMock()
        asset.href = href
        assets[key] = asset
    item.assets = assets
    return item


@patch("prism_app.presigned_cog_url.boto3.client")
@patch("prism_app.presigned_cog_url.Client")
def test_get_presigned_cog_url_happy_path(mock_stac_client_cls, mock_boto3_client):
    """Returns a presigned URL when collection + band are found in STAC."""
    # Arrange STAC mock
    mock_item = _make_mock_item(
        {"rfh": "s3://stac-bucket/rfh/2020-09-01.tif"}
    )
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = [mock_item]
    mock_stac_client_cls.open.return_value = mock_catalog

    # Arrange S3 mock
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = FAKE_PRESIGNED_URL
    mock_boto3_client.return_value = mock_s3

    # Clear TTLCache between tests
    get_presigned_cog_url.cache.clear()

    result = get_presigned_cog_url("rfh_dekad", "2020-09-01", "rfh")

    assert result == FAKE_PRESIGNED_URL
    mock_s3.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "stac-bucket", "Key": "rfh/2020-09-01.tif"},
        ExpiresIn=300,
    )


@patch("prism_app.presigned_cog_url.boto3.client")
@patch("prism_app.presigned_cog_url.Client")
def test_get_presigned_cog_url_fallback_to_first_asset(
    mock_stac_client_cls, mock_boto3_client
):
    """Falls back to the first asset when the requested band is not present."""
    mock_item = _make_mock_item(
        {"default_band": "s3://stac-bucket/default/file.tif"}
    )
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = [mock_item]
    mock_stac_client_cls.open.return_value = mock_catalog

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = FAKE_PRESIGNED_URL
    mock_boto3_client.return_value = mock_s3

    get_presigned_cog_url.cache.clear()

    result = get_presigned_cog_url("some_collection", None, "nonexistent_band")

    assert result == FAKE_PRESIGNED_URL
    mock_s3.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "stac-bucket", "Key": "default/file.tif"},
        ExpiresIn=300,
    )


@patch("prism_app.presigned_cog_url.Client")
def test_get_presigned_cog_url_collection_not_found(mock_stac_client_cls):
    """Raises HTTP 404 when the STAC search returns no items."""
    from fastapi import HTTPException

    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = []
    mock_stac_client_cls.open.return_value = mock_catalog

    get_presigned_cog_url.cache.clear()

    with pytest.raises(HTTPException) as exc_info:
        get_presigned_cog_url("unknown_collection", "2020-01-01", None)

    assert exc_info.value.status_code == 404
    assert "unknown_collection" in exc_info.value.detail


@patch("prism_app.presigned_cog_url.Client")
def test_get_presigned_cog_url_no_assets(mock_stac_client_cls):
    """Raises HTTP 404 when the matched STAC item has no assets."""
    from fastapi import HTTPException

    mock_item = MagicMock()
    mock_item.id = "empty-item"
    mock_item.assets = {}
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = [mock_item]
    mock_stac_client_cls.open.return_value = mock_catalog

    get_presigned_cog_url.cache.clear()

    with pytest.raises(HTTPException) as exc_info:
        get_presigned_cog_url("empty_collection", None, None)

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Integration tests: GET /cog_presigned_url via TestClient
# ---------------------------------------------------------------------------


@patch("prism_app.main.get_presigned_cog_url")
def test_endpoint_returns_url(mock_get_presigned):
    """GET /cog_presigned_url returns JSON {"url": ...} on success."""
    mock_get_presigned.return_value = FAKE_PRESIGNED_URL

    response = client.get(
        "/cog_presigned_url",
        params={"collection": "rfh_dekad", "date": "2020-09-01", "band": "rfh"},
    )

    assert response.status_code == 200
    assert response.json() == {"url": FAKE_PRESIGNED_URL}
    mock_get_presigned.assert_called_once_with("rfh_dekad", "2020-09-01", "rfh")


@patch("prism_app.main.get_presigned_cog_url")
def test_endpoint_without_optional_params(mock_get_presigned):
    """GET /cog_presigned_url works with only the required collection param."""
    mock_get_presigned.return_value = FAKE_PRESIGNED_URL

    response = client.get(
        "/cog_presigned_url",
        params={"collection": "rfh_dekad"},
    )

    assert response.status_code == 200
    assert response.json() == {"url": FAKE_PRESIGNED_URL}
    mock_get_presigned.assert_called_once_with("rfh_dekad", None, None)


def test_endpoint_missing_collection():
    """GET /cog_presigned_url returns 422 when collection is omitted."""
    response = client.get("/cog_presigned_url")
    assert response.status_code == 422


@patch("prism_app.main.get_presigned_cog_url")
def test_endpoint_propagates_404(mock_get_presigned):
    """GET /cog_presigned_url propagates HTTPException from the service layer."""
    from fastapi import HTTPException

    mock_get_presigned.side_effect = HTTPException(
        status_code=404, detail="No items found for collection 'bad_collection'"
    )

    response = client.get(
        "/cog_presigned_url",
        params={"collection": "bad_collection"},
    )

    assert response.status_code == 404
    assert "bad_collection" in response.json()["detail"]

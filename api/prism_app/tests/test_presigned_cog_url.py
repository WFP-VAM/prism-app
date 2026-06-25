"""Tests for the /cog_presigned_url endpoint and presigned_cog_url module."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from prism_app.main import app
from prism_app.presigned_cog_url import (
    _parse_s3_href,
    _presign_href,
    get_presigned_cog_urls,
)

client = TestClient(app)

FAKE_PRESIGNED_URL = "https://bucket.s3.amazonaws.com/path/file.tif?X-Amz-Signature=abc"


# ---------------------------------------------------------------------------
# Unit tests: _parse_s3_href
# ---------------------------------------------------------------------------


class TestParseS3Href:
    def test_s3_uri(self):
        bucket, key, region = _parse_s3_href("s3://my-bucket/path/to/file.tif")
        assert bucket == "my-bucket"
        assert key == "path/to/file.tif"
        assert region is None

    def test_s3_uri_with_nested_key(self):
        bucket, key, region = _parse_s3_href("s3://my-bucket/a/b/c/d.tif")
        assert bucket == "my-bucket"
        assert key == "a/b/c/d.tif"
        assert region is None

    def test_https_virtual_hosted_no_region(self):
        bucket, key, region = _parse_s3_href(
            "https://my-bucket.s3.amazonaws.com/path/to/file.tif"
        )
        assert bucket == "my-bucket"
        assert key == "path/to/file.tif"
        assert region is None

    def test_https_virtual_hosted_with_region(self):
        bucket, key, region = _parse_s3_href(
            "https://my-bucket.s3.us-east-1.amazonaws.com/subdir/file.tif"
        )
        assert bucket == "my-bucket"
        assert key == "subdir/file.tif"
        assert region == "us-east-1"

    def test_unsupported_format_raises(self):
        with pytest.raises(ValueError, match="Unrecognised S3 href format"):
            _parse_s3_href("https://example.com/not-s3/file.tif")

    def test_plain_http_raises(self):
        with pytest.raises(ValueError, match="Unrecognised S3 href format"):
            _parse_s3_href("http://not-s3.com/file.tif")


# ---------------------------------------------------------------------------
# Regression: AWS_ENDPOINT_URL must not hijack STAC/COG presigning
# ---------------------------------------------------------------------------


@patch("prism_app.presigned_cog_url._get_bucket_region", return_value="eu-central-1")
@patch("prism_app.presigned_cog_url.boto3.client")
def test_presign_ignores_rustfs_endpoint_env(
    mock_boto3_client, _mock_region, monkeypatch
):
    """COG presigning must target real AWS S3 even when AWS_ENDPOINT_URL points at RustFS."""
    monkeypatch.setenv("AWS_ENDPOINT_URL", "http://rustfs:9000")

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://wfp-seasmon.s3.eu-central-1.amazonaws.com/output/file.tif?X-Amz-Signature=abc"
    mock_boto3_client.return_value = mock_s3

    url = _presign_href("s3://wfp-seasmon/output/file.tif")

    assert url.endswith(".amazonaws.com/output/file.tif?X-Amz-Signature=abc")
    assert "rustfs" not in url

    _, kwargs = mock_boto3_client.call_args
    config = kwargs["config"]
    assert config.signature_version == "s3v4"
    assert config.ignore_configured_endpoint_urls is True


# ---------------------------------------------------------------------------
# Unit tests: get_presigned_cog_urls (mocked STAC + boto3)
# ---------------------------------------------------------------------------


def _make_mock_item(
    item_id: str,
    asset_hrefs: dict[str, str],
    bbox: list[float] | None = None,
) -> MagicMock:
    """Build a minimal pystac.Item mock with the given asset hrefs and bbox."""
    item = MagicMock()
    item.id = item_id
    item.bbox = bbox if bbox is not None else [30.0, -26.0, 36.0, -20.0]
    assets = {}
    for key, href in asset_hrefs.items():
        asset = MagicMock()
        asset.href = href
        assets[key] = asset
    item.assets = assets
    return item


@patch("prism_app.presigned_cog_url._get_bucket_region", return_value="eu-central-1")
@patch("prism_app.presigned_cog_url.boto3.client")
@patch("prism_app.presigned_cog_url.Client")
def test_single_item_happy_path(mock_stac_client_cls, mock_boto3_client, _mock_region):
    """Returns a single presigned URL for a collection with one item."""
    mock_item = _make_mock_item(
        "rfh_dekad-202009d1",
        {"band": "s3://stac-bucket/rfh/2020-09-01.tif"},
    )
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = [mock_item]
    mock_stac_client_cls.open.return_value = mock_catalog

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = FAKE_PRESIGNED_URL
    mock_boto3_client.return_value = mock_s3

    get_presigned_cog_urls.cache.clear()

    result = get_presigned_cog_urls("rfh_dekad", "2020-09-01", "band")

    assert len(result) == 1
    assert result[0] == {
        "item_id": "rfh_dekad-202009d1",
        "url": FAKE_PRESIGNED_URL,
        "bbox": [30.0, -26.0, 36.0, -20.0],
    }
    mock_s3.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "stac-bucket", "Key": "rfh/2020-09-01.tif"},
        ExpiresIn=300,
    )


@patch("prism_app.presigned_cog_url._get_bucket_region", return_value="eu-central-1")
@patch("prism_app.presigned_cog_url.boto3.client")
@patch("prism_app.presigned_cog_url.Client")
def test_multiple_items_tiled_collection(
    mock_stac_client_cls, mock_boto3_client, _mock_region
):
    """Returns presigned URLs (with bbox) for every tile in a tiled collection."""
    tile_bboxes = {
        "tile-h27v09": [20.0, -10.0, 30.0, 0.0],
        "tile-h28v05": [30.0, -10.0, 40.0, 0.0],
        "tile-h29v07": [40.0, -10.0, 50.0, 0.0],
    }
    items = [
        _make_mock_item(
            "tile-h27v09",
            {"band": "s3://bucket/tile-h27v09.tif"},
            bbox=tile_bboxes["tile-h27v09"],
        ),
        _make_mock_item(
            "tile-h28v05",
            {"band": "s3://bucket/tile-h28v05.tif"},
            bbox=tile_bboxes["tile-h28v05"],
        ),
        _make_mock_item(
            "tile-h29v07",
            {"band": "s3://bucket/tile-h29v07.tif"},
            bbox=tile_bboxes["tile-h29v07"],
        ),
    ]
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = items
    mock_stac_client_cls.open.return_value = mock_catalog

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = FAKE_PRESIGNED_URL
    mock_boto3_client.return_value = mock_s3

    get_presigned_cog_urls.cache.clear()

    result = get_presigned_cog_urls("myd11a2_txa_dekad", "2026-04-01", "band")

    assert len(result) == 3
    assert {r["item_id"] for r in result} == {
        "tile-h27v09",
        "tile-h28v05",
        "tile-h29v07",
    }
    # Every result must include the bbox from its STAC item
    for entry in result:
        assert "bbox" in entry
        assert entry["bbox"] == tile_bboxes[entry["item_id"]]
    assert mock_s3.generate_presigned_url.call_count == 3


@patch("prism_app.presigned_cog_url._get_bucket_region", return_value="eu-central-1")
@patch("prism_app.presigned_cog_url.boto3.client")
@patch("prism_app.presigned_cog_url.Client")
def test_bbox_forwarded_to_stac_search(
    mock_stac_client_cls, mock_boto3_client, _mock_region
):
    """When a bbox is provided, it is forwarded to the STAC catalog search."""
    mock_item = _make_mock_item(
        "tile-h28v09",
        {"band": "s3://bucket/tile-h28v09.tif"},
        bbox=[30.0, -20.0, 40.0, -10.0],
    )
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = [mock_item]
    mock_stac_client_cls.open.return_value = mock_catalog

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = FAKE_PRESIGNED_URL
    mock_boto3_client.return_value = mock_s3

    get_presigned_cog_urls.cache.clear()

    result = get_presigned_cog_urls(
        "mxd13a2_vim_dekad", "2026-04-01", "band", bbox=(31.0, -25.0, 40.0, -11.0)
    )

    assert len(result) == 1
    mock_catalog.search.assert_called_once_with(
        collections=["mxd13a2_vim_dekad"],
        datetime=["2026-04-01"],
        bbox=[31.0, -25.0, 40.0, -11.0],
    )


@patch("prism_app.presigned_cog_url._get_bucket_region", return_value="eu-central-1")
@patch("prism_app.presigned_cog_url.boto3.client")
@patch("prism_app.presigned_cog_url.Client")
def test_fallback_to_first_asset(mock_stac_client_cls, mock_boto3_client, _mock_region):
    """Falls back to the first asset when the requested band is not present."""
    mock_item = _make_mock_item(
        "item-1",
        {"default_band": "s3://stac-bucket/default/file.tif"},
    )
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = [mock_item]
    mock_stac_client_cls.open.return_value = mock_catalog

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = FAKE_PRESIGNED_URL
    mock_boto3_client.return_value = mock_s3

    get_presigned_cog_urls.cache.clear()

    result = get_presigned_cog_urls("some_collection", None, "nonexistent_band")

    assert len(result) == 1
    assert result[0]["url"] == FAKE_PRESIGNED_URL
    mock_s3.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "stac-bucket", "Key": "default/file.tif"},
        ExpiresIn=300,
    )


@patch("prism_app.presigned_cog_url.Client")
def test_collection_not_found(mock_stac_client_cls):
    """Raises HTTP 404 when the STAC search returns no items."""
    from fastapi import HTTPException

    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = []
    mock_stac_client_cls.open.return_value = mock_catalog

    get_presigned_cog_urls.cache.clear()

    with pytest.raises(HTTPException) as exc_info:
        get_presigned_cog_urls("unknown_collection", "2020-01-01", None)

    assert exc_info.value.status_code == 404
    assert "unknown_collection" in exc_info.value.detail


@patch("prism_app.presigned_cog_url.Client")
def test_no_assets(mock_stac_client_cls):
    """Raises HTTP 404 when all matched STAC items have no assets."""
    from fastapi import HTTPException

    mock_item = MagicMock()
    mock_item.id = "empty-item"
    mock_item.assets = {}
    mock_catalog = MagicMock()
    mock_catalog.search.return_value.items.return_value = [mock_item]
    mock_stac_client_cls.open.return_value = mock_catalog

    get_presigned_cog_urls.cache.clear()

    with pytest.raises(HTTPException) as exc_info:
        get_presigned_cog_urls("empty_collection", None, None)

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Integration tests: GET /cog_presigned_url via TestClient
# ---------------------------------------------------------------------------


FAKE_URLS_RESPONSE = [
    {"item_id": "item-1", "url": FAKE_PRESIGNED_URL},
]


@patch("prism_app.main.get_presigned_cog_urls")
def test_endpoint_returns_urls(mock_get_presigned):
    """GET /cog_presigned_url returns JSON {"urls": [...]} on success."""
    mock_get_presigned.return_value = FAKE_URLS_RESPONSE

    response = client.get(
        "/cog_presigned_url",
        params={"collection": "rfh_dekad", "date": "2020-09-01", "band": "rfh"},
    )

    assert response.status_code == 200
    assert response.json() == {"urls": FAKE_URLS_RESPONSE}
    mock_get_presigned.assert_called_once_with("rfh_dekad", "2020-09-01", "rfh", None)


@patch("prism_app.main.get_presigned_cog_urls")
def test_endpoint_without_optional_params(mock_get_presigned):
    """GET /cog_presigned_url works with only the required collection param."""
    mock_get_presigned.return_value = FAKE_URLS_RESPONSE

    response = client.get(
        "/cog_presigned_url",
        params={"collection": "rfh_dekad"},
    )

    assert response.status_code == 200
    assert response.json() == {"urls": FAKE_URLS_RESPONSE}
    mock_get_presigned.assert_called_once_with("rfh_dekad", None, None, None)


@patch("prism_app.main.get_presigned_cog_urls")
def test_endpoint_with_bbox(mock_get_presigned):
    """GET /cog_presigned_url forwards bbox as a tuple to the service function."""
    mock_get_presigned.return_value = FAKE_URLS_RESPONSE

    response = client.get(
        "/cog_presigned_url",
        params={
            "collection": "mxd13a2_vim_dekad",
            "date": "2026-04-01",
            "band": "vim",
            "bbox": "31,-25,40,-11",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"urls": FAKE_URLS_RESPONSE}
    mock_get_presigned.assert_called_once_with(
        "mxd13a2_vim_dekad", "2026-04-01", "vim", (31.0, -25.0, 40.0, -11.0)
    )


def test_endpoint_missing_collection():
    """GET /cog_presigned_url returns 422 when collection is omitted."""
    response = client.get("/cog_presigned_url")
    assert response.status_code == 422


@patch("prism_app.main.get_presigned_cog_urls")
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

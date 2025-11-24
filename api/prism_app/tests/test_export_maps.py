"""Unit tests for map export functionality.

These tests use a mock HTML page to verify rendering and snapshotting logic
without depending on the Prism frontend. They confirm that we can render
and capture pages, but don't care about the actual page content.
"""

import io
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from prism_app.export_maps import export_maps, modify_url_for_date, validate_export_url
from prism_app.main import app
from pypdf import PdfReader

client = TestClient(app)

# Path to mock HTML fixture
MOCK_PAGE_PATH = Path(__file__).parent / "fixtures" / "mock_prism_page.html"


@pytest.fixture
def mock_page_url():
    """Return file:// URL for the mock HTML page."""
    return f"file://{MOCK_PAGE_PATH.absolute()}"


# Core functionality tests - test export_maps function directly
@pytest.mark.asyncio
@pytest.mark.parametrize(
    "dates,format_type,expected_files",
    [
        (["2025-01-01"], "pdf", 1),
        (["2025-01-01", "2025-01-11", "2025-01-21"], "pdf", 3),
        (["2025-01-01"], "zip", 1),
        (["2025-01-01", "2025-01-11", "2025-01-21"], "zip", 3),
    ],
)
async def test_export_maps(mock_page_url, dates, format_type, expected_files):
    """Test export_maps function with various date counts and formats."""
    file_bytes, content_type = await export_maps(
        url=mock_page_url,
        dates=dates,
        aspect_ratio="3:4",
        format_type=format_type,
    )

    # Verify content type
    expected_content_type = (
        "application/pdf" if format_type == "pdf" else "application/zip"
    )
    assert content_type == expected_content_type

    # Verify file structure
    if format_type == "pdf":
        pdf_reader = PdfReader(io.BytesIO(file_bytes))
        assert len(pdf_reader.pages) == expected_files
    elif format_type == "zip":  # zip
        with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zip_file:
            file_list = zip_file.namelist()
            assert len(file_list) == expected_files
            assert all(f"map_{date}.png" in file_list for date in dates)
            # Verify all PNGs are valid
            for filename in file_list:
                png_data = zip_file.read(filename)
                assert png_data.startswith(b"\x89PNG")
    else:
        raise ValueError(f"Invalid format type: {format_type}")


# Utility function tests
@pytest.mark.asyncio
async def test_export_different_aspect_ratios():
    """Test that different aspect ratios produce different viewport dimensions."""
    from prism_app.export_maps import get_viewport_dimensions

    ratios = ["1:1", "3:4", "4:3"]
    dimensions = {}

    for ratio in ratios:
        width, height = get_viewport_dimensions(ratio)
        dimensions[ratio] = (width, height)
        assert width == 1200  # BASE_WIDTH
        assert height > 0

    # Verify they're different
    assert dimensions["1:1"] != dimensions["3:4"]
    assert dimensions["3:4"] != dimensions["4:3"]


def test_modify_url_for_date():
    """Test that URL modification correctly adds/updates date parameter."""
    # Test adding date to URL without date param
    url = "/?hazardLayerIds=test_layer"
    modified = modify_url_for_date(url, "2025-01-01")
    assert "date=2025-01-01" in modified

    # Test updating existing date param
    url_with_date = "/?hazardLayerIds=test_layer&date=2025-01-01"
    modified = modify_url_for_date(url_with_date, "2025-01-11")
    assert "date=2025-01-11" in modified
    assert "date=2025-01-01" not in modified


# URL validation tests - parameterized
@pytest.mark.parametrize(
    "url,should_raise,error_keyword",
    [
        # Allowed URLs
        ("http://localhost/?test=1", False, None),
        ("http://127.0.0.1/?test=1", False, None),
        ("http://localhost:3000/?test=1", False, None),
        ("file:///path/to/file.html", False, None),
        # Disallowed URLs
        ("http://evil.com/?test=1", True, "not allowed"),
        ("/?hazardLayerIds=test_layer", True, "absolute"),
    ],
)
def test_validate_export_url(url, should_raise, error_keyword):
    """Test URL validation with various scenarios."""
    if should_raise:
        with pytest.raises(ValueError) as exc_info:
            validate_export_url(url)
        if error_keyword:
            assert error_keyword in str(exc_info.value).lower()
    else:
        # Should not raise
        validate_export_url(url)


def test_validate_export_url_wildcard_support():
    """Test that wildcard patterns like *.wfp.org are supported."""
    # Mock the EXPORT_ALLOWED_DOMAINS to include a wildcard
    from prism_app import export_maps

    # Save original
    original_domains = export_maps.EXPORT_ALLOWED_DOMAINS.copy()

    # Temporarily set to include wildcard
    export_maps.EXPORT_ALLOWED_DOMAINS = ["*.wfp.org"]

    try:
        # These should be allowed
        validate_export_url("http://wfp.org/?test=1")
        validate_export_url("http://prism.wfp.org/?test=1")
        validate_export_url("http://prism.example.wfp.org/?test=1")

        # These should not be allowed
        with pytest.raises(ValueError, match="not allowed"):
            validate_export_url("http://evil.com/?test=1")
        with pytest.raises(ValueError, match="not allowed"):
            validate_export_url("http://wfp.org.evil.com/?test=1")
    finally:
        # Restore original
        export_maps.EXPORT_ALLOWED_DOMAINS = original_domains


# API endpoint tests - focus on HTTP layer, not re-testing all business logic
@pytest.mark.parametrize(
    "format_type,expected_content_type",
    [("pdf", "application/pdf"), ("zip", "application/zip")],
)
def test_export_endpoint_success(mock_page_url, format_type, expected_content_type):
    """Test POST /export endpoint returns correct content type and headers."""
    response = client.post(
        "/export",
        json={
            "url": mock_page_url,
            "dates": ["2025-01-01"],
            "aspectRatio": "3:4",
            "format": format_type,
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == expected_content_type
    assert "attachment" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith(f'.{format_type}"')


def test_export_endpoint_multiple_dates(mock_page_url):
    """Test POST /export endpoint with multiple dates returns correct page count."""
    dates = ["2025-01-01", "2025-01-11", "2025-01-21"]
    response = client.post(
        "/export",
        json={
            "url": mock_page_url,
            "dates": dates,
            "aspectRatio": "3:4",
            "format": "pdf",
        },
    )

    assert response.status_code == 200
    pdf_reader = PdfReader(io.BytesIO(response.content))
    assert len(pdf_reader.pages) == len(dates)


# Validation error tests - parameterized
@pytest.mark.parametrize(
    "request_data,expected_status",
    [
        ({"aspectRatio": "16:9"}, 422),  # Invalid aspect ratio
        ({"format": "jpg"}, 422),  # Invalid format
        ({"dates": []}, 422),  # Empty dates
        ({"dates": ["2025/01/01"]}, 422),  # Invalid date format
        ({"url": "http://evil.com/?test=1"}, 422),  # Disallowed domain
        ({"url": "/?hazardLayerIds=test_layer"}, 422),  # Relative URL
    ],
)
def test_export_endpoint_validation_errors(
    mock_page_url, request_data, expected_status
):
    """Test POST /export endpoint validation errors."""
    # Build request with defaults
    default_request = {
        "url": mock_page_url,
        "dates": ["2025-01-01"],
        "aspectRatio": "3:4",
        "format": "pdf",
    }
    default_request.update(request_data)

    response = client.post("/export", json=default_request)
    assert response.status_code == expected_status


def test_export_endpoint_localhost_allowed():
    """Test POST /export endpoint with localhost URL is allowed."""
    response = client.post(
        "/export",
        json={
            "url": "http://localhost:3000/?hazardLayerIds=test_layer",
            "dates": ["2025-01-01"],
            "aspectRatio": "3:4",
            "format": "pdf",
        },
    )

    # Should not be a validation error (might be 500 if Playwright can't connect, but not 422)
    assert response.status_code != 422

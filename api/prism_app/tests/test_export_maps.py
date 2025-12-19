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
from prism_app.export_maps import export_maps, validate_export_url
from prism_app.main import app
from pypdf import PdfReader

client = TestClient(app)

# Path to mock HTML fixture
MOCK_PAGE_PATH = Path(__file__).parent / "fixtures" / "mock_prism_page.html"

# Base URL for mock page - use this directly in parametrize instead of fixture
MOCK_PAGE_URL = f"file://{MOCK_PAGE_PATH.absolute()}"

# Test date constant for consistent date values across tests
TEST_DATE = "2025-01-01"


@pytest.fixture
def mock_page_url():
    """Return file:// URL for the mock HTML page."""
    return f"{MOCK_PAGE_URL}?date={TEST_DATE}"


# Core functionality tests - test export_maps function directly
@pytest.mark.asyncio
@pytest.mark.parametrize(
    "urls,format_type,expected_files",
    [
        ([f"{MOCK_PAGE_URL}?date={TEST_DATE}"], "pdf", 1),
        (
            [
                f"{MOCK_PAGE_URL}?date={TEST_DATE}",
                f"{MOCK_PAGE_URL}?date=2025-01-11",
                f"{MOCK_PAGE_URL}?date=2025-01-21",
            ],
            "pdf",
            3,
        ),
        ([f"{MOCK_PAGE_URL}?date={TEST_DATE}"], "png", 1),
        (
            [
                f"{MOCK_PAGE_URL}?date={TEST_DATE}",
                f"{MOCK_PAGE_URL}?date=2025-01-11",
                f"{MOCK_PAGE_URL}?date=2025-01-21",
            ],
            "png",
            3,
        ),
    ],
)
async def test_export_maps(urls, format_type, expected_files):
    """Test export_maps function with various date counts and formats."""
    file_bytes, content_type = await export_maps(
        urls=urls,
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
    elif format_type == "png":  # png
        # Extract dates from URLs for verification
        from urllib.parse import parse_qs, urlparse

        dates = []
        for url in urls:
            parsed = urlparse(url)
            query_params = parse_qs(parsed.query, keep_blank_values=True)
            dates.append(query_params["date"][0])

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


# URL validation tests - parameterized
@pytest.mark.parametrize(
    "url,should_raise,error_keyword",
    [
        # Allowed URLs
        (f"http://localhost/?test=1&date={TEST_DATE}", False, None),
        (f"http://127.0.0.1/?test=1&date={TEST_DATE}", False, None),
        (f"http://localhost:3000/?test=1&date={TEST_DATE}", False, None),
        (f"file:///path/to/file.html?date={TEST_DATE}", False, None),
        # Disallowed URLs
        (f"http://evil.com/?test=1&date={TEST_DATE}", True, "not allowed"),
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


def test_validate_export_url_support():
    """Test that wildcard patterns like *.wfp.org are supported."""
    # These should be allowed
    validate_export_url(f"http://wfp.org/?test=1&date={TEST_DATE}")
    validate_export_url(f"https://prism.wfp.org/?test=1&date={TEST_DATE}")
    validate_export_url(f"http://prism.example.wfp.org/?test=1&date={TEST_DATE}")
    validate_export_url(
        f"https://staging-prism-frontend--1622-38oautsx.web.app/?test=1&date={TEST_DATE}"
    )

    # These should not be allowed
    with pytest.raises(ValueError, match="not allowed"):
        validate_export_url(f"http://evil.com/?test=1&date={TEST_DATE}")
    with pytest.raises(ValueError, match="not allowed"):
        validate_export_url(f"http://wfp.org.evil.com/?test=1&date={TEST_DATE}")


# API endpoint tests - focus on HTTP layer, not re-testing all business logic
@pytest.mark.parametrize(
    "format_type,expected_content_type",
    [("pdf", "application/pdf"), ("png", "application/zip")],
)
def test_export_endpoint_success(mock_page_url, format_type, expected_content_type):
    """Test POST /export endpoint returns correct content type and headers."""
    response = client.post(
        "/export",
        json={
            "urls": [mock_page_url],
            "viewportWidth": 1200,
            "viewportHeight": 1600,
            "format": format_type,
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == expected_content_type
    assert "attachment" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith(
        f'.{format_type if format_type == "pdf" else "zip"}"'
    )


def test_export_endpoint_multiple_dates(mock_page_url):
    """Test POST /export endpoint with multiple dates returns correct page count."""
    dates = [TEST_DATE, "2025-01-11", "2025-01-21"]
    response = client.post(
        "/export",
        json={
            "urls": [f"{MOCK_PAGE_URL}?date={date}" for date in dates],
            "viewportWidth": 1200,
            "viewportHeight": 1600,
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
        ({"viewportWidth": 100}, 422),  # Width too small
        ({"viewportHeight": 100}, 422),  # Height too small
        ({"format": "jpg"}, 422),  # Invalid format
        ({"urls": []}, 422),  # Empty urls
        (
            {"urls": ["http://localhost/?test=1&date=2025/01/01"]},
            422,
        ),  # Invalid date format
        ({"urls": ["http://localhost/?test=1"]}, 422),  # Missing date parameter
        ({"urls": ["http://evil.com/?test=1"]}, 422),  # Disallowed domain
        ({"urls": ["/?hazardLayerIds=test_layer"]}, 422),  # Relative URL
    ],
)
def test_export_endpoint_validation_errors(
    mock_page_url, request_data, expected_status
):
    """Test POST /export endpoint validation errors."""
    # Build request with defaults
    default_request = {
        "urls": [f"http://localhost/?test=1&date={TEST_DATE}"],
        "viewportWidth": 1200,
        "viewportHeight": 849,
        "format": "pdf",
    }
    default_request.update(request_data)

    response = client.post("/export", json=default_request)
    assert response.status_code == expected_status

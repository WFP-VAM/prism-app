import shutil
from unittest.mock import patch

import pytest
from app.playwright_renderer import playwright_download_report


@pytest.mark.asyncio
async def test_playwright_download_report():
    """Test generate report using playwright and returns a path string"""
    # Arrange
    shutil.rmtree("/cache/reports/", ignore_errors=False, onerror=None)

    # Act
    report_path: str = await playwright_download_report(
        "https://prism-900.surge.sh/?hazardLayerIds=flood_extent&date=2023-07-07", "en"
    )

    # Assert
    assert report_path == "/cache/reports/report-flood_extent-en-2023-07-07.pdf"


@pytest.mark.asyncio
@patch("playwright.async_api.async_playwright")
async def test_should_load_report_from_cache_if_present(playwright_mock):
    """Test generate report using cache directory and returns a path string"""
    # Act
    report_path: str = await playwright_download_report(
        "https://prism-900.surge.sh/?hazardLayerIds=flood_extent&date=2023-07-07", "en"
    )

    # Arrange
    assert report_path == "/cache/reports/report-flood_extent-en-2023-07-07.pdf"
    playwright_mock.assert_not_called()

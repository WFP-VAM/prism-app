import os
import shutil
from typing import Final
from unittest.mock import patch

import pytest
from app.caching import CACHE_DIRECTORY
from app.playwright_renderer import playwright_download_report

EXPECTED_REPORT_FILEPATH: Final[str] = os.path.join(
    CACHE_DIRECTORY, "reports/", "report-cambodia-flood_extent-en-2023-07-07.pdf"
)


@pytest.mark.asyncio
async def test_playwright_download_report():
    """Test generate report using playwright and returns a path string"""
    # Arrange
    shutil.rmtree(
        os.path.join(CACHE_DIRECTORY, "reports/"), ignore_errors=True, onerror=None
    )

    # Act
    report_path: str = await playwright_download_report(
        "https://prism-900.surge.sh/?hazardLayerIds=flood_extent%2Cews_remote&date=2023-07-07",
        "flood_extent",
        "cambodia",
        "en",
    )

    # Assert
    assert report_path == EXPECTED_REPORT_FILEPATH


@pytest.mark.asyncio
@patch("playwright.async_api.async_playwright")
async def test_should_load_report_from_cache_if_present(playwright_mock):
    """Test generate report using cache directory and returns a path string"""
    # Arrange
    if not os.path.exists(os.path.join(CACHE_DIRECTORY, "reports/")):
        # If it doesn't exist, create the directory
        os.makedirs(os.path.join(CACHE_DIRECTORY, "reports/"))
    with open(
        EXPECTED_REPORT_FILEPATH,
        "w",
    ) as fp:
        fp.write("Cached pdf report")
        pass

    # Act
    report_path: str = await playwright_download_report(
        "https://prism-900.surge.sh/?hazardLayerIds=flood_extent&date=2023-07-07",
        "flood_extent",
        "cambodia",
        "en",
    )

    # Arrange
    assert report_path == EXPECTED_REPORT_FILEPATH
    playwright_mock.assert_not_called()

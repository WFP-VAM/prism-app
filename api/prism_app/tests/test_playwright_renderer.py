import os
import shutil
from typing import Final
from unittest.mock import patch

import prism_app.caching as caching
import pytest
from prism_app.report import download_report

_REPORT_BASENAME: Final[str] = "report-cambodia-flood_extent-en-2023-07-07.pdf"


def _expected_report_path() -> str:
    """Path under the active cache root (conftest may override CACHE_DIRECTORY)."""
    return os.path.join(caching.CACHE_DIRECTORY, "reports/", _REPORT_BASENAME)


@pytest.mark.asyncio
async def test_download_report():
    """Test generate report using playwright and returns a path string"""
    # Arrange
    shutil.rmtree(
        os.path.join(caching.CACHE_DIRECTORY, "reports/"),
        ignore_errors=True,
        onerror=None,
    )

    # Act
    report_path: str = await download_report(
        "http://frontend:3300/?hazardLayerIds=flood_extent&date=2023-07-07",
        "flood_extent",
        "cambodia",
        "en",
    )

    # Assert
    assert report_path == _expected_report_path()


@pytest.mark.asyncio
@patch("playwright.async_api.async_playwright")
async def test_should_load_report_from_cache_if_present(playwright_mock):
    """Test generate report using cache directory and returns a path string"""
    # Arrange
    if not os.path.exists(os.path.join(caching.CACHE_DIRECTORY, "reports/")):
        # If it doesn't exist, create the directory
        os.makedirs(os.path.join(caching.CACHE_DIRECTORY, "reports/"))
    with open(
        _expected_report_path(),
        "w",
    ) as fp:
        fp.write("Cached pdf report")
        pass

    # Act
    report_path: str = await download_report(
        "http://frontend:3300/?hazardLayerIds=flood_extent&date=2023-07-07",
        "flood_extent",
        "cambodia",
        "en",
    )

    # Assert
    assert report_path == _expected_report_path()
    playwright_mock.assert_not_called()

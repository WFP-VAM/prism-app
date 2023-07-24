import pytest
from app.playwright_renderer import playwright_download_report


@pytest.mark.asyncio
async def test_playwright_download_report():
    """Test generate report that returns a usable path string"""
    # Act
    report_path: str = await playwright_download_report(
        "https://prism-900.surge.sh/?hazardLayerIds=flood_extent&date=2023-07-07", "en"
    )

    # Assert
    assert report_path.startswith("./report-flood_extent-en-")

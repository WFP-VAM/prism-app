import os
from typing import Final, Optional
from urllib.parse import parse_qs, urlparse

from app.caching import CACHE_DIRECTORY
from playwright.async_api import async_playwright

# Html selectors
LAYER_ACCORDION_SELECTOR: Final[
    str
] = 'div[class="MuiAccordionSummary-root"], div[aria-expanded="false"]'
DOWNLOAD_BUTTON_SELECTOR: Final[str] = "a[download]"
CREATE_REPORT_BUTTON_SELECTOR: Final[str] = 'button[id="create-report"]'

# Timeouts
PAGE_TIMEOUT: Final[int] = 25000
PAGE_LANGUAGE_CHANGE_TIMEOUT: Final[int] = 5000


async def playwright_download_report(url: str, language: Optional[str]) -> str:
    language = "en" if language is None else language
    layerIdParam = extract_query_param(url, "hazardLayerIds")
    dateParam = extract_query_param(url, "date")
    report_filename = f"reports/report-{layerIdParam}-{language}-{dateParam}.pdf"
    report_file_path = os.path.join(
        CACHE_DIRECTORY,
        report_filename,
    )

    if os.path.exists(report_file_path):
        return report_file_path

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        page.set_default_timeout(PAGE_TIMEOUT)
        await page.goto(url)

        # Wait for page to be loaded
        await page.wait_for_selector(LAYER_ACCORDION_SELECTOR, state="visible")

        # Toggle level one dropdowns
        await toggle_every_visible_dropdown(page)

        # Toggle level two dropdowns
        await toggle_every_visible_dropdown(page)

        # Click on exposure analysis toggle button
        await click_target_exposure_analysis(page, layerIdParam)

        # Wait for page to be loaded on exposure analysis
        await page.wait_for_selector(CREATE_REPORT_BUTTON_SELECTOR, state="visible")

        # Change language if not english
        await change_language_if_not_default(page, language)

        await click_create_report_button(page)

        # Wait for report to be created by pdf-renderer
        await page.wait_for_selector(DOWNLOAD_BUTTON_SELECTOR)

        async with page.expect_download() as download_info:
            download_report_selector = await page.query_selector(
                DOWNLOAD_BUTTON_SELECTOR
            )
            await download_report_selector.click()

        download = await download_info.value

        await download.save_as(report_file_path)
        await browser.close()
        return str(report_file_path)


async def click_create_report_button(page) -> None:
    create_report_selector = await page.query_selector(CREATE_REPORT_BUTTON_SELECTOR)
    await create_report_selector.click()


async def change_language_if_not_default(page, language) -> None:
    if language and language != "en":
        language_selector = await page.query_selector('p:has-text("' + language + '")')
        await language_selector.click()
        await page.wait_for_timeout(PAGE_LANGUAGE_CHANGE_TIMEOUT)


async def click_target_exposure_analysis(page, layerIdParam) -> None:
    selected_exposure_analysis_button = await page.query_selector(
        'button[id="' + layerIdParam + '"]'
    )
    await selected_exposure_analysis_button.click()


def extract_query_param(url, query_param) -> str:
    parsed_url = urlparse(url)
    query_params = parse_qs(parsed_url.query)
    dateParam = query_params.get(query_param, [""])[0]
    return dateParam


async def toggle_every_visible_dropdown(page) -> None:
    dropdown_level_one_selectors = await page.query_selector_all(
        LAYER_ACCORDION_SELECTOR
    )
    for dropdown in dropdown_level_one_selectors:
        await dropdown.click()

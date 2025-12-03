import json
import os
from typing import Final, Optional
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright, expect
from prism_app.caching import CACHE_DIRECTORY

# Html selectors
LAYER_ACCORDION_SELECTOR: Final[str] = (
    'div[class="MuiAccordionSummary-root"], div[aria-expanded="false"]'
)
DOWNLOAD_BUTTON_SELECTOR: Final[str] = "a[download]"
CREATE_REPORT_BUTTON_SELECTOR: Final[str] = 'button[id="create-report"]'

# Timeouts
PAGE_TIMEOUT: Final[int] = 60000
PAGE_LANGUAGE_CHANGE_TIMEOUT: Final[int] = 10000


async def download_report(
    url: str, layerIdParam: str, country: str, language: Optional[str]
) -> str:
    language = "en" if language is None else language
    dateParam = extract_query_param(url, "date")
    report_filename = f"report-{country}-{layerIdParam}-{language}-{dateParam}.pdf"
    report_file_path = os.path.join(
        CACHE_DIRECTORY,
        "reports/",
        report_filename,
    )

    if os.path.exists(report_file_path):
        return report_file_path

    async def mock_prism_api_stats_call(route):
        with open("./tests/fixtures/prism_api_stats.json") as f:
            j = json.load(f)
        await route.fulfill(json=j)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # TODO - this should only be done in CI
        # mock the api call to avoid network issues in CI
        await page.route("https://prism-api.ovio.org/stats", mock_prism_api_stats_call)

        page.set_default_timeout(PAGE_TIMEOUT)
        await page.goto(url)

        # open language dropdown
        await page.get_by_role("button", name="language-select-dropdown-button").click()

        # Click on the 'en' option
        await page.get_by_role(
            "menuitem", name="language-select-dropdown-menu-item-en"
        ).click()

        # make sure we're on the right tab
        # await page.get_by_role("button", name="Layers").click()

        # expand the first main and first sub dropdowns
        # XPath to match a button whose name starts with "Flood" followed by a space and any number
        await page.click('p.MuiTypography-body1:text("Flood")')

        await page.click('p.MuiTypography-body1:text("Flood Monitoring")')

        # Enable flood extent buttons
        flood_extent_checkbox = page.get_by_role("checkbox", name="Flood extent")
        await expect(flood_extent_checkbox).to_be_visible(timeout=20_000)

        # very long timeout to prevent flakiness in this step that relies heavily
        # on network bandwidth.
        await expect(flood_extent_checkbox).to_be_checked(timeout=60_000)
        await expect(
            page.get_by_role("button", name="Exposure Analysis")
        ).not_to_be_disabled()

        # Click on exposure analysis toggle button
        await click_target_exposure_analysis(page, layerIdParam)

        # Wait for page to be loaded on exposure analysis
        await page.wait_for_selector(
            'div[id="full-width-tabpanel-analysis"]', state="visible"
        )

        await page.wait_for_selector(
            'div[class*="analysisButtonContainer-"]', state="visible"
        )

        await page.wait_for_selector(CREATE_REPORT_BUTTON_SELECTOR, state="attached")

        # # Change language if not english
        await change_language_if_not_default(page, language)
        #
        # # Click on the pdf-renderer preview report button
        await click_create_report_button(page)
        #
        # # Wait for report to be created by pdf-renderer
        await page.wait_for_selector(DOWNLOAD_BUTTON_SELECTOR)

        # Download file on disk
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

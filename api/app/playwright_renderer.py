# import asyncio
import asyncio
import uuid
from typing import Optional
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright


async def playwright_download_report(url: str, language: Optional[str]) -> str:
    async with async_playwright() as p:
        browser = await p.firefox.launch()
        page = await browser.new_page()

        page.set_default_timeout(25000)
        await page.goto(url)

        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        layerIdParam = query_params.get("hazardLayerIds", [""])[0]

        layer_chip_selector = (
            'div[class="MuiAccordionSummary-root"], div[aria-expanded="false"]'
        )

        await page.wait_for_selector(layer_chip_selector, state="visible")

        dropdown_level_one_selectors = await page.query_selector_all(
            layer_chip_selector
        )
        for dropdown in dropdown_level_one_selectors:
            await dropdown.click()

        dropdown_level_two_selectors = await page.query_selector_all(
            layer_chip_selector
        )

        for dropdown in dropdown_level_two_selectors:
            await dropdown.click()

        selected_exposure_analysis_button = await page.query_selector(
            'button[id="' + layerIdParam + '"]'
        )
        await selected_exposure_analysis_button.click()

        create_report_selector_query = 'button[id="create-report"]'
        await page.wait_for_selector(create_report_selector_query, state="visible")

        if language and language != "en":
            language_selector = await page.query_selector(
                'p:has-text("' + language + '")'
            )
            await language_selector.click()
            await page.wait_for_timeout(5000)

        # await page.pdf(path="page.pdf")
        create_report_selector = await page.query_selector(create_report_selector_query)
        await create_report_selector.click()

        download_report_selector_query = "a[download]"
        await page.wait_for_selector(download_report_selector_query)

        async with page.expect_download() as download_info:
            download_report_selector = await page.query_selector(
                download_report_selector_query
            )
            await download_report_selector.click()

        download = await download_info.value
        random_uuid = uuid.uuid4()
        report_file_path = (
            "./report-"
            + layerIdParam
            + "-"
            + language
            + "-"
            + str(random_uuid)
            + ".pdf"
        )

        await download.save_as(report_file_path)
        await browser.close()
        return str(report_file_path)


asyncio.run(
    playwright_download_report(
        "http://localhost:3000/?hazardLayerIds=flood_extent&date=2023-07-21", "kh"
    )
)

# http://host.docker.internal:3000/?hazardLayerIds=flood_extent&date=2023-07-07

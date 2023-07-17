from playwright.async_api import async_playwright


async def playwright_download_report(url: str, language: str) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.set_default_timeout(50000)
        await page.goto(url)

        dropdown1_selector = await page.query_selector('div[id="Flood"]')
        await dropdown1_selector.click()

        dropdown2_selector = await page.query_selector('p:has-text("Flood Monitoring")')
        await dropdown2_selector.click()

        exposure_analysis_selector = await page.query_selector(
            'button[title="Exposure Analysis"]'
        )
        await exposure_analysis_selector.click()

        create_report_selector_query = 'button[id="create-report"]'
        await page.wait_for_selector(create_report_selector_query, state="visible")

        language_selector = await page.query_selector('p:has-text("' + language + '")')
        await language_selector.click()
        # await page.wait_for_timeout(30000)
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
        await download.save_as("./report.pdf")
        await browser.close()
        return str("./report.pdf")


# asyncio.run(
#     playwright_download_report(
#         "http://localhost:3000/?hazardLayerIds=flood_extent&date=2023-07-07", "kh"
#     )
# )

# http://host.docker.internal:3000/?hazardLayerIds=flood_extent&date=2023-07-07

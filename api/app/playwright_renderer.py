from playwright.async_api import async_playwright


async def playwright_download_report(url: str, language: str):
    with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.set_default_timeout(0)
        await page.goto(url)

        await page.query_selector('div[id="Flood"]').click()
        await page.query_selector('p:has-text("Flood Monitoring")').click()
        await page.query_selector('button[title="Exposure Analysis"]').click()
        create_report_selector = 'p:has-text("Create Report")'
        await page.wait_for_selector(create_report_selector, state="visible")

        await page.query_selector('p:has-text("' + language + '")').click()
        # await page.wait_for_timeout(30000)
        # await page.pdf(path="page.pdf")
        page.query_selector(create_report_selector).click()

        download_report_selector = "a[download]"
        await page.wait_for_selector(download_report_selector)

        with page.expect_download() as download_info:
            page.query_selector(download_report_selector).click()

        download = download_info.value
        download.save_as("./report.pdf")
        browser.close()


playwright_download_report(
    "http://localhost:3000/?hazardLayerIds=flood_extent&date=2023-07-07", "kh"
)

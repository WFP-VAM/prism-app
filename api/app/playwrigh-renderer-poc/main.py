from playwright.sync_api import sync_playwright


# TODO: Needed layerIds as parameter
def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_default_timeout(0)
        page.goto("http://localhost:3000/?hazardLayerIds=flood_extent&date=2023-07-07")
        page.query_selector('div[id="Flood"]').click()
        page.query_selector('p:has-text("Flood Monitoring")').click()
        page.query_selector('button[title="Exposure Analysis"]').click()
        create_report_selector = 'p:has-text("Create Report")'
        page.wait_for_selector(create_report_selector, state="visible")
        page.query_selector(create_report_selector).click()

        download_report_selector = 'a:has-text("Download")'
        page.wait_for_selector(download_report_selector)

        with page.expect_download() as download_info:
            page.query_selector(download_report_selector).click()

        download = download_info.value
        download.save_as("./report.pdf")
        browser.close()


main()

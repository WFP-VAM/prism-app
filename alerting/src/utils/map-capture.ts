const puppeteer = require('puppeteer');

async function captureMapScreenshot() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage();

  await page.setViewport({ 
    width: 1920, 
    height: 1080,
  });

  // TODO: get date from the alert worker and pass it to the URL
  await page.goto('http://localhost:3000/?hazardLayerIds=anticipatory_action_storm&date=2025-01-14', { waitUntil: 'load' });

  // Wait for the canvas element to be fully rendered
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement | null;
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 30000 });

  // Hide UI elements that may overlap or obstruct the map view
  await page.evaluate(() => {
    const elementsToHide = document.querySelectorAll('.MuiDrawer-root, .MuiList-root, .MuiGrid-root');
    elementsToHide.forEach((el) => {
      const htmlElement = el as HTMLElement
      htmlElement.style.display = 'none';
    });
  });

  // Wait until the canvas element is visible in the DOM
  await page.waitForSelector('.maplibregl-canvas', { visible: true });
  const canvas = await page.$('.maplibregl-canvas');

  if (canvas) {
      //TODO: we can enhance this by getting the storm coordinates to adjust the crop 
      const cropRegion = {
        x: 900,
        y: 200,
        width: 1000,
        height: 800,
      };
      await page.screenshot({
        path: 'map_screenshot8.png',
        clip: cropRegion 
      });
      console.log("Screenshot taken for the canvas area.");
  } else {
    console.log("Canvas element not found.");
  }

  await browser.close();
}

captureMapScreenshot().catch(console.error);

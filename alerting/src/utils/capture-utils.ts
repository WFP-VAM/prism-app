import puppeteer, { Browser, Page, BoundingBox } from 'puppeteer';

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotOptions {
  url: string;
  crop?: CropRegion;
  screenshotPath?: string;
  elementToScreenshot?: string;
  elementsToHide?: string[];
}

const DEFAULT_CROP: CropRegion = {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
};
const DEFAULT_ELEMENT = '.maplibregl-canvas';
const DEFAULT_SCREENSHOT_PATH = 'screenshot.png';

async function captureScreenshotFromUrl(options: ScreenshotOptions): Promise<void> {
  const { url, crop = DEFAULT_CROP, screenshotPath = DEFAULT_SCREENSHOT_PATH, elementToScreenshot = DEFAULT_ELEMENT, elementsToHide = [] } = options;

  let browser: Browser | null = null;

  try {

    browser = await puppeteer.launch();
    const page: Page = await browser.newPage();


    await page.setViewport({ width: 1920, height: 1080 });


    await page.goto(url, { waitUntil: 'load' });

    // Wait for the element to be visible in the DOM
    await page.waitForSelector(elementToScreenshot, { visible: true });

    // Hide specified elements if any
    if (elementsToHide.length > 0) {
      await page.evaluate((selectors: string[]) => {
        selectors.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            const htmlElement = el as HTMLElement;
            htmlElement.style.display = 'none';
          });
        });
      }, elementsToHide);
    }

    // Wait until the target element has valid dimensions
    await page.waitForFunction(
      (selector: string) => {
        const element = document.querySelector(selector) as HTMLElement | null;
        return element && element.offsetWidth > 0 && element.offsetHeight > 0;
      },
      { timeout: 30000 },
      elementToScreenshot
    );

    // Get the bounding box of the target element
    const targetElement = await page.$(elementToScreenshot);
    if (!targetElement) {
      throw new Error(`Element with selector "${elementToScreenshot}" not found.`);
    }

    const boundingBox: BoundingBox | null = await targetElement.boundingBox();
    if (!boundingBox) {
      throw new Error(`Unable to retrieve bounding box for "${elementToScreenshot}".`);
    }

    const finalCrop: CropRegion = crop || {
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height,
    };

    await page.screenshot({ 
      path: screenshotPath,
      clip: finalCrop,
    });

    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Failed to capture screenshot: ${error.message}`);
    } else {
      console.error('An unknown error occurred');
    }
  } finally {
    if (browser) await browser.close();
  }
}
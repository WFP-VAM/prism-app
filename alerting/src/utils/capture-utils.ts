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
  screenshotTargetSelector?: string;
  elementsToHide?: string[];
}

const DEFAULT_CROP: CropRegion = {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
};
const DEFAULT_TARGET = '.maplibregl-canvas';

async function captureScreenshotFromUrl(options: ScreenshotOptions): Promise<string> {
  const { url, crop = DEFAULT_CROP, screenshotTargetSelector = DEFAULT_TARGET, elementsToHide = [] } = options;

  let browser: Browser | null = null;
  let base64Image: string = '';

  try {

    browser = await puppeteer.launch();
    const page: Page = await browser.newPage();


    await page.setViewport({ width: 1920, height: 1080 });


    await page.goto(url, { waitUntil: 'load' });

    // Wait for the element to be visible in the DOM
    await page.waitForSelector(screenshotTargetSelector, { visible: true });

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
      screenshotTargetSelector
    );

    // Get the bounding box of the target element
    const targetElement = await page.$(screenshotTargetSelector);
    if (!targetElement) {
      throw new Error(`Element with selector "${screenshotTargetSelector}" not found.`);
    }

    const boundingBox: BoundingBox | null = await targetElement.boundingBox();
    if (!boundingBox) {
      throw new Error(`Unable to retrieve bounding box for "${screenshotTargetSelector}".`);
    }

    const finalCrop: CropRegion = crop || {
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height,
    };

    base64Image = await page.screenshot({ 
      encoding: 'base64', // use path to save to file
      clip: finalCrop,
    });

    console.log('Screenshot captured');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Failed to capture screenshot: ${error.message}`);
    } else {
      console.error('An unknown error occurred');
    }
  } finally {
    if (browser) await browser.close();
  }

  return base64Image;
}
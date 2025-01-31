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

/**
 * Captures a screenshot of a specified URL, potentially cropping the image and hiding specific elements.
 * 
 * This function uses Puppeteer to open a browser, navigate to the provided URL, and capture a screenshot of
 * the page. It allows for cropping the image to a specific region, hiding certain elements on the page, and
 * conditionally checking for WebGL support if the target element is a canvas.
 * 
 * If the target element is a `canvas`, it checks if WebGL is available, waits for the frame rendering, and
 * then captures the screenshot. If the element is not a canvas, it skips the WebGL-related checks and captures
 * the screenshot normally.
 * 
 * @param {ScreenshotOptions} options - The options for capturing the screenshot.
 * @param {string} options.url - The URL of the page to capture.
 * @param {CropRegion} [options.crop] - The crop region for the screenshot, specifying the x, y, width, and height.
 * @param {string} [options.screenshotTargetSelector] - The CSS selector of the target element to capture (defaults to '.maplibregl-canvas').
 * @param {string[]} [options.elementsToHide] - An array of CSS selectors for elements to hide before capturing the screenshot.
 * 
 * @returns {Promise<string>} - A promise that resolves to a base64-encoded string of the captured screenshot, or an empty string if the capture fails.
 */
async function captureScreenshotFromUrl(options: ScreenshotOptions): Promise<string> {
  const { url, crop = DEFAULT_CROP, screenshotTargetSelector = DEFAULT_TARGET, elementsToHide = [] } = options;

  let browser: Browser | null = null;
  let base64Image: string = '';

  try {

    browser = await puppeteer.launch({args: ['--use-gl=egl']});
    const page: Page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(url, {waitUntil : "networkidle0", timeout: 0});

    // Wait for the element to be visible in the DOM
    await page.waitForSelector(screenshotTargetSelector, { visible: true });

    // Check if the target element is a canvas
    const isCanvas = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element && element.tagName.toLowerCase() === 'canvas';
    }, screenshotTargetSelector);

    // Check if WebGL is supported
    const testWebGL = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || canvas.getContext('webgl2');
      return !!gl;
    });
    console.log(`WebGL global support: ${testWebGL ? 'Yes' : 'No'}`);

    if (isCanvas) {
      // If the target element is a canvas, check if it uses WebGL
      console.log('Element is a canvas, checking WebGL...');

      // Wait until the target element has valid dimensions
      await page.waitForFunction(
        (selector) => {
          const canvas = document.querySelector(selector) as HTMLCanvasElement | null;
          return canvas && canvas.width > 0 && canvas.height > 0;
        },
        { timeout: 60000 },
        screenshotTargetSelector
      ).catch(error => {
        console.error(`Error waiting for canvas dimensions: ${error.message}`);
        throw error;
      });

      // Check if the canvas uses WebGL
      const hasWebGL = await page.evaluate((selector) => {
        const canvas = document.querySelector(selector) as HTMLCanvasElement | null;
        if (!canvas) {
          return false;
        }

        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || canvas.getContext('webgl2');
        if (!gl) {
          return false;
        }
        return true;
      }, screenshotTargetSelector);

      if (hasWebGL) {
        console.log('WebGL detected, waiting for frame rendering...');
        await page.evaluate(() => {
          return new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(resolve);
            });
          });
        }).catch(error => {
          console.error(`Error waiting for frame rendering: ${error.message}`);
          throw error;
        });
      }
    } else {
      console.log('The element is not a canvas, no WebGL check needed.');

      // Wait until the target element has valid dimensions
      await page.waitForFunction(
        (selector: string) => {
          const element = document.querySelector(selector) as HTMLElement | null;
          return element && element.offsetWidth > 0 && element.offsetHeight > 0;
        },
        { timeout: 30000 },
        screenshotTargetSelector
      ).catch(error => {
        console.error(`Error waiting for element dimensions: ${error.message}`);
        throw error;
      });
    }

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
      type: 'jpeg',
      quality: 70,
      fullPage: false,
      encoding: 'base64',
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
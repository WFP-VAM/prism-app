import { test, expect } from '@playwright/test';
import { switchLanguage } from '../helpers/layer-helpers';

test.describe('General stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    console.log('🔵 Setting viewport to 1280x720');
  });

  test('should start without hanging and show the map', async ({ page }) => {
    console.log('🔵 Starting test: should start without hanging and show the map');
    console.log('🔵 Visiting: http://localhost:3000');

    await page.goto('http://localhost:3000');

    const url = page.url();
    const readyState = await page.evaluate(() => document.readyState);
    const title = await page.title();
    console.log(`🔵 Window location: ${url}`);
    console.log(`🔵 Document ready state: ${readyState}`);
    console.log(`🔵 Document title: ${title}`);

    console.log('🔵 Waiting for MapTiler to be visible (timeout: 20000ms)');
    await page.waitForSelector('text=MapTiler', { timeout: 20000 });
    console.log('✅ MapTiler is visible');

    console.log('🔵 Looking for language selector button (timeout: 20000ms)');
    const languageButton = page.locator(
      '[aria-label="language-select-dropdown-button"]',
    );
    await languageButton.waitFor({ state: 'visible', timeout: 20000 });
    console.log('✅ Language selector button found');
    await languageButton.scrollIntoViewIfNeeded();
    await languageButton.click({ force: true });
    console.log('✅ Language selector clicked');

    console.log('🔵 Looking for English language option');
    const englishOption = page.locator(
      '[aria-label="language-select-dropdown-menu-item-en"]',
    );
    await englishOption.waitFor({ state: 'visible', timeout: 20000 });
    console.log('✅ English language option found');
    await englishOption.click();
    console.log('✅ English language selected');

    console.log('🔵 Waiting for "Layers" text to appear');
    await page.waitForSelector('text=Layers', { state: 'visible', timeout: 20000 });
    console.log('✅ Layers text is visible - test passed');
  });
});

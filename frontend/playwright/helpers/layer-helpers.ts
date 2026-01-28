import { Page } from '@playwright/test';
import { makeSafeIDFromTitle } from '../../src/components/MapView/LeftPanel/layersPanel/MenuItem/utils';

/**
 * Helper function to activate a layer in the UI
 * @param page Playwright page object
 * @param group1 First level group name (e.g., "Rainfall")
 * @param group2 Second level group name (e.g., "INAM Rainfall Data")
 * @param layerName Layer name as shown next to the toggle (e.g., "Rainfall aggregate")
 */
export async function activateLayer(
  page: Page,
  group1: string,
  group2: string,
  layerName: string,
): Promise<void> {
  const level1Id = `#level1-${makeSafeIDFromTitle(group1)}`;
  const level2Id = `#level2-${makeSafeIDFromTitle(group2)}`;
  const checkboxSelector = `[type="checkbox"][aria-label="${layerName}"]`;

  console.log(`🔵 activateLayer: Looking for level1 element: ${level1Id}`);

  const level1Element = page.locator(level1Id);
  await level1Element.waitFor({ state: 'visible', timeout: 20000 });

  const ariaExpanded = await level1Element.getAttribute('aria-expanded');
  console.log(`🔵 activateLayer: Found level1 element, ariaExpanded: ${ariaExpanded}`);

  if (ariaExpanded === 'false') {
    console.log(`🔵 activateLayer: Expanding level1: ${group1}`);
    await level1Element.click();
  }

  console.log(`🔵 activateLayer: Looking for level2 element: ${level2Id}`);
  const level2Element = page.locator(level2Id);
  await level2Element.waitFor({ state: 'visible', timeout: 20000 });

  const level2AriaExpanded = await level2Element.getAttribute('aria-expanded');
  console.log(`🔵 activateLayer: Found level2 element, ariaExpanded: ${level2AriaExpanded}`);

  if (level2AriaExpanded === 'false') {
    console.log(`🔵 activateLayer: Expanding level2: ${group2}`);
    await level2Element.click();
  }

  console.log(`🔵 activateLayer: Looking for checkbox: ${checkboxSelector}`);
  const checkbox = page.locator(checkboxSelector);
  await checkbox.waitFor({ state: 'visible', timeout: 20000 });
  console.log(`🔵 activateLayer: Found checkbox, clicking to activate: ${layerName}`);
  await checkbox.click();
  console.log(`✅ activateLayer: Successfully activated layer: ${layerName}`);
}

/**
 * Helper function to deactivate a layer
 */
export async function deactivateLayer(
  page: Page,
  layerName: string,
): Promise<void> {
  const checkboxSelector = `[type="checkbox"][aria-label="${layerName}"]`;
  const checkbox = page.locator(checkboxSelector);
  await checkbox.waitFor({ state: 'visible', timeout: 20000 });
  await checkbox.click();
}

/**
 * Helper function to switch language
 */
export async function switchLanguage(
  page: Page,
  langcode: string,
): Promise<void> {
  console.log(`🔵 switchLanguage: Switching to language: ${langcode}`);

  const languageButton = page.locator(
    '[aria-label="language-select-dropdown-button"]',
  );
  await languageButton.waitFor({ state: 'visible', timeout: 20000 });
  console.log('✅ switchLanguage: Language dropdown button found');
  await languageButton.scrollIntoViewIfNeeded();
  await languageButton.click({ force: true });
  console.log('✅ switchLanguage: Language selector clicked');

  console.log(`🔵 switchLanguage: Looking for language option: ${langcode}`);
  const languageOption = page.locator(
    `[aria-label="language-select-dropdown-menu-item-${langcode}"]`,
  );
  await languageOption.waitFor({ state: 'visible', timeout: 20000 });
  console.log(`✅ switchLanguage: Language option ${langcode} found`);
  await languageOption.click();
  console.log('🔵 switchLanguage: Waiting for "Layers" text');
  await page.waitForSelector('text=Layers', { state: 'visible', timeout: 20000 });
  console.log(`✅ switchLanguage: Successfully switched to ${langcode}`);
}

/**
 * Helper function to scroll timeline left
 */
export async function scrollLeft(page: Page): Promise<void> {
  const button = page.locator('button#chevronLeftButton');
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await button.click();
}

/**
 * Helper function to scroll timeline right
 */
export async function scrollRight(page: Page): Promise<void> {
  const button = page.locator('button#chevronRightButton');
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await button.click();
}

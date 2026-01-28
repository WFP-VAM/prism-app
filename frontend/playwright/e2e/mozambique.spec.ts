import { test, expect } from '@playwright/test';
import {
  activateLayer,
  switchLanguage,
  scrollLeft,
  scrollRight,
} from '../helpers/layer-helpers';

const frontendUrl = 'http://localhost:3000';

test.describe('Loading layers', () => {
  test('checks that dates are loaded', async ({ page }) => {
    console.log('🔵 Starting test: checks that dates are loaded');
    console.log(`🔵 Visiting: ${frontendUrl}`);

    await page.goto(frontendUrl);

    console.log('🔵 Waiting for page to load...');
    const url = page.url();
    const readyState = await page.evaluate(() => document.readyState);
    console.log(`🔵 Window location: ${url}`);
    console.log(`🔵 Document ready state: ${readyState}`);

    console.log(
      '🔵 Activating layer: Rainfall > INAM Rainfall Data > Rainfall aggregate',
    );
    await activateLayer(page, 'Rainfall', 'INAM Rainfall Data', 'Rainfall aggregate');

    console.log('🔵 Checking URL contains hazardLayerIds=precip_blended_dekad');
    await expect(page).toHaveURL(/hazardLayerIds=precip_blended_dekad/);
    const finalUrl = page.url();
    console.log(`✅ URL check passed: ${finalUrl}`);
  });
});

test.describe('Loading dates', () => {
  test('switching to AA from rainfall layer should load latest data', async ({
    page,
  }) => {
    const testUrl = `${frontendUrl}/?hazardLayerIds=rainfall_dekad&date=2025-09-01`;
    console.log('🔵 Starting test: switching to AA from rainfall layer');
    console.log(`🔵 Visiting: ${testUrl}`);

    await page.goto(testUrl);

    console.log('🔵 Waiting for MapTiler to be visible (timeout: 20000ms)');
    await page.waitForSelector('text=MapTiler', { timeout: 20000 });
    console.log('✅ MapTiler is visible');

    console.log('🔵 Looking for date picker (timeout: 20000ms)');
    const datePicker = page.locator('.react-datepicker-wrapper button span');
    await datePicker.waitFor({ state: 'visible', timeout: 20000 });

    const initialDateText = await datePicker.textContent();
    console.log(`🔵 Found date picker with text: "${initialDateText}"`);

    expect(initialDateText).toMatch(/^Sep 1, 2025$/);
    console.log('✅ Initial date matches expected format');

    console.log('🔵 Clicking on A. Actions header');
    const actionsHeader = page.locator('header').getByText('A. Actions');
    await actionsHeader.waitFor({ state: 'visible', timeout: 20000 });
    await actionsHeader.click();
    console.log('✅ A. Actions clicked');

    console.log('🔵 Clicking on A. Action Flood');
    const floodAction = page
      .locator('div.MuiPopover-paper')
      .getByText('A. Action Flood');
    await floodAction.waitFor({ state: 'visible', timeout: 20000 });
    await floodAction.click();
    console.log('✅ A. Action Flood clicked');

    console.log('🔵 Waiting for date picker to update (timeout: 20000ms)');
    const updatedDatePicker = page.locator(
      '.react-datepicker-wrapper button span',
    );
    await updatedDatePicker.waitFor({ state: 'visible', timeout: 20000 });

    const updatedDateText = await updatedDatePicker.textContent();
    console.log(`🔵 Found updated date picker with text: "${updatedDateText}"`);

    expect(updatedDateText).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);

    const firstDate = new Date(initialDateText!).getTime();
    const secondDate = new Date(updatedDateText!).getTime();
    console.log(
      `🔵 Comparing dates: ${initialDateText} (${firstDate}) vs ${updatedDateText} (${secondDate})`,
    );
    expect(secondDate).toBeGreaterThan(firstDate);
    console.log('✅ Date comparison passed - AA date is newer');

    console.log('🔵 Looking for Gauge station text (timeout: 10000ms)');
    const gaugeStation = page
      .locator('#full-width-tabpanel-anticipatory_action_flood')
      .getByText('Gauge station');
    await gaugeStation.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Gauge station is visible');
  });
});

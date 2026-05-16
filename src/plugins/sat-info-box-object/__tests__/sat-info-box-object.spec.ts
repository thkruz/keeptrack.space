import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatInfoBoxObject', () => {
  test('object section injected into sat-info-box DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        SatInfoBoxCore: { enabled: true },
        SatInfoBoxObject: { enabled: true },
      },
    });

    // Object section and its data fields should be in the DOM
    await expect(page.locator('#object-section')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('#sat-type')).toBeAttached();
    await expect(page.locator('#sat-status')).toBeAttached();
    await expect(page.locator('#sat-country')).toBeAttached();
    await expect(page.locator('#sat-launchSite')).toBeAttached();

    // Standard and apparent magnitude rows are part of the object section
    await expect(page.locator('#sat-stdmag-row')).toBeAttached();
    await expect(page.locator('#sat-stdmag')).toBeAttached();
    await expect(page.locator('#sat-appmag-row')).toBeAttached();
    await expect(page.locator('#sat-appmag')).toBeAttached();

    // Apparent magnitude row starts hidden until a sensor is selected
    await expect(page.locator('#sat-appmag-row')).toBeHidden();

    // Secondary satellite comparison section
    await expect(page.locator('#secondary-sat-info')).toBeAttached();
  });
});

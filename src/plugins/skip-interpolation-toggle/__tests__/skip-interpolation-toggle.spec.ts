import { expect, test } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SkipInterpolationToggle', () => {
  test('toggle skip interpolation via utility icon', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SkipInterpolationToggle: { enabled: true } },
    });

    const utilityIcon = page.locator('#SkipInterpolationToggle-utility-icon');

    await expect(utilityIcon).toBeVisible();

    // Click to toggle
    await utilityIcon.dispatchEvent('click');

    // Verify state changed via settingsManager
    await expect(async () => {
      const state = await page.evaluate(() => window.settingsManager?.isSkipTleInterpolation);

      expect(state).toBe(true);
    }).toPass({ timeout: 5_000 });

    // Click again to toggle off
    await utilityIcon.dispatchEvent('click');

    await expect(async () => {
      const state = await page.evaluate(() => window.settingsManager?.isSkipTleInterpolation);

      expect(state).toBe(false);
    }).toPass({ timeout: 5_000 });
  });
});

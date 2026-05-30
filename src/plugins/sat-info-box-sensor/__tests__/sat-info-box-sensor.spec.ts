import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatInfoBoxSensor', () => {
  test('sensor section injected into sat-info-box DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        SatInfoBoxCore: { enabled: true },
        SatInfoBoxSensor: { enabled: true },
      },
    });

    await expect(page.locator('#sensor-sat-info')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('#sat-range')).toBeAttached();
    await expect(page.locator('#sat-azimuth')).toBeAttached();
    await expect(page.locator('#sat-elevation')).toBeAttached();
  });
});

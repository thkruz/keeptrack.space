import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatInfoBoxOrbital', () => {
  test('orbital section injected into sat-info-box DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        SatInfoBoxCore: { enabled: true },
        SatInfoBoxOrbital: { enabled: true },
      },
    });

    await expect(page.locator('#orbital-section')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('#sat-apogee')).toBeAttached();
    await expect(page.locator('#sat-perigee')).toBeAttached();
    await expect(page.locator('#sat-inclination')).toBeAttached();
    await expect(page.locator('#sat-eccentricity')).toBeAttached();
    await expect(page.locator('#sat-latitude')).toBeAttached();
    await expect(page.locator('#sat-longitude')).toBeAttached();
    await expect(page.locator('#sat-altitude')).toBeAttached();
    await expect(page.locator('#sat-period')).toBeAttached();
  });
});

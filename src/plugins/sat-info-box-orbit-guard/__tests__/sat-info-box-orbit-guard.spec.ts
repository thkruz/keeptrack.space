import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatInfoBoxOrbitGuard', () => {
  test('maneuver section injected into sat-info-box DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        SatInfoBoxCore: { enabled: true },
        SatInfoBoxManeuver: { enabled: true },
      },
    });

    await expect(page.locator('#maneuver-sat-info')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('#maneuver-sat-info-data')).toBeAttached();
  });
});

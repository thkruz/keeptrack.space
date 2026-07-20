import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ViewInfoRmbPlugin', () => {
  test('right-click menu elements exist in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ViewInfoRmbPlugin: { enabled: true } },
    });

    // RMB L1 and L2 elements should be injected into the DOM
    await expect(page.locator('#view-rmb')).toBeAttached();
    await expect(page.locator('#view-rmb-menu')).toBeAttached();
    await expect(page.locator('#view-info-rmb')).toBeAttached();
    await expect(page.locator('#view-sensor-info-rmb')).toBeAttached();
    // Satellite Info was removed - left-click already selects the satellite
    await expect(page.locator('#view-sat-info-rmb')).not.toBeAttached();
  });
});

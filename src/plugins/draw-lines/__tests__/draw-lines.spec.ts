import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('DrawLinesPlugin', () => {
  test('right-click menu elements exist in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { DrawLinesPlugin: { enabled: true } },
    });

    // DrawLinesPlugin is RMB-only (no bottom icon, no side menu).
    // Verify that right-click menu L1 and L2 items are injected into the DOM.
    await expect(page.locator('#draw-rmb')).toBeAttached();
    await expect(page.locator('#draw-rmb-menu')).toBeAttached();

    // Verify individual line-drawing options exist
    await expect(page.locator('#line-eci-axis-rmb')).toBeAttached();
    await expect(page.locator('#line-eci-xgrid-rmb')).toBeAttached();
    await expect(page.locator('#line-eci-ygrid-rmb')).toBeAttached();
    await expect(page.locator('#line-eci-zgrid-rmb')).toBeAttached();
    await expect(page.locator('#line-eci-radial-xgrid-rmb')).toBeAttached();
    await expect(page.locator('#line-eci-radial-ygrid-rmb')).toBeAttached();
    await expect(page.locator('#line-eci-radial-zgrid-rmb')).toBeAttached();
    await expect(page.locator('#line-earth-sat-rmb')).toBeAttached();
    await expect(page.locator('#line-sensor-sat-rmb')).toBeAttached();
    await expect(page.locator('#line-sat-sat-rmb')).toBeAttached();
    await expect(page.locator('#line-sat-sun-rmb')).toBeAttached();
    await expect(page.locator('#line-sat-moon-rmb')).toBeAttached();
  });
});

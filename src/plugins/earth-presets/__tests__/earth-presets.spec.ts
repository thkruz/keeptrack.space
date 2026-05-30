import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('EarthPresetsPlugin', () => {
  test('RMB menu elements are present in the DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { EarthPresetsPlugin: { enabled: true } },
    });

    // The RMB L1 menu item should be in the DOM (hidden until right-click on Earth)
    const rmbL1 = page.locator('#earth-rmb');

    await expect(rmbL1).toBeAttached();

    // The RMB L2 submenu container should be in the DOM
    const rmbL2 = page.locator('#earth-rmb-menu');

    await expect(rmbL2).toBeAttached();

    // All five preset menu items should exist
    const presetIds = [
      'earth-satellite-rmb',
      'earth-nadir-rmb',
      'earth-engineer-rmb',
      'earth-opscenter-rmb',
      'earth-90sGraphics-rmb',
    ];

    for (const id of presetIds) {
      // eslint-disable-next-line no-await-in-loop
      await expect(page.locator(`#${id}`)).toBeAttached();
    }

    // Plugin should have no bottom icon or drawer item (RMB-only plugin)
    const drawerItem = page.locator('.drawer-item[data-plugin-id="earth-rmb"]');

    await expect(drawerItem).not.toBeAttached();
  });
});

import { expect, test } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('PolarPlotPlugin', () => {
  test('disabled without sensor and satellite, DOM elements exist', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { PolarPlotPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // Legacy pattern: locale "Polar Plot" → slug "polar-plot" → "polar-plot-bottom-icon"
    const bottomIcon = page.locator('#polar-plot-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in Sensors group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-1"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="polar-plot-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking disabled drawer item should NOT open the side menu
    await drawerItem.click({ force: true });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 2_000 });

    // Verify side menu elements exist in DOM (hidden)
    await expect(page.locator('#polar-plot-menu')).toBeAttached();
    await expect(page.locator('#polar-plot')).toBeAttached(); // canvas element
    await expect(page.locator('#polar-plot-save')).toBeAttached(); // save button
    await expect(page.locator('#polar-plot-warning')).toBeAttached(); // warning text
  });
});

import { expect, test } from '@test/e2e/coverage';
import { drawerGroupOf, expectShook, waitForAppReady, watchForShake } from '@test/e2e/keeptrack-fixtures';

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
    const group = drawerGroupOf(page, 'polar-plot-bottom-icon');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="polar-plot-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking disabled drawer item should NOT open the side menu
    await watchForShake(drawerItem);
    // The row is aria-disabled, so Playwright would wait for it to be enabled; force skips that wait. The app keeps disabled rows clickable and shakes them
    await drawerItem.click({ force: true });
    // The shake proves the click reached the disabled-row handler
    await expectShook(drawerItem);
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 2_000 });

    // Verify side menu elements exist in DOM (hidden)
    await expect(page.locator('#polar-plot-menu')).toBeAttached();
    await expect(page.locator('#polar-plot')).toBeAttached(); // canvas element
    await expect(page.locator('#polar-plot-save')).toBeAttached(); // save button
    await expect(page.locator('#polar-plot-warning')).toBeAttached(); // warning text
  });
});

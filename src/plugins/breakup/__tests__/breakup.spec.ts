import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('Breakup Plugin', () => {
  test('icon is disabled without satellite, drawer item visible in CREATE group', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { Breakup: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#breakup-bottom-icon');
    const sideMenu = page.locator('#breakup-menu');

    // Bottom icon should exist in the DOM but be disabled (no satellite selected)
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Side menu HTML should exist in DOM but be hidden
    await expect(sideMenu).toBeAttached();
    await expect(sideMenu).toBeHidden();

    // Open drawer and find the Breakup item in the CREATE group
    await page.locator('#drawer-hamburger').click();

    // Expand the CREATE group if collapsed
    const createGroup = page.locator('.drawer-group[data-group-key="mode-3"]');
    const groupItems = createGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await createGroup.locator('.drawer-group-header').click();
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="breakup-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking a disabled plugin's drawer item should NOT open the side menu
    await drawerItem.click({ force: true });
    await expect(sideMenu).toBeHidden({ timeout: 2_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Verify form elements exist in the DOM even though menu is hidden
    await expect(page.locator('form#breakup')).toBeAttached();
    await expect(page.locator('#hc-scc')).toBeAttached();
    await expect(page.locator('#hc-startNum')).toBeAttached();
    await expect(page.locator('#hc-count')).toBeAttached();

    // v13 UI markup: marker class, delta-V dispersion controls, and the create/clear actions.
    await expect(sideMenu).toHaveClass(/kt-ui-v13/u);
    await expect(page.locator('#hc-dv-radial')).toBeAttached();
    await expect(page.locator('#hc-dv-intrack')).toBeAttached();
    await expect(page.locator('#hc-dv-crosstrack')).toBeAttached();
    await expect(page.locator('#breakup-create-btn')).toBeAttached();
    await expect(page.locator('#breakup-clear-btn')).toBeAttached();
  });
});

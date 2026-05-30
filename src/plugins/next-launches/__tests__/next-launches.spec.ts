import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('NextLaunchesPlugin', () => {
  test('open side menu, verify elements, and close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { NextLaunchesPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // 1. Verify bottom icon exists in DOM (hidden in #bottom-icons)
    const bottomIcon = page.locator('#menu-nextLaunch');

    await expect(bottomIcon).toBeAttached();

    // 2. Open drawer and find plugin item in Events group
    await page.locator('#drawer-hamburger').click();

    const group = page.locator('.drawer-group[data-group-key="mode-2"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-nextLaunch"]');

    await expect(drawerItem).toBeVisible();

    // 3. Click to activate plugin
    await drawerItem.click();

    // 4. Verify side menu opens
    const sideMenu = page.locator('#nextLaunch-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify heading
    await expect(sideMenu.locator('h5')).toBeVisible();

    // Verify toolbar buttons exist
    await expect(page.locator('#nextLaunch-fetch-btn')).toBeAttached();
    await expect(page.locator('#nextLaunch-refresh-btn')).toBeAttached();
    await expect(page.locator('#export-launch-info')).toBeAttached();

    // Verify empty table exists
    await expect(page.locator('#nextLaunch-table')).toBeAttached();

    // 5. Close via close button and verify icon deselected
    await page.locator('#nextLaunch-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

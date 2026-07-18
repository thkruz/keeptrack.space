import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('TheSpaceDevLaunchCalendarPlugin', () => {
  test('open side menu, verify elements, and close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { TheSpaceDevLaunchCalendarPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // 1. Verify bottom icon exists in DOM (hidden in #bottom-icons)
    const bottomIcon = page.locator('#menu-launch-calendar');

    await expect(bottomIcon).toBeAttached();

    // 2. Open drawer and find plugin item in Events group
    await page.locator('#drawer-hamburger').click();

    const group = page.locator('.drawer-group[data-group-key="mode-2"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-launch-calendar"]');

    await expect(drawerItem).toBeVisible();

    // 3. Click to activate plugin
    await drawerItem.click();

    // 4. Verify side menu opens
    const sideMenu = page.locator('#launch-calendar-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify heading
    await expect(sideMenu.locator('h5')).toBeVisible();

    // Verify toolbar buttons exist
    await expect(page.locator('#launch-calendar-fetch-btn')).toBeAttached();
    await expect(page.locator('#launch-calendar-refresh-btn')).toBeAttached();
    await expect(page.locator('#export-launch-info')).toBeAttached();

    // Verify empty table exists
    await expect(page.locator('#launch-calendar-table')).toBeAttached();

    // 5. Close via close button and verify icon deselected
    await page.locator('#launch-calendar-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

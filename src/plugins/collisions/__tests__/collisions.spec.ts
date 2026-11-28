import { expect, test } from '@test/e2e/coverage';
import { drawerGroupOf, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('Collisions Plugin', () => {
  test('open side menu, verify table and toolbar, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { Collisions: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#conjunction-feed-icon');
    const sideMenu = page.locator('#Collisions-menu');

    // Bottom icon should exist in the DOM
    await expect(bottomIcon).toBeAttached();

    // Open drawer and find the Collisions item in its drawer group
    await page.locator('#drawer-hamburger').click();

    // Expand its drawer group if collapsed
    const group = drawerGroupOf(page, 'conjunction-feed-icon');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="conjunction-feed-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click the drawer item - should open side menu and select the icon
    await drawerItem.click();
    await expect(sideMenu).toBeVisible({ timeout: 5_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify the toolbar buttons exist
    const fetchBtn = page.locator('#Collisions-fetch-btn');
    const refreshBtn = page.locator('#Collisions-refresh-btn');

    await expect(fetchBtn).toBeAttached();
    await expect(refreshBtn).toBeAttached();

    // Verify the collision results container exists. The OSS build renders a
    // #Collisions-table; the Pro build replaces it with a #Collisions-results card list.
    const results = page.locator('#Collisions-table, #Collisions-results');

    await expect(results).toBeAttached();

    // Close via DOM click (toast notifications may intercept Playwright clicks)
    await page.evaluate(() => {
      document.getElementById('Collisions-menu-close-btn')?.click();
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

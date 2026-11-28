import { expect, test } from '@test/e2e/coverage';
import { drawerGroupOf, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ReportsPlugin', () => {
  test('icon is enabled without satellite, drawer item opens the menu', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ReportsPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#reports-bottom-icon');
    const sideMenu = page.locator('#reports-menu');

    // Batch reports (search results, watchlist) need no selected object, so the icon is enabled without a satellite
    // (isRequireSatelliteSelected = false in reports.ts)
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Side menu HTML should exist in DOM but be hidden
    await expect(sideMenu).toBeAttached();
    await expect(sideMenu).toBeHidden();

    // Open drawer and find the Reports item in its drawer group
    await page.locator('#drawer-hamburger').click();

    const group = drawerGroupOf(page, 'reports-bottom-icon');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="reports-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking the drawer item opens the side menu even though no satellite is selected
    await drawerItem.scrollIntoViewIfNeeded();
    await drawerItem.click();
    await expect(sideMenu).toBeVisible({ timeout: 2_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify the v13 menu root carries the marker class
    await expect(sideMenu).toHaveClass(/kt-ui-v13/u);

    // Verify built-in report buttons are rendered as v13 action rows
    await expect(page.locator('#aer-report-btn')).toBeAttached();
    await expect(page.locator('#aer-report-btn')).toHaveClass(/kt-action/u);
    await expect(page.locator('#lla-report-btn')).toBeAttached();
    await expect(page.locator('#eci-report-btn')).toBeAttached();
    await expect(page.locator('#coes-report-btn')).toBeAttached();
    await expect(page.locator('#visibility-windows-report-btn')).toBeAttached();
    await expect(page.locator('#sun-eclipse-report-btn')).toBeAttached();
  });
});

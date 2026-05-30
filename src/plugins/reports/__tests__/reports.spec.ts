import { expect, test } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ReportsPlugin', () => {
  test('icon is disabled without satellite, drawer item visible in ANALYSIS group', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ReportsPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#reports-bottom-icon');
    const sideMenu = page.locator('#reports-menu');

    // Bottom icon should exist but be disabled (no satellite selected)
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Side menu HTML should exist in DOM but be hidden
    await expect(sideMenu).toBeAttached();
    await expect(sideMenu).toBeHidden();

    // Open drawer and find the Reports item in the ANALYSIS group
    await page.locator('#drawer-hamburger').click();

    const analysisGroup = page.locator('.drawer-group[data-group-key="mode-4"]');
    const groupItems = analysisGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await analysisGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="reports-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking a disabled plugin's drawer item should NOT open the side menu
    await drawerItem.scrollIntoViewIfNeeded();
    await drawerItem.click({ force: true });
    await expect(sideMenu).toBeHidden({ timeout: 2_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Verify report buttons container exists in the DOM
    await expect(page.locator('#reports-buttons')).toBeAttached();

    // Verify built-in report buttons are rendered
    await expect(page.locator('#aer-report-btn')).toBeAttached();
    await expect(page.locator('#lla-report-btn')).toBeAttached();
    await expect(page.locator('#eci-report-btn')).toBeAttached();
    await expect(page.locator('#coes-report-btn')).toBeAttached();
    await expect(page.locator('#visibility-windows-report-btn')).toBeAttached();
    await expect(page.locator('#sun-eclipse-report-btn')).toBeAttached();
  });
});

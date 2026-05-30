import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('CloseObjects Plugin', () => {
  test('open side menu, verify find button and pro results elements, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { CloseObjectsPlugin: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#close-objects-icon');
    const sideMenu = page.locator('#close-objects-menu');

    // Bottom icon should exist and NOT be disabled
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in the EVENTS group (mode-2)
    await page.locator('#drawer-hamburger').click();

    const eventsGroup = page.locator('.drawer-group[data-group-key="mode-2"]');
    const groupItems = eventsGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await eventsGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="close-objects-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify the find button exists
    await expect(page.locator('#co-find-btn')).toBeVisible();

    // Verify Pro secondary menu settings form elements
    await expect(page.locator('form#co-pro-settings-form')).toBeAttached();
    await expect(page.locator('#co-pro-radius')).toBeAttached();
    await expect(page.locator('#co-pro-radius')).toHaveValue('50');
    await expect(page.locator('#co-pro-alt-min')).toBeAttached();
    await expect(page.locator('#co-pro-alt-min')).toHaveValue('0');
    await expect(page.locator('#co-pro-alt-max')).toBeAttached();
    await expect(page.locator('#co-pro-alt-max')).toHaveValue('50000');

    // Verify Pro results table and count elements
    await expect(page.locator('#co-pro-results-table')).toBeAttached();
    await expect(page.locator('#co-pro-results-count')).toBeAttached();

    // Close via the side menu close button
    await page.locator('#close-objects-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

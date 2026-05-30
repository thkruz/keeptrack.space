import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ColorMenu Plugin', () => {
  test('open side menu, verify color scheme list, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ColorMenu: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-color-scheme');
    const sideMenu = page.locator('#color-scheme-menu');

    // Bottom icon should exist and NOT be disabled
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in the CATALOG group (mode-0)
    await page.locator('#drawer-hamburger').click();

    const catalogGroup = page.locator('.drawer-group[data-group-key="mode-0"]');
    const groupItems = catalogGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await catalogGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-color-scheme"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify color scheme list has items
    const colorsList = page.locator('#colors-menu');

    await expect(colorsList).toBeVisible();

    const colorItems = colorsList.locator('li.menu-selectable');
    const itemCount = await colorItems.count();

    expect(itemCount).toBeGreaterThan(3);

    // Each item should have a data-color attribute
    const firstItem = colorItems.first();

    await expect(firstItem).toHaveAttribute('data-color');

    // Close via the side menu close button
    await page.locator('#color-scheme-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

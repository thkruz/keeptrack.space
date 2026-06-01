import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('DopsPlugin', () => {
  test('open side menu via drawer, verify form and content, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { DopsPlugin: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-dops');

    // Bottom icon should exist in the DOM
    await expect(bottomIcon).toBeAttached();

    // Open drawer and find the DOPS item in the SENSORS group (mode-1)
    await page.locator('#drawer-hamburger').click();

    const sensorsGroup = page.locator('.drawer-group[data-group-key="mode-1"]');
    const groupItems = sensorsGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await sensorsGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-dops"]');

    await expect(drawerItem).toBeVisible();

    // Click to open — should show side menu and select icon
    await drawerItem.click();

    const sideMenu = page.locator('#dops-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify form exists with correct default values
    const form = page.locator('#dops-form');

    await expect(form).toBeAttached();

    await expect(page.locator('#dops-lat')).toHaveValue('41');
    await expect(page.locator('#dops-lon')).toHaveValue('-71');
    await expect(page.locator('#dops-alt')).toHaveValue('0');
    await expect(page.locator('#dops-el')).toHaveValue('15');

    // Verify submit button exists
    await expect(page.locator('#dops-submit')).toBeAttached();

    // Close via the side menu close button
    await page.locator('#dops-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

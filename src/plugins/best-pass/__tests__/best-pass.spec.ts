import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('BestPassPlugin', () => {
  test('icon disabled without sensor, drawer item visible, form elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { BestPassPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#best-pass-icon');
    const sideMenu = page.locator('#best-pass-menu');

    // Bottom icon should exist but be disabled (no sensor selected)
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Side menu HTML should exist in DOM but be hidden
    await expect(sideMenu).toBeAttached();
    await expect(sideMenu).toBeHidden();

    // Open drawer and find the BestPass item in the EVENTS group (mode-2)
    await page.locator('#drawer-hamburger').click();

    const eventsGroup = page.locator('.drawer-group[data-group-key="mode-2"]');
    const groupItems = eventsGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await eventsGroup.locator('.drawer-group-header').click();
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="best-pass-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking a disabled plugin's drawer item should NOT open the side menu
    await drawerItem.scrollIntoViewIfNeeded();
    await drawerItem.click({ force: true });
    await expect(sideMenu).toBeHidden({ timeout: 2_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Verify form elements exist in the DOM even though menu is hidden
    await expect(page.locator('form#best-pass-menu-form')).toBeAttached();
    await expect(page.locator('#bp-sats')).toBeAttached();
    await expect(page.locator('#bp-submit')).toBeAttached();

    // Verify default satellite numbers are pre-filled
    await expect(page.locator('#bp-sats')).toHaveValue('25544,00005');
  });
});

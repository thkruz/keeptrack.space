import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('BestPassPlugin', () => {
  test('icon pro-gated (login gate), drawer item visible, form elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { BestPassPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#best-pass-icon');
    const sideMenu = page.locator('#best-pass-menu');

    // In the Pro build best-pass is a login-gated plugin. With the login gate
    // active (default), the icon is marked pro-gated rather than sensor-disabled.
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-pro/u);

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

    // Clicking a login-gated plugin's drawer item should NOT open the side menu
    await drawerItem.scrollIntoViewIfNeeded();
    await drawerItem.click({ force: true });
    await expect(sideMenu).toBeHidden({ timeout: 2_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Verify form elements exist in the DOM even though the menu is hidden. The
    // Pro form uses chip pickers (sensor selector + satellite input) rather than
    // the OSS #bp-sats text field.
    await expect(page.locator('form#best-pass-menu-form')).toBeAttached();
    await expect(page.locator('#bp-sat-input')).toBeAttached();
    await expect(page.locator('#bp-submit')).toBeAttached();
  });
});

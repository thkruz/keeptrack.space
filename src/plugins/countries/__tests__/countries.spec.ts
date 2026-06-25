import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('CountriesMenu Plugin', () => {
  test('open side menu, verify country list structure, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { CountriesMenu: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-countries');
    const sideMenu = page.locator('#countries-menu');

    // Bottom icon should exist in the DOM
    await expect(bottomIcon).toBeAttached();

    // Open drawer and find the CountriesMenu item
    await page.locator('#drawer-hamburger').click();
    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-countries"]');

    await expect(drawerItem).toBeVisible();

    // Click the drawer item - should open side menu and select the icon
    await drawerItem.click();
    await expect(sideMenu).toBeVisible({ timeout: 5_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify the country list element exists
    const countryList = page.locator('#country-list');

    await expect(countryList).toBeAttached();

    // Verify the inner country-menu container is visible
    const countryMenu = page.locator('#country-menu');

    await expect(countryMenu).toBeVisible();

    // Close via the side menu close button
    await page.locator('#countries-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

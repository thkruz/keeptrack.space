import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SearchSettingsPlugin', () => {
  test('open side menu, verify settings inputs, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SearchSettingsPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#search-settings-bottom-icon');

    await expect(bottomIcon).toBeAttached();

    // Open drawer and find item in Settings group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-7"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="search-settings-bottom-icon"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(page.locator('#search-settings-menu')).toBeVisible({ timeout: 5_000 });

    await expect(page.locator('#search-settings-maxResults')).toBeAttached();
    await expect(page.locator('#search-settings-minSearchChars')).toBeAttached();
    await expect(page.locator('#search-settings-showDecayed')).toBeAttached();
    await expect(page.locator('#search-settings-showVimpel')).toBeAttached();
    await expect(page.locator('#search-settings-field-name')).toBeAttached();
    await expect(page.locator('#search-settings-reset')).toBeAttached();

    // v13 menu marker + card structure
    await expect(page.locator('#search-settings-menu.kt-ui-v13')).toBeAttached();
    await expect(page.locator('#search-settings-menu .kt-section').first()).toBeAttached();

    // Close
    await page.evaluate(() => {
      document.getElementById('search-settings-menu-close-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

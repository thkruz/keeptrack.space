import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('CustomSensorPlugin', () => {
  test('open side menu, verify form elements, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { CustomSensorPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#custom-sensor-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in Create group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-3"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="custom-sensor-bottom-icon"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });

    // Verify form elements
    await expect(page.locator('#custom-sensor-menu')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#cs-lat')).toBeAttached();
    await expect(page.locator('#cs-lon')).toBeAttached();
    await expect(page.locator('#cs-hei')).toBeAttached();
    await expect(page.locator('#cs-type')).toBeAttached();
    await expect(page.locator('#cs-submit')).toBeAttached();

    // Close
    await page.evaluate(() => {
      document.getElementById('custom-sensor-menu-close-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

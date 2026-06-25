import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatellitePhotos', () => {
  test('open side menu, verify photo links, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SatellitePhotos: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-sat-photo');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in Display group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-5"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-sat-photo"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(page.locator('#sat-photo-menu')).toBeVisible({ timeout: 5_000 });

    // Verify photo list content (v13 action rows for each fixed imagery source)
    await expect(page.locator('#sat-photo-geo-list')).toBeAttached();
    await expect(page.locator('#goes19-link')).toBeVisible();

    // Close
    await page.evaluate(() => {
      document.getElementById('sat-photo-menu-close-btn')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

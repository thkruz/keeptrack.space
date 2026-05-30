import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('VideoDirectorPlugin', () => {
  test('open side menu, verify form elements, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { VideoDirectorPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#video-director-icon');

    await expect(bottomIcon).toBeAttached();

    // Open drawer and find item in Experimental group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-5"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="video-director-icon"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(page.locator('#video-director-menu')).toBeVisible({ timeout: 5_000 });

    // Verify form elements
    await expect(page.locator('#video-director-form')).toBeAttached();
    await expect(page.locator('#video-director-rotateSpeed')).toBeAttached();

    // Close
    await page.evaluate(() => {
      document.getElementById('video-director-menu-close-btn')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

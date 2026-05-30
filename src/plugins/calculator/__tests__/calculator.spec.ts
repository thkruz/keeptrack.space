import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('Calculator', () => {
  test('open side menu, verify form elements, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { Calculator: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-calculator');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in Analysis group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-4"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-calculator"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(page.locator('#calculator-menu')).toBeVisible({ timeout: 5_000 });

    // Verify form elements
    await expect(page.locator('#calculator-form')).toBeAttached();
    await expect(page.locator('#calc-input-frame')).toBeAttached();
    await expect(page.locator('#calc-output-format')).toBeAttached();
    await expect(page.locator('#calc-convert-btn')).toBeAttached();

    // Close
    await page.evaluate(() => {
      document.getElementById('calculator-menu-close-btn')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

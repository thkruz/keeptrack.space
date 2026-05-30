import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('CreateSat Plugin', () => {
  test('open side menu, verify tabs and form fields, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { CreateSat: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#create-satellite-bottom-icon');

    // Bottom icon should exist and NOT be disabled
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find CreateSat item in the CREATE group
    await page.locator('#drawer-hamburger').click();

    const createGroup = page.locator('.drawer-group[data-group-key="mode-3"]');
    const groupItems = createGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await createGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="create-satellite-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();

    // Verify bottom icon got selected (confirms click reached the handler)
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });

    // Verify side menu content is visible (the inner .side-menu div)
    const sideMenuContent = page.locator('#createSat-content');

    await expect(sideMenuContent).toBeVisible({ timeout: 5_000 });

    // Verify both tabs exist
    await expect(page.locator('#createSat-basic-tab')).toBeAttached();
    await expect(page.locator('#createSat-advanced-tab')).toBeAttached();

    // Verify Basic tab form fields and defaults
    const basicScc = page.locator('#createSat-basic-scc');

    await expect(basicScc).toBeAttached();
    await expect(basicScc).toHaveValue('90000');

    const basicName = page.locator('#createSat-basic-name');

    await expect(basicName).toBeAttached();
    await expect(basicName).toHaveValue('New Satellite');

    await expect(page.locator('#createSat-basic-inc')).toBeAttached();
    await expect(page.locator('#createSat-basic-apogee')).toBeAttached();
    await expect(page.locator('#createSat-basic-perigee')).toBeAttached();
    await expect(page.locator('#createSat-basic-submit')).toBeAttached();

    // Verify Advanced tab form fields exist in DOM
    await expect(page.locator('#createSat-scc')).toBeAttached();
    await expect(page.locator('#createSat-inc')).toBeAttached();
    await expect(page.locator('#createSat-meanmo')).toBeAttached();
    await expect(page.locator('#createSat-ecen')).toBeAttached();
    await expect(page.locator('#createSat-rasc')).toBeAttached();
    await expect(page.locator('#createSat-argPe')).toBeAttached();
    await expect(page.locator('#createSat-meana')).toBeAttached();
    await expect(page.locator('#createSat-per')).toBeAttached();
    await expect(page.locator('#createSat-submit')).toBeAttached();
    await expect(page.locator('#createSat-save')).toBeAttached();

    // Verify Advanced tab defaults were populated
    await expect(page.locator('#createSat-meanmo')).toHaveValue('16.00000');
    await expect(page.locator('#createSat-name')).toHaveValue('New Satellite');
    await expect(page.locator('#createSat-src')).toHaveValue('User Created');

    // Verify derived parameter fields exist
    await expect(page.locator('#createSat-calc-apogee')).toBeAttached();
    await expect(page.locator('#createSat-calc-perigee')).toBeAttached();
    await expect(page.locator('#createSat-calc-sma')).toBeAttached();
    await expect(page.locator('#createSat-calc-velocity')).toBeAttached();

    // Close via the side menu close button
    await page.locator('#createSat-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

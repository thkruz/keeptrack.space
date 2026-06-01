import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('FindSatPlugin', () => {
  test('full user flow: open side menu, verify form fields, close', async ({ page }) => {
    // FindSat is login-gated in the manifest
    await waitForAppReady(page, {
      plugins: { FindSatPlugin: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    // 1. Bottom icon should exist and not be disabled
    const bottomIcon = page.locator('#find-satellite-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // 2. Open drawer and find plugin in Catalog group
    await page.locator('#drawer-hamburger').click();

    const group = page.locator('.drawer-group[data-group-key="mode-0"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="find-satellite-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // 3. Click to open the side menu
    await drawerItem.click();
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });

    const sideMenu = page.locator('#findByLooks-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // 4. Verify the form exists in DOM
    const form = page.locator('form#findByLooks-menu-form');

    await expect(form).toBeAttached();

    // 5. Verify dropdown selects exist
    await expect(page.locator('#fbl-type')).toBeAttached();
    await expect(page.locator('#fbl-country')).toBeAttached();
    await expect(page.locator('#fbl-bus')).toBeAttached();
    await expect(page.locator('#fbl-payload')).toBeAttached();
    await expect(page.locator('#fbl-shape')).toBeAttached();
    await expect(page.locator('#fbl-source')).toBeAttached();

    // 6. Verify ground-based viewing parameter inputs
    await expect(page.locator('#fbl-azimuth')).toBeAttached();
    await expect(page.locator('#fbl-azimuth-margin')).toBeAttached();
    await expect(page.locator('#fbl-elevation')).toBeAttached();
    await expect(page.locator('#fbl-elevation-margin')).toBeAttached();
    await expect(page.locator('#fbl-range')).toBeAttached();
    await expect(page.locator('#fbl-range-margin')).toBeAttached();

    // 7. Verify orbital parameter inputs with default margin values
    await expect(page.locator('#fbl-inc')).toBeAttached();
    await expect(page.locator('#fbl-inc-margin')).toHaveValue('0.5');
    await expect(page.locator('#fbl-period')).toBeAttached();
    await expect(page.locator('#fbl-period-margin')).toHaveValue('10');
    await expect(page.locator('#fbl-tleAge')).toBeAttached();
    await expect(page.locator('#fbl-tleAge-margin')).toHaveValue('1');
    await expect(page.locator('#fbl-rcs')).toBeAttached();
    await expect(page.locator('#fbl-rcs-margin')).toHaveValue('10');
    await expect(page.locator('#fbl-raan')).toBeAttached();
    await expect(page.locator('#fbl-raan-margin')).toHaveValue('0.5');
    await expect(page.locator('#fbl-argPe')).toBeAttached();
    await expect(page.locator('#fbl-argPe-margin')).toHaveValue('0.5');

    // 8. Verify action buttons
    await expect(page.locator('#findByLooks-submit')).toBeAttached();
    await expect(page.locator('#findByLooks-export')).toBeAttached();

    // 9. Close the side menu
    await page.locator('#findByLooks-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

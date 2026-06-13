import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('CatalogManagement Plugin', () => {
  test('open side menu, verify tabs and form fields, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { CatalogManagementPlugin: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#catalog-management-icon');
    const sideMenu = page.locator('#catalog-management-menu');

    // Bottom icon should exist and NOT be disabled
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in the TOOLS group (mode-6)
    await page.locator('#drawer-hamburger').click();

    const toolsGroup = page.locator('.drawer-group[data-group-key="mode-6"]');
    const groupItems = toolsGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await toolsGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="catalog-management-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify both tabs exist
    await expect(page.locator('#catalog-mgmt-import-tab')).toBeAttached();
    await expect(page.locator('#catalog-mgmt-export-tab')).toBeAttached();

    // Verify Import tab elements
    await expect(page.locator('#cm-keep-sat-info')).toBeAttached();
    await expect(page.locator('#cm-import-file')).toBeAttached();
    await expect(page.locator('#cm-import-btn')).toBeAttached();
    await expect(page.locator('#cm-dropzone')).toBeAttached();

    // Verify Export tab elements - Orbital Elements (TLE source/format dropdowns)
    await expect(page.locator('#de-tle-source')).toBeAttached();
    await expect(page.locator('#de-tle-format')).toBeAttached();
    await expect(page.locator('#de-export-tle')).toBeAttached();
    // Tabular & STK
    await expect(page.locator('#de-export-csv')).toBeAttached();
    await expect(page.locator('#de-export-tce')).toBeAttached();
    await expect(page.locator('#de-export-fov')).toBeAttached();

    // Verify Ephemeris form and defaults
    await expect(page.locator('form#de-ephemeris-form')).toBeAttached();
    await expect(page.locator('#de-ephem-span')).toHaveValue('24');
    await expect(page.locator('#de-ephem-step')).toHaveValue('60');

    // Ephemeris export button should be disabled (no satellite selected)
    const ephemBtn = page.locator('#de-export-ephem');

    await expect(ephemBtn).toBeAttached();
    await expect(ephemBtn).toBeDisabled();

    // Verify Pro CCSDS buttons exist (dev server runs Pro build)
    await expect(page.locator('#de-export-opm')).toBeAttached();
    await expect(page.locator('#de-export-oem')).toBeAttached();
    await expect(page.locator('#de-export-omm')).toBeAttached();
    await expect(page.locator('#de-export-omm-catalog')).toBeAttached();

    // Close via the side menu close button
    await page.locator('#catalog-management-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

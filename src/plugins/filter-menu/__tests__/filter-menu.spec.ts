import { expect, test } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('FilterMenuPlugin', () => {
  test('full user flow: open, verify filters, toggle, reset, close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { FilterMenuPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // 1. Bottom icon should exist and not be disabled
    const bottomIcon = page.locator('#filter-menu-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // 2. Open drawer and find plugin in Settings group
    await page.locator('#drawer-hamburger').click();

    const group = page.locator('.drawer-group[data-group-key="mode-7"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="filter-menu-icon"]');

    await expect(drawerItem).toBeVisible();

    // 3. Click to open the side menu
    await drawerItem.click();
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });

    const sideMenu = page.locator('#filter-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // 4. Verify the filter form exists
    const filterForm = page.locator('form#filter-form');

    await expect(filterForm).toBeVisible();

    // 5. Verify reset button exists
    const resetButton = page.locator('#filter-reset');

    await expect(resetButton).toBeVisible();

    // 6. Verify key filter checkboxes exist and are checked by default
    const operationalPayloads = page.locator('#filter-operationalPayloads');

    await expect(operationalPayloads).toBeAttached();
    await expect(operationalPayloads).toBeChecked();

    const debris = page.locator('#filter-debris');

    await expect(debris).toBeAttached();
    await expect(debris).toBeChecked();

    const rocketBodies = page.locator('#filter-rocketBodies');

    await expect(rocketBodies).toBeAttached();
    await expect(rocketBodies).toBeChecked();

    // 7. Verify orbital regime filters exist
    await expect(page.locator('#filter-lEOSatellites')).toBeAttached();
    await expect(page.locator('#filter-mEOSatellites')).toBeAttached();
    await expect(page.locator('#filter-gEOSatellites')).toBeAttached();
    await expect(page.locator('#filter-hEOSatellites')).toBeAttached();

    // 8. Verify country filters exist
    await expect(page.locator('#filter-unitedStates')).toBeAttached();
    await expect(page.locator('#filter-russia')).toBeAttached();
    await expect(page.locator('#filter-china')).toBeAttached();

    // 9. Toggle a filter off using the Materialize lever
    const debrisLever = page.locator('label:has(#filter-debris) .lever');

    await debrisLever.click();
    await expect(debris).not.toBeChecked({ timeout: 3_000 });

    // 10. Click reset to restore defaults
    await resetButton.click();
    await expect(debris).toBeChecked({ timeout: 3_000 });

    // 11. Close the side menu
    await page.locator('#filter-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

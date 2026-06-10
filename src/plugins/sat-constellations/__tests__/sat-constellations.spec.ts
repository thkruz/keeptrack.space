import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatConstellations Plugin', () => {
  test('open side menu via drawer, verify constellation list and secondary menu, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SatConstellations: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-constellations');
    const sideMenu = page.locator('#constellations-menu');

    // Bottom icon should exist in the DOM
    await expect(bottomIcon).toBeAttached();

    // Side menu HTML should exist in DOM but be hidden
    await expect(sideMenu).toBeAttached();
    await expect(sideMenu).toBeHidden();

    // Open drawer and find the Constellations item in the CATALOG group
    await page.locator('#drawer-hamburger').click();

    const catalogGroup = page.locator('.drawer-group[data-group-key="mode-0"]');
    const groupItems = catalogGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await catalogGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-constellations"]');

    await expect(drawerItem).toBeVisible();

    // Click the drawer item - should open side menu
    await drawerItem.click();
    await expect(sideMenu).toBeVisible({ timeout: 5_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify constellation list exists with all built-in items
    const constellationList = page.locator('#sc-constellation-list');

    await expect(constellationList).toBeAttached();

    const listItems = constellationList.locator('li.menu-selectable');
    const itemCount = await listItems.count();

    expect(itemCount).toBeGreaterThanOrEqual(13); // 13 built-in constellations

    // Verify specific built-in constellations
    await expect(constellationList.locator('li[data-group="SpaceStations"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="AmateurRadio"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="GPSGroup"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="GalileoGroup"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="GlonassGroup"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="iridium"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="orbcomm"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="globalstar"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="ses"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="aehf"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="wgs"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="starlink"]')).toBeAttached();
    await expect(constellationList.locator('li[data-group="sbirs"]')).toBeAttached();

    // Verify stats panel exists (initially hidden)
    await expect(page.locator('#sc-stats')).toBeAttached();
    await expect(page.locator('#sc-stat-count')).toBeAttached();
    await expect(page.locator('#sc-stat-alt')).toBeAttached();
    await expect(page.locator('#sc-stat-inc')).toBeAttached();

    // Verify results table exists (initially hidden)
    await expect(page.locator('#sc-table-wrapper')).toBeAttached();
    await expect(page.locator('#sc-results-table')).toBeAttached();
    await expect(page.locator('#sc-results-count')).toBeAttached();

    // Verify secondary menu (filter form) elements exist
    await expect(page.locator('#constellations-menu-secondary')).toBeAttached();
    await expect(page.locator('#sc-filter-inc-min')).toBeAttached();
    await expect(page.locator('#sc-filter-inc-max')).toBeAttached();
    await expect(page.locator('#sc-filter-alt-min')).toBeAttached();
    await expect(page.locator('#sc-filter-alt-max')).toBeAttached();
    await expect(page.locator('#sc-filter-raan-min')).toBeAttached();
    await expect(page.locator('#sc-filter-raan-max')).toBeAttached();
    await expect(page.locator('#sc-filter-name')).toBeAttached();
    await expect(page.locator('#sc-filter-apply')).toBeAttached();
    await expect(page.locator('#sc-filter-reset')).toBeAttached();

    // Close via the side menu close button
    await page.locator('#constellations-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

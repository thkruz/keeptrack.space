import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('PlanetsMenuPlugin', () => {
  test('open side menu, verify planet lists and sections, close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { PlanetsMenuPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // Bottom icon should exist in DOM
    const bottomIcon = page.locator('#menu-planets');

    await expect(bottomIcon).toBeAttached();

    // Open drawer and find item in Display group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-5"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-planets"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();

    const sideMenu = page.locator('#planets-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify the v13 section labels of the Sun-outward tour (exact text avoids matching the title)
    for (const label of [/^Star$/u, /^Terrestrial Planets$/u, /^Asteroid Belt$/u, /^Gas Giants$/u, /^Ice Giants$/u, /^Trans-Neptunian Objects$/u]) {
      await expect(sideMenu.locator('.kt-section-label', { hasText: label })).toBeAttached();
    }

    // Filter field narrows the list to matching bodies
    const filter = sideMenu.locator('#planets-filter-input');

    await expect(filter).toBeVisible();
    await filter.fill('mars');
    await expect(sideMenu.locator('[data-planet="Mars"]')).toBeVisible();
    await expect(sideMenu.locator('[data-planet="Venus"]')).toBeHidden();
    await filter.fill('');
    await expect(sideMenu.locator('[data-planet="Venus"]')).toBeVisible();

    // Verify some planet items exist with data-planet attributes
    await expect(sideMenu.locator('[data-planet="Mercury"]')).toBeAttached();
    await expect(sideMenu.locator('[data-planet="Venus"]')).toBeAttached();
    await expect(sideMenu.locator('[data-planet="Jupiter"]')).toBeAttached();
    await expect(sideMenu.locator('[data-planet="Saturn"]')).toBeAttached();

    // Verify dwarf planets
    await expect(sideMenu.locator('[data-planet="Pluto"]')).toBeAttached();
    await expect(sideMenu.locator('[data-planet="Ceres"]')).toBeAttached();

    // Verify other celestial bodies
    await expect(sideMenu.locator('[data-planet="Moon"]')).toBeAttached();
    await expect(sideMenu.locator('[data-planet="Sun"]')).toBeAttached();

    // Every listed body is implemented (PLANNED_BODIES in planets-bodies.ts is empty), so no row
    // renders as a disabled "planned" entry. Raise this when a planned body is added again.
    await expect(sideMenu.locator('.planets-menu-disabled')).toHaveCount(0);

    // The planets RMB entry was removed (redundant with side menu, 'P' key, palette)
    await expect(page.locator('#planets-rmb')).not.toBeAttached();
    await expect(page.locator('#planets-rmb-menu')).not.toBeAttached();

    // Close side menu via close button
    await page.locator('#planets-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

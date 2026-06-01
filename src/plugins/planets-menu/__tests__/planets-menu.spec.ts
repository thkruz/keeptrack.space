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

    // Verify section headers (use exact text to avoid matching title or partial matches)
    await expect(sideMenu.locator('h5.side-menu-row-header', { hasText: /^Planets$/u })).toBeAttached();
    await expect(sideMenu.locator('h5.side-menu-row-header', { hasText: /^Dwarf Planets$/u })).toBeAttached();
    await expect(sideMenu.locator('h5.side-menu-row-header', { hasText: /^Other Celestial Bodies$/u })).toBeAttached();

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

    // Verify disabled moons are present
    const disabledMoons = sideMenu.locator('.planets-menu-disabled');

    expect(await disabledMoons.count()).toBeGreaterThan(0);

    // Verify RMB context menu elements are in DOM
    await expect(page.locator('#planets-rmb')).toBeAttached();
    await expect(page.locator('#planets-rmb-menu')).toBeAttached();

    // Close side menu via close button
    await page.locator('#planets-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

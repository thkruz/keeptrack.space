import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('MissileSimulatorPlugin', () => {
  test('open side menu via drawer, verify form elements, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { MissileSimulatorPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // Composition-based: elementName is 'MissileSimulatorPlugin-bottom-icon'
    const bottomIcon = page.locator('#MissileSimulatorPlugin-bottom-icon');

    await expect(bottomIcon).toBeAttached();

    // Open drawer and find item in Create group (mode-3)
    await page.locator('#drawer-hamburger').click();

    const createGroup = page.locator('.drawer-group[data-group-key="mode-3"]');
    const groupItems = createGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await createGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="MissileSimulatorPlugin-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();

    const sideMenu = page.locator('#MissileSimulatorPlugin-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify form exists (inside draggable wrapper, use toBeAttached)
    await expect(page.locator('#MissileSimulatorPlugin-menu-form')).toBeAttached();

    // Verify attack type select
    const typeSelect = page.locator('#ms-type');

    await expect(typeSelect).toBeAttached();

    // Verify custom options container and its select fields
    await expect(page.locator('#ms-custom-opt')).toBeAttached();
    await expect(page.locator('#ms-attacker')).toBeAttached();
    await expect(page.locator('#ms-target')).toBeAttached();

    // Verify custom coordinate inputs
    await expect(page.locator('#ms-lat-lau')).toBeAttached();
    await expect(page.locator('#ms-lon-lau')).toBeAttached();
    await expect(page.locator('#ms-lat')).toBeAttached();
    await expect(page.locator('#ms-lon')).toBeAttached();

    // Verify warhead (MIRV) count input
    await expect(page.locator('#ms-warheads')).toBeAttached();

    // Verify the action rows
    await expect(page.locator('#searchRvBtn')).toBeAttached();
    await expect(page.locator('#clearMissilesBtn')).toBeAttached();

    // Close via close button
    await page.locator('#MissileSimulatorPlugin-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

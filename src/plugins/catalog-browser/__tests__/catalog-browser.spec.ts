import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('CatalogBrowserPlugin', () => {
  test('open side menu, verify catalog list and toggle, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { CatalogBrowserPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-catalog-browser');
    const sideMenu = page.locator('#catalog-browser-menu');

    // Bottom icon should exist in the DOM
    await expect(bottomIcon).toBeAttached();

    // Open drawer and find the CatalogBrowser item
    await page.locator('#drawer-hamburger').click();
    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-catalog-browser"]');

    await expect(drawerItem).toBeVisible();

    // Click the drawer item — should open side menu and select the icon
    await drawerItem.click();
    await expect(sideMenu).toBeVisible({ timeout: 5_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify the toggle switch exists
    const toggle = page.locator('#cb-orbital-data-only');

    await expect(toggle).toBeAttached();

    // Verify the mode description starts with "All Data" description
    const modeDesc = page.locator('#cb-mode-description');

    await expect(modeDesc).toBeVisible();

    // Toggle "Orbital Data Only" via the Materialize lever and verify description text changes
    const textBefore = await modeDesc.textContent();
    const lever = page.locator('label[for="cb-orbital-data-only"] .lever');

    await lever.click();
    const textAfter = await modeDesc.textContent();

    expect(textAfter).not.toBe(textBefore);

    // Verify catalog list is rendered with categories and items
    const catalogList = page.locator('#cb-catalog-list');

    await expect(catalogList).toBeVisible();

    // Should have category headers (KeepTrack + 7 CelesTrack categories)
    const categoryHeaders = catalogList.locator('.cb-category-header');

    await expect(categoryHeaders).toHaveCount(8); // keeptrack, special, debris, weather, comms, nav, science, military

    // Should have catalog items rendered
    const catalogItems = catalogList.locator('.cb-catalog-item');
    const itemCount = await catalogItems.count();

    expect(itemCount).toBeGreaterThan(10);

    // Verify KeepTrack catalog items at the top
    await expect(catalogList.locator('.cb-catalog-item[data-id="default"]')).toBeAttached();
    await expect(catalogList.locator('.cb-catalog-item[data-id="celestrak-only"]')).toBeAttached();
    await expect(catalogList.locator('.cb-catalog-item[data-id="vimpel-only"]')).toBeAttached();

    // Verify a few CelesTrack items exist
    await expect(catalogList.locator('.cb-catalog-item[data-id="starlink"]')).toBeAttached();
    await expect(catalogList.locator('.cb-catalog-item[data-id="stations"]')).toBeAttached();

    // Verify GP / SupGP chips are present
    await expect(catalogList.locator('.cb-chip-gp').first()).toBeAttached();
    await expect(catalogList.locator('.cb-chip-supgp').first()).toBeAttached();

    // Close via the side menu close button
    await page.locator('#catalog-browser-menu-close-btn').click();
    // slideOutLeft animates translateX(-100%) but keeps display:block,
    // so check the icon deselects and the menu slides off-screen
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ProximityOps', () => {
  test('open side menu, verify form elements and secondary menu, close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ProximityOps: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // Legacy pattern: locale "Rendezvous and Proximity Operations"
    // Slug: "rendezvous-and proximity operations" (replace only first space)
    // Element name: "rendezvous-and proximity operations-bottom-icon"
    const bottomIcon = page.locator('[id="rendezvous-and proximity operations-bottom-icon"]');

    await expect(bottomIcon).toBeAttached();

    // Open drawer and find item in Events group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-2"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="rendezvous-and proximity operations-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();

    const sideMenu = page.locator('#proximityOps-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify form elements exist
    await expect(page.locator('#proximityOps-menu-form')).toBeAttached();
    await expect(page.locator('#proximity-ops-norad')).toBeAttached();
    await expect(page.locator('#proximity-ops-maxDis')).toBeAttached();
    await expect(page.locator('#proximity-ops-maxVel')).toBeAttached();
    await expect(page.locator('#proximity-ops-duration')).toBeAttached();
    await expect(page.locator('#proximity-ops-type')).toBeAttached();
    await expect(page.locator('#proximity-ops-submit')).toBeAttached();

    // Verify default values
    expect(await page.locator('#proximity-ops-norad').inputValue()).toBe('0');
    expect(await page.locator('#proximity-ops-maxDis').inputValue()).toBe('100');
    expect(await page.locator('#proximity-ops-maxVel').inputValue()).toBe('0.1');
    expect(await page.locator('#proximity-ops-duration').inputValue()).toBe('24');

    // 9-digit NORAD ID support: maxlength must allow CelesTrak supplemental IDs.
    await expect(page.locator('#proximity-ops-norad')).toHaveAttribute('maxlength', '9');
    await page.locator('#proximity-ops-norad').fill('799500766');
    expect(await page.locator('#proximity-ops-norad').inputValue()).toBe('799500766');

    // Verify toggle switches exist
    await expect(page.locator('#proximity-ops-ava')).toBeAttached();
    await expect(page.locator('#proximity-ops-payload-only')).toBeAttached();
    await expect(page.locator('#proximity-ops-no-vimpel')).toBeAttached();

    // Verify secondary menu (results table) exists in DOM
    await expect(page.locator('#proximity-ops-table')).toBeAttached();

    // Close side menu
    await page.locator('#proximityOps-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

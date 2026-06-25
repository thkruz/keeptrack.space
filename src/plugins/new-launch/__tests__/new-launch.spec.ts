import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('NewLaunch', () => {
  test('open pro side menu, verify form elements, and close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { NewLaunch: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    // 1. Verify bottom icon exists (legacy pattern: "New Launch" → "new-launch-bottom-icon")
    const bottomIcon = page.locator('#new-launch-bottom-icon');

    await expect(bottomIcon).toBeAttached();

    // 2. Open drawer and find plugin item in Create group
    await page.locator('#drawer-hamburger').click();

    const group = page.locator('.drawer-group[data-group-key="mode-3"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="new-launch-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // 3. Click to activate - Pro version doesn't require satellite selected
    await drawerItem.click();

    // 4. Verify side menu opens
    const sideMenu = page.locator('#newLaunch-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });

    // Verify Pro-specific elements (mode tab selector, custom orbit fields)
    // Use toBeAttached for inner form elements of draggable side menu
    await expect(page.locator('#nlp-mode-tabs')).toBeAttached();
    await expect(page.locator('#nlp-selected-section')).toBeAttached();
    await expect(page.locator('#nlp-scc-section')).toBeAttached();
    await expect(page.locator('#nlp-custom-section')).toBeAttached();

    // Verify shared launch options
    await expect(page.locator('#nl-updown')).toBeAttached();
    await expect(page.locator('#nl-facility')).toBeAttached();
    await expect(page.locator('#nlp-obj-name')).toBeAttached();
    await expect(page.locator('#nlp-norad-id')).toBeAttached();
    await expect(page.locator('#nlp-orbit-duration')).toBeAttached();

    // Verify submit button
    await expect(page.locator('#newLaunch-menu-submit')).toBeAttached();

    // 5. Close via close button and verify icon deselected
    await page.locator('#newLaunch-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

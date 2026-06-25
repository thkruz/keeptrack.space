import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SettingsMenuPlugin', () => {
  test('open side menu, verify settings form, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SettingsMenuPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#settings-menu-icon');

    await expect(bottomIcon).toBeAttached();

    // Open drawer and find item in Settings group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-7"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="settings-menu-icon"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(page.locator('#settings-menu')).toBeVisible({ timeout: 5_000 });

    // Verify settings form elements
    await expect(page.locator('#settings-form')).toBeAttached();
    await expect(page.locator('#settings-filter')).toBeAttached();
    await expect(page.locator('#settings-reset')).toBeAttached();
    // Settings now apply immediately, so there is no submit button.
    await expect(page.locator('#settings-submit')).toHaveCount(0);

    // ── Behavior: toggle applies instantly, then reset restores defaults ──

    // Toggle a checkbox. The Materialize input is positioned off-viewport, so dispatch the
    // click directly - it still toggles the box and fires the change the control listens for.
    await page.locator('#setting-general-enableDemoMode').dispatchEvent('click');

    // Immediate-apply: the change reaches settingsManager without any submit step.
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { settingsManager?: { isDemoModeOn?: boolean } }).settingsManager?.isDemoModeOn), { timeout: 5_000 })
      .toBe(true);

    // Reset to defaults deterministically clears demo mode and trailing orbits.
    // The reset row sits at the bottom-center, under the fixed drawer-utility-footer
    // pill, so dispatch the click directly to avoid the overlay intercepting it.
    await page.locator('#settings-reset').dispatchEvent('click');
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { settingsManager?: { isDemoModeOn?: boolean } }).settingsManager?.isDemoModeOn), { timeout: 5_000 })
      .toBe(false);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { settingsManager?: { isDrawTrailingOrbits?: boolean } }).settingsManager?.isDrawTrailingOrbits))
      .toBe(false);

    // Close
    await page.evaluate(() => {
      document.getElementById('settings-menu-close-btn')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

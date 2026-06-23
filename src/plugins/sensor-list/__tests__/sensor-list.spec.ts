import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SensorListPlugin', () => {
  test('open side menu with sensor list, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SensorListPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#sensors-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in Sensors group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-1"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="sensors-bottom-icon"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(page.locator('#sensor-list-menu')).toBeVisible({ timeout: 5_000 });

    // ── Behavior: select a sensor (exercises the sensor-list click delegation + setSensor) ──
    const firstSensor = page.locator('#sensor-list-content .menu-selectable[data-sensor]').first();

    await expect(firstSensor).toBeVisible();
    await firstSensor.click();

    // Selecting a sensor enables the otherwise-disabled Reset Sensor button.
    await expect(page.locator('#reset-sensor-button')).toBeEnabled({ timeout: 5_000 });

    // Close
    await page.evaluate(() => {
      document.getElementById('sensor-list-menu-close-btn')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

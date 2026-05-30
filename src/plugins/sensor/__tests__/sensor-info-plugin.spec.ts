import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SensorInfoPlugin', () => {
  test('icon disabled without sensor, side menu elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SensorInfoPlugin: { enabled: true } },
    });

    // Sensor info requires a sensor - icon should be disabled
    const bottomIcon = page.locator('#sensor-info-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Side menu elements should exist in DOM
    await expect(page.locator('#sensor-info-menu')).toBeAttached();
  });
});

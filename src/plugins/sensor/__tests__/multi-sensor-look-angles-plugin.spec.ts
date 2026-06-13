import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('MultiSensorLookAnglesPlugin', () => {
  test('icon disabled without satellite selected', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { MultiSensorLookAnglesPlugin: { enabled: true } },
    });

    const bottomIcon = page.locator('#multi-sensor-looks-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    await expect(page.locator('#multi-sensor-look-angles-menu')).toBeAttached();
  });
});

import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('StereoMap', () => {
  test('icon disabled without satellite selected, menu elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { StereoMap: { enabled: true } },
    });

    // StereoMap requires satellite selection
    const bottomIcon = page.locator('#stereo-map-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Side menu and canvas should exist in DOM
    await expect(page.locator('#map-menu')).toBeAttached();
  });
});

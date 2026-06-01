import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatelliteFov', () => {
  test('icon disabled without satellite selected, form elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SatelliteFov: { enabled: true } },
      settings: { isDisableLoginGate: true },
    });

    // SatelliteFov sets isRequireSatelliteSelected + isIconDisabledOnLoad, so the
    // icon is disabled on load until a satellite is selected.
    const bottomIcon = page.locator('#satellite-fov-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Side menu form elements should be in DOM
    await expect(page.locator('#satellite-fov-menu')).toBeAttached();
  });
});

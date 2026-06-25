import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('EarthCenteredView Plugin', () => {
  test('utility icon reflects camera state and activates on click', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { EarthCenteredView: { enabled: true } },
    });

    // Utility icon should be visible in the drawer utility footer
    const utilityIcon = page.locator('#EarthCenteredView-utility-icon');

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveAttribute('data-plugin-id', 'earth-centered-bottom-icon');

    // Default camera is FIXED_TO_EARTH - icon syncs with camera state on every
    // update loop, so it should already be selected
    await expect(utilityIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });

    // Click the icon - should remain in earth-centered mode (re-activates)
    await utilityIcon.click({ force: true });

    // Icon should still be selected after clicking
    await expect(utilityIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

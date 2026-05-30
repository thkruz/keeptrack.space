import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatelliteViewPlugin', () => {
  test('utility icon disabled without satellite selected', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SatelliteViewPlugin: { enabled: true } },
    });

    const utilityIcon = page.locator('#SatelliteViewPlugin-utility-icon');

    await expect(utilityIcon).toBeAttached();
    await expect(utilityIcon).toHaveClass(/bmenu-item-disabled/u);

    await utilityIcon.click({ force: true });
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 2_000 });
  });
});

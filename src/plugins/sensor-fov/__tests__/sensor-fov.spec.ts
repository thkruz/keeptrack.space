import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SensorFov', () => {
  test('utility icon disabled without sensor', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SensorFov: { enabled: true } },
    });

    const utilityIcon = page.locator('#SensorFov-utility-icon');

    await expect(utilityIcon).toBeAttached();
    await expect(utilityIcon).toHaveClass(/bmenu-item-disabled/u);

    // Clicking a disabled utility icon should have no effect
    await utilityIcon.click({ force: true });
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 2_000 });
  });
});

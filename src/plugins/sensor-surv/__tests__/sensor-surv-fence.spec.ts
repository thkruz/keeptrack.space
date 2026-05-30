import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SensorSurvFence', () => {
  test('utility icon disabled without sensor', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SensorSurvFence: { enabled: true } },
    });

    const utilityIcon = page.locator('#SensorSurvFence-utility-icon');

    await expect(utilityIcon).toBeAttached();
    await expect(utilityIcon).toHaveClass(/bmenu-item-disabled/u);

    await utilityIcon.click({ force: true });
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 2_000 });
  });
});

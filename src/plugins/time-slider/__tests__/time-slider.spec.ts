import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('TimeSlider', () => {
  test('slider container renders in nav area', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        TopMenu: { enabled: true },
        TimeSlider: { enabled: true },
      },
    });

    await expect(page.locator('#time-slider-container')).toBeAttached({ timeout: 5_000 });
    await expect(page.locator('#time-slider-container-slider')).toBeAttached();
  });
});

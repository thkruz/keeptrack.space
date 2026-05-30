import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SensorTimeline', () => {
  test('icon disabled without satellite selected, canvas elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SensorTimeline: { enabled: true } },
    });

    const bottomIcon = page.locator('#sensor-timeline-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    await expect(page.locator('#sensor-timeline-menu')).toBeAttached();
    await expect(page.locator('#sensor-timeline-canvas')).toBeAttached();
  });
});

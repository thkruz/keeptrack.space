import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatelliteTimeline', () => {
  test('icon disabled without satellite and sensor, canvas elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SatelliteTimeline: { enabled: true } },
    });

    const bottomIcon = page.locator('#satellite-timeline-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Canvas elements should exist in DOM
    await expect(page.locator('#satellite-timeline-menu')).toBeAttached();
    await expect(page.locator('#satellite-timeline-canvas')).toBeAttached();
  });
});

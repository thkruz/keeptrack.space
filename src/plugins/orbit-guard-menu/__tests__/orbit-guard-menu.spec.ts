import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('OrbitGuardMenuPlugin', () => {
  test('loads without errors when enabled', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(err.message));

    await waitForAppReady(page, {
      plugins: { OrbitGuardMenuPlugin: { enabled: true } },
    });

    // Verify side menu elements exist in DOM
    await expect(page.locator('#maneuver-detection-menu')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('#maneuver-detection-table')).toBeAttached();

    const fatalErrors = errors.filter((e) => (/orbit.?guard|maneuver/iu).test(e));

    expect(fatalErrors).toHaveLength(0);
  });
});

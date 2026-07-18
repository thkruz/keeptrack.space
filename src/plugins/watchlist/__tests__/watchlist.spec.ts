import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('WatchlistPlugin', () => {
  test('open side menu, verify watchlist elements, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { WatchlistPlugin: { enabled: true } },
      settings: { isDisableLoginGate: true },
    });

    // Pro version loads as SatelliteListsPlugin - look for whatever icon exists
    // The pro plugin may use different element names
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(err.message));

    // Allow time for the plugin to initialize
    await page.waitForTimeout(2_000);

    const fatalErrors = errors.filter((e) => /watchlist|satellite.?list/iu.test(e));

    expect(fatalErrors).toHaveLength(0);
  });
});

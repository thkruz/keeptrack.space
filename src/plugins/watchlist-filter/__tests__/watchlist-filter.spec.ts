import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('WatchlistFilterPlugin', () => {
  test('icon disabled without watchlist items', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        WatchlistPlugin: { enabled: true },
        WatchlistFilterPlugin: { enabled: true },
      },
      settings: { isDisableLoginGate: true },
    });

    // WatchlistFilter is UTILITY_ONLY - in drawer mode, the utility icon
    // gets id="${pluginId}-utility-icon" from the PluginDrawer.
    const utilityIcon = page.locator('#WatchlistFilterPlugin-utility-icon');

    await expect(utilityIcon).toBeAttached();
    await expect(utilityIcon).toHaveClass(/bmenu-item-disabled/u);
  });
});

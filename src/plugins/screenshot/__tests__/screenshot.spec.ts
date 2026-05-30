import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('Screenshot', () => {
  test('right-click menu elements exist in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { Screenshot: { enabled: true } },
    });

    // Screenshot has RMB menu items for different resolutions
    await expect(page.locator('#save-rmb')).toBeAttached();
    await expect(page.locator('#save-hd-rmb')).toBeAttached();
    await expect(page.locator('#save-4k-rmb')).toBeAttached();
    await expect(page.locator('#save-8k-rmb')).toBeAttached();
  });
});

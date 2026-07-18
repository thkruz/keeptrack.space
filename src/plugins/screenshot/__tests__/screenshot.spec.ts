import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('Screenshot', () => {
  test('right-click menu elements exist in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { Screenshot: { enabled: true } },
    });

    // Screenshot exposes a single Save Image action (resolutions live in the command palette)
    await expect(page.locator('#save-rmb')).toBeAttached();
    await expect(page.locator('#save-rmb-menu')).not.toBeAttached();
  });
});

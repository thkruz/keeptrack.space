import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ScreenRecorder', () => {
  test('bottom icon exists and is not disabled', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ScreenRecorder: { enabled: true } },
    });

    const bottomIcon = page.locator('#screen-recorder-bottom-icon');

    await expect(bottomIcon).toBeAttached();
  });
});

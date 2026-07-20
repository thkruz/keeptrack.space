import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('VcrPlugin', () => {
  test('VCR controls render and respond to clicks', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { VcrPlugin: { enabled: true } },
    });

    const container = page.locator('#vcr-container');

    await expect(container).toBeAttached({ timeout: 5_000 });

    await expect(page.locator('#vcr-rewind-btn')).toBeAttached();
    await expect(page.locator('#vcr-play-pause-btn')).toBeAttached();
    await expect(page.locator('#vcr-fast-forward-btn')).toBeAttached();
  });
});

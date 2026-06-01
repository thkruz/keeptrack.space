import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SelectSatManager', () => {
  test('loads without errors as core infrastructure', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(err.message));

    await waitForAppReady(page, {
      plugins: { SelectSatManager: { enabled: true } },
    });

    const pluginErrors = errors.filter((e) => (/select.?sat/iu).test(e));

    expect(pluginErrors).toHaveLength(0);
  });
});

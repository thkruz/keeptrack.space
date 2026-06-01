import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('TimeMachine', () => {
  test('loads without errors when enabled', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(err.message));

    await waitForAppReady(page, {
      plugins: { TimeMachine: { enabled: true } },
    });

    const pluginErrors = errors.filter((e) => (/time.?machine/iu).test(e));

    expect(pluginErrors).toHaveLength(0);
  });
});

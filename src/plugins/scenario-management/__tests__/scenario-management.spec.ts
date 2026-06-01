import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ScenarioManagementPlugin', () => {
  test('loads without errors when enabled', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(err.message));

    await waitForAppReady(page, {
      plugins: { ScenarioManagementPlugin: { enabled: true }, ScenarioManagementMenu: { enabled: true } },
    });

    const fatalErrors = errors.filter((e) => (/scenario/iu).test(e));

    expect(fatalErrors).toHaveLength(0);
  });
});

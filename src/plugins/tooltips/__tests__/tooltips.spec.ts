import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('TooltipsPlugin', () => {
  test('loads without errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(err.message));

    await waitForAppReady(page, {
      plugins: { TooltipsPlugin: { enabled: true } },
    });

    const tooltipErrors = errors.filter((e) => /tooltip/iu.test(e));

    expect(tooltipErrors).toHaveLength(0);
  });
});

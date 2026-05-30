import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('MultiSiteLookAnglesPlugin', () => {
  test('icon disabled without satellite selected', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { MultiSiteLookAnglesPlugin: { enabled: true } },
    });

    const bottomIcon = page.locator('#multi-site-looks-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    await expect(page.locator('#multi-site-look-angles-menu')).toBeAttached();
  });
});

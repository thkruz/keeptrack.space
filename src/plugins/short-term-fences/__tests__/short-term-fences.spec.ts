import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('ShortTermFences', () => {
  test('icon disabled without sensor, form elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { ShortTermFences: { enabled: true } },
    });

    const bottomIcon = page.locator('[id="short-term fence-bottom-icon"]');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Form elements should exist in DOM
    await expect(page.locator('#stf-menu')).toBeAttached();
    await expect(page.locator('#stf-az')).toBeAttached();
    await expect(page.locator('#stf-el')).toBeAttached();
    await expect(page.locator('#stf-rng')).toBeAttached();
    await expect(page.locator('#stf-submit')).toBeAttached();
  });
});

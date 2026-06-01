import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('FpsView Plugin', () => {
  test('activate FPS view via utility icon', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { FpsView: { enabled: true } },
    });

    // Utility icon should be visible in the drawer utility footer
    const utilityIcon = page.locator('#FpsView-utility-icon');

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveAttribute('data-plugin-id', 'fps-view-bottom-icon');

    // Should not be selected initially
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Click utility icon to activate FPS view
    await utilityIcon.dispatchEvent('click');

    // Verify icon becomes selected (camera changed to FPS)
    await expect(utilityIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('GraticuleToggle', () => {
  test('toggle graticule on and off via utility icon', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { GraticuleToggle: { enabled: true } },
    });

    // UTILITY_ONLY icon uses #{plugin.id}-utility-icon
    const utilityIcon = page.locator('#GraticuleToggle-utility-icon');

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveAttribute('data-plugin-id', 'graticule-toggle-bottom-icon');

    // Should not be selected initially
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Read initial state
    const initialState = await page.evaluate(() => (window as any).settingsManager?.isDrawGraticule);

    // Click to toggle on
    await utilityIcon.dispatchEvent('click');

    // Verify setting toggled
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawGraticule);

      expect(currentState).toBe(!initialState);
    }).toPass({ timeout: 5_000 });

    // Verify selected state on the icon
    await expect(utilityIcon).toHaveClass(/bmenu-item-selected/u);

    // Click again to toggle off
    await utilityIcon.dispatchEvent('click');

    // Verify setting returned to initial state
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawGraticule);

      expect(currentState).toBe(initialState);
    }).toPass({ timeout: 5_000 });

    // Verify icon deselected
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u);
  });
});

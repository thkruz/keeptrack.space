import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('NightToggle', () => {
  test('toggle night mode on and off via utility icon', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { NightToggle: { enabled: true } },
    });

    // UTILITY_ONLY plugins create NO bottom icon — only a utility icon
    const utilityIcon = page.locator('#NightToggle-utility-icon');

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveAttribute('data-plugin-id', 'night-toggle-bottom-icon');

    // Should not be selected initially (night is drawn as night by default)
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Read the initial state
    const initialState = await page.evaluate(() => (window as any).settingsManager?.isDrawNightAsDay);

    expect(initialState).toBe(false);

    // Click to toggle on (draw night as day)
    await utilityIcon.dispatchEvent('click');

    // Verify setting toggled
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawNightAsDay);

      expect(currentState).toBe(true);
    }).toPass({ timeout: 5_000 });

    // Verify selected state on the icon
    await expect(utilityIcon).toHaveClass(/bmenu-item-selected/u);

    // Click again to toggle off
    await utilityIcon.dispatchEvent('click');

    // Verify setting returned to initial state
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawNightAsDay);

      expect(currentState).toBe(false);
    }).toPass({ timeout: 5_000 });

    // Verify icon deselected
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u);
  });
});

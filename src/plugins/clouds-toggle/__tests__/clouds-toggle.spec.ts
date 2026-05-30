import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('CloudsToggle Plugin', () => {
  test('toggle clouds on and off via utility icon', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { CloudsToggle: { enabled: true } },
    });

    // UTILITY_ONLY icons live in the drawer utility footer
    const utilityIcon = page.locator('#CloudsToggle-utility-icon');

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveAttribute('data-plugin-id', 'clouds-toggle-bottom-icon');

    // Read the initial state
    const initialState = await page.evaluate(() => (window as any).settingsManager?.isDrawCloudsMap);

    // Click to toggle clouds
    await utilityIcon.dispatchEvent('click');

    // Verify the setting toggled from its initial state
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawCloudsMap);

      expect(currentState).toBe(!initialState);
    }).toPass({ timeout: 5_000 });

    // Click again to toggle back
    await utilityIcon.dispatchEvent('click');

    // Verify the setting returned to its initial state
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawCloudsMap);

      expect(currentState).toBe(initialState);
    }).toPass({ timeout: 5_000 });
  });
});

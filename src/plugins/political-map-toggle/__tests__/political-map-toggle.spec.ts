import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('PoliticalMapToggle', () => {
  test('toggle political map on and off via utility icon', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { PoliticalMapToggle: { enabled: true } },
    });

    // UTILITY_ONLY icon: #PoliticalMapToggle-utility-icon
    const utilityIcon = page.locator('#PoliticalMapToggle-utility-icon');

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveAttribute('data-plugin-id', 'political-map-toggle-bottom-icon');

    // Read initial state
    const initialState = await page.evaluate(() => (window as any).settingsManager?.isDrawPoliticalMap);

    // Click to toggle on
    await utilityIcon.dispatchEvent('click');

    // Verify the setting toggled from its initial state
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawPoliticalMap);

      expect(currentState).toBe(!initialState);
    }).toPass({ timeout: 5_000 });

    // Click again to toggle off
    await utilityIcon.dispatchEvent('click');

    // Verify the setting returned to its initial state
    await expect(async () => {
      const currentState = await page.evaluate(() => (window as any).settingsManager?.isDrawPoliticalMap);

      expect(currentState).toBe(initialState);
    }).toPass({ timeout: 5_000 });
  });
});

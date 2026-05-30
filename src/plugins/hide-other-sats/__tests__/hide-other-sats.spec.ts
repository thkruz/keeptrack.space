import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('HideOtherSatellitesPlugin', () => {
  test('toggle hide other satellites on and off via utility icon', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { HideOtherSatellitesPlugin: { enabled: true } },
    });

    // UTILITY_ONLY icon uses #{plugin.id}-utility-icon
    const utilityIcon = page.locator('#HideOtherSatellitesPlugin-utility-icon');

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveAttribute('data-plugin-id', 'hide-other-sats-bottom-icon');

    // Read initial transparent alpha — default is 0.1 (visible)
    const initialAlpha = await page.evaluate(
      () => (window as any).settingsManager?.colors?.transparent?.[3],
    );

    // Click to toggle (hide other sats — sets alpha to 0)
    await utilityIcon.dispatchEvent('click');

    // Verify transparent alpha changed
    await expect(async () => {
      const alpha = await page.evaluate(
        () => (window as any).settingsManager?.colors?.transparent?.[3],
      );

      expect(alpha).not.toBe(initialAlpha);
    }).toPass({ timeout: 5_000 });

    // Verify selected state on the icon
    await expect(utilityIcon).toHaveClass(/bmenu-item-selected/u);

    // Click again to toggle off (show other sats — restores alpha to 0.1)
    await utilityIcon.dispatchEvent('click');

    // Verify transparent alpha returned to initial
    await expect(async () => {
      const alpha = await page.evaluate(
        () => (window as any).settingsManager?.colors?.transparent?.[3],
      );

      expect(alpha).toBe(initialAlpha);
    }).toPass({ timeout: 5_000 });

    // Verify icon deselected
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u);
  });
});

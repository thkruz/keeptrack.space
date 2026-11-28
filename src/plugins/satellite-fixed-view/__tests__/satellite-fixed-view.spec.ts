import { expect, test } from '@test/e2e/coverage';
import { expectShook, waitForAppReady, watchForShake } from '@test/e2e/keeptrack-fixtures';

test.describe('SatelliteFixedView', () => {
  test('utility icon disabled without satellite selected', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SatelliteFixedView: { enabled: true } },
    });

    const utilityIcon = page.locator('#SatelliteFixedView-utility-icon');

    await expect(utilityIcon).toBeAttached();

    await expect(utilityIcon).toBeVisible();
    await expect(utilityIcon).toHaveClass(/bmenu-item-disabled/u);

    await watchForShake(utilityIcon);
    // The utility footer is a collapsed pill until hovered, so hover it like a user does. The icon is not
    // natively disabled (aria-disabled without a role), so a plain click runs the app's disabled path.
    await page.locator('#drawer-utility-footer').hover();
    await utilityIcon.click();
    // The disabled icon explains itself by shaking; it does not run its action
    await expectShook(utilityIcon);
    await expect(utilityIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 2_000 });
  });
});

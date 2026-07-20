import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('Calculator', () => {
  test('open side menu, verify form elements, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { Calculator: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#menu-calculator');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    // Open drawer and find item in Analysis group
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-4"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-calculator"]');

    await expect(drawerItem).toBeVisible();
    await drawerItem.click();

    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    await expect(page.locator('#calculator-menu')).toBeVisible({ timeout: 5_000 });

    // Verify form elements
    await expect(page.locator('#calculator-form')).toBeAttached();
    await expect(page.locator('#calc-input-frame')).toBeAttached();
    await expect(page.locator('#calc-output-format')).toBeAttached();
    await expect(page.locator('#calc-convert-btn')).toBeAttached();

    // ── Behavior: drive real conversions (exercises convert_, frame rebuilds, formatters) ──

    // 1. Convert the default J2000 position vector; position-only frames (LLA) populate.
    await page.locator('#calc-convert-btn').click();
    const llaAlt = page.locator('#calc-out-lla-alt');

    await expect(llaAlt).toHaveText(/\d/u, { timeout: 5_000 });
    await expect(llaAlt).not.toHaveText('-');

    // 2. Include velocity and reconvert; velocity-dependent Classical elements now compute.
    //    The Materialize checkbox input is visually hidden, so toggle via its label.
    await page.locator('#calc-velocity-toggle label').click();
    await expect(page.locator('#calc-in-vy')).toBeVisible();
    await page.locator('#calc-convert-btn').click();
    await expect(page.locator('#calc-out-ce-sma')).toHaveText(/\d/u, { timeout: 5_000 });

    // 3. DMS output format re-renders angle outputs in degrees/minutes/seconds.
    await page.locator('#calc-output-format').selectOption('dms');
    await page.locator('#calc-convert-btn').click();
    await expect(page.locator('#calc-out-lla-lat')).toHaveText(/°/u, { timeout: 5_000 });

    // 4. Switch the input frame to Classical elements; inputs rebuild and conversion back
    //    to a Cartesian frame still works.
    await page.locator('#calc-input-frame').selectOption('Classical');
    await expect(page.locator('#calc-in-sma')).toBeVisible();
    await page.locator('#calc-convert-btn').click();
    await expect(page.locator('#calc-out-j2000-x')).toHaveText(/\d/u, { timeout: 5_000 });

    // Close
    await page.evaluate(() => {
      document.getElementById('calculator-menu-close-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

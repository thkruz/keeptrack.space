import { expect, test } from '@test/e2e/coverage';
import { isProBuild, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('BestPassPlugin', () => {
  test('icon gated (Pro: login gate, OSS: needs a sensor), drawer item visible, form elements in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { BestPassPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const isPro = await isProBuild(page);
    const bottomIcon = page.locator('#best-pass-icon');
    const sideMenu = page.locator('#best-pass-menu');

    // Pro: best-pass is login-gated, so with the gate active (default) the icon is
    // marked pro-gated. OSS: no login gate, the icon is disabled until a sensor is picked.
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(isPro ? /bmenu-item-pro/u : /bmenu-item-disabled/u);

    // Side menu HTML should exist in DOM but be hidden
    await expect(sideMenu).toBeAttached();
    await expect(sideMenu).toBeHidden();

    // Open drawer and find the BestPass item in the EVENTS group (mode-2)
    await page.locator('#drawer-hamburger').click();

    const eventsGroup = page.locator('.drawer-group[data-group-key="mode-2"]');
    const groupItems = eventsGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await eventsGroup.locator('.drawer-group-header').click();
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="best-pass-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking a gated drawer item should NOT open the side menu
    await drawerItem.scrollIntoViewIfNeeded();
    await drawerItem.click();
    await expect(sideMenu).toBeHidden({ timeout: 2_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Verify form elements exist in the DOM even though the menu is hidden. The
    // Pro form uses chip pickers (sensor selector + satellite input) rather than
    // the OSS #bp-sats text field.
    await expect(page.locator('form#best-pass-menu-form')).toBeAttached();
    await expect(page.locator(isPro ? '#bp-sat-input' : '#bp-sats')).toBeAttached();
    await expect(page.locator('#bp-submit')).toBeAttached();
  });
});

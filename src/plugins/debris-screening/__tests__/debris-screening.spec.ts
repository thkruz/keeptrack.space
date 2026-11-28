import { expect, test } from '@test/e2e/coverage';
import { drawerGroupOf, expectShook, waitForAppReady, watchForShake } from '@test/e2e/keeptrack-fixtures';

test.describe('DebrisScreening Plugin', () => {
  test('icon is disabled without satellite, drawer item visible in EVENTS group', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { DebrisScreening: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#conjunction-screen-icon');
    const sideMenu = page.locator('#debris-screening-menu');

    // Bottom icon should exist but be disabled (no satellite selected)
    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).toHaveClass(/bmenu-item-disabled/u);

    // Side menu HTML should exist in DOM but be hidden
    await expect(sideMenu).toBeAttached();
    await expect(sideMenu).toBeHidden();

    // Open drawer and find the item in its drawer group
    await page.locator('#drawer-hamburger').click();

    const group = drawerGroupOf(page, 'conjunction-screen-icon');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="conjunction-screen-icon"]');

    await expect(drawerItem).toBeVisible();

    // Clicking a disabled plugin's drawer item should NOT open the side menu
    await drawerItem.scrollIntoViewIfNeeded();
    await watchForShake(drawerItem);
    // The row is aria-disabled, so Playwright would wait for it to be enabled; force skips that wait. The app keeps disabled rows clickable and shakes them
    await drawerItem.click({ force: true });
    // The shake proves the click reached the disabled-row handler
    await expectShook(drawerItem);
    await expect(sideMenu).toBeHidden({ timeout: 2_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);

    // Verify form elements exist in the DOM even though menu is hidden
    await expect(page.locator('form#debris-screening-menu-form')).toBeAttached();
    await expect(page.locator('#ds-scc')).toBeAttached();
    await expect(page.locator('#ds-time')).toBeAttached();
    await expect(page.locator('#ds-u')).toBeAttached();
    await expect(page.locator('#ds-v')).toBeAttached();
    await expect(page.locator('#ds-w')).toBeAttached();
    await expect(page.locator('#ds-draw-box')).toBeAttached();
    await expect(page.locator('#ds-clear-box')).toBeAttached();

    // Verify secondary menu elements exist in DOM
    await expect(page.locator('#ds-results-count')).toBeAttached();
    await expect(page.locator('#debris-screening-results-export')).toBeAttached();
    await expect(page.locator('#ds-results-table')).toBeAttached();
    await expect(page.locator('#ds-results-body')).toBeAttached();
  });
});

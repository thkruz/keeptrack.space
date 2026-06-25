import { test, expect } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('GunterLaunchCalendar Plugin', () => {
  test('open and close colorbox via drawer', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { GunterLaunchCalendar: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#gunter-launch-calendar-bottom-icon');
    const colorboxDiv = page.locator('#colorbox-div');

    // Bottom icon should exist in the DOM
    await expect(bottomIcon).toBeAttached();

    // Open drawer and find the GunterLaunchCalendar item
    await page.locator('#drawer-hamburger').click();

    const drawerItem = page.locator('.drawer-item[data-plugin-id="gunter-launch-calendar-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click the drawer item - should open colorbox and select the icon
    await drawerItem.click();
    await expect(colorboxDiv).toBeVisible({ timeout: 10_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Iframe should point to the current year's launch calendar
    const currentYear = new Date().getFullYear();

    await expect(page.locator('#colorbox-iframe')).toHaveAttribute(
      'src',
      `https://space.skyrocket.de/doc_chr/lau${currentYear}.htm`,
    );

    // Close the colorbox via DOM click (header/iframe cover the overlay visually)
    await page.evaluate(() => {
      document.getElementById('colorbox-div')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });

    // Colorbox should hide and icon should deselect
    await expect(colorboxDiv).toBeHidden({ timeout: 5_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);
  });
});

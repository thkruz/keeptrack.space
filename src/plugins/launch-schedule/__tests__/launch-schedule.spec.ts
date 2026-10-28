import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('LaunchSchedulePlugin Plugin', () => {
  test('open and close colorbox via drawer', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { LaunchSchedulePlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#launch-schedule-bottom-icon');
    const colorboxDiv = page.locator('#colorbox-div');

    // Bottom icon should exist in the DOM
    await expect(bottomIcon).toBeAttached();

    // Open drawer and find the LaunchSchedulePlugin item
    await page.locator('#drawer-hamburger').click();

    const drawerItem = page.locator('.drawer-item[data-plugin-id="launch-schedule-bottom-icon"]');

    await expect(drawerItem).toBeVisible();

    // Click the drawer item - should open colorbox and select the icon
    await drawerItem.click();
    await expect(colorboxDiv).toBeVisible({ timeout: 10_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Iframe should point to the KeepTrack launch schedule for the simulation year (the sim clock boots at real time)
    const currentYear = new Date().getUTCFullYear();

    await expect(page.locator('#colorbox-iframe')).toHaveAttribute('src', `https://keeptrack.space/launches/${currentYear}`);

    // Close the colorbox via DOM click (header/iframe cover the overlay visually)
    await page.evaluate(() => {
      document.getElementById('colorbox-div')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Colorbox should hide and icon should deselect
    await expect(colorboxDiv).toBeHidden({ timeout: 5_000 });
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u);
  });
});

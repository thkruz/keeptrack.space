import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('NaturalEventsPlugin', () => {
  test('open side menu via drawer, verify toolbar and table, then close', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { NaturalEventsPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // Legacy pattern with explicit bottomIconElementName: 'menu-natural-events'
    const bottomIcon = page.locator('#menu-natural-events');

    await expect(bottomIcon).toBeAttached();

    // Open drawer and find item in Events group (mode-2)
    await page.locator('#drawer-hamburger').click();

    const eventsGroup = page.locator('.drawer-group[data-group-key="mode-2"]');
    const groupItems = eventsGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await eventsGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-plugin-id="menu-natural-events"]');

    await expect(drawerItem).toBeVisible();

    // Click to open side menu
    await drawerItem.click();

    const sideMenu = page.locator('#NaturalEventsPlugin-menu');

    await expect(sideMenu).toBeVisible({ timeout: 5_000 });
    await expect(bottomIcon).toHaveClass(/bmenu-item-selected/u);

    // Verify toolbar buttons exist (inside draggable wrapper, use toBeAttached)
    await expect(page.locator('#NaturalEventsPlugin-fetch-btn')).toBeAttached();
    await expect(page.locator('#NaturalEventsPlugin-refresh-btn')).toBeAttached();
    await expect(page.locator('#NaturalEventsPlugin-show-all-btn')).toBeAttached();
    await expect(page.locator('#NaturalEventsPlugin-clear-all-btn')).toBeAttached();

    // Verify show-all and clear-all start disabled
    await expect(page.locator('#NaturalEventsPlugin-show-all-btn')).toBeDisabled();
    await expect(page.locator('#NaturalEventsPlugin-clear-all-btn')).toBeDisabled();

    // Verify status and table containers
    await expect(page.locator('#NaturalEventsPlugin-status')).toBeAttached();
    await expect(page.locator('#NaturalEventsPlugin-table')).toBeAttached();

    // Verify data source attribution
    await expect(page.locator('#NaturalEventsPlugin-data-source')).toBeAttached();

    // Close via close button
    await page.locator('#NaturalEventsPlugin-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

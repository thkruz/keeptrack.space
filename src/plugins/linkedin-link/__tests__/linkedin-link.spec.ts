import { test, expect } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('LinkedInLinkPlugin', () => {
  test('renders in About drawer group and opens LinkedIn on click', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { LinkedInLinkPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // The top menu button should exist in the DOM
    const topMenuBtn = page.locator('[id^="LinkedInLinkPlugin"][id$="-btn"]');

    await expect(topMenuBtn).toBeAttached();

    // Open drawer and find the LinkedIn item in the About group
    await page.locator('#drawer-hamburger').click();

    const aboutGroup = page.locator('.drawer-group[data-group-key="about"]');
    const groupItems = aboutGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await aboutGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    // TopMenuPlugin items use data-top-menu-id (NOT data-plugin-id)
    const drawerItem = page.locator('.drawer-item[data-top-menu-id="LinkedInLinkPlugin"]');

    await expect(drawerItem).toBeVisible();

    // Intercept window.open to verify the LinkedIn URL
    const openedUrl = page.waitForEvent('popup').catch(() => null);

    await drawerItem.click();

    // Verify window.open was called with the LinkedIn URL
    const popup = await openedUrl;

    if (popup) {
      expect(popup.url()).toContain('linkedin.com/company/keeptrackspace');
      await popup.close();
    } else {
      // If popup was blocked, verify via evaluate that onClick_ would call window.open
      const url = await page.evaluate(() => {
        let capturedUrl = '';
        const origOpen = window.open;

        window.open = (u?: string | URL) => {
          capturedUrl = String(u ?? '');

return null;
        };
        const btn = document.querySelector('[id^="LinkedInLinkPlugin"][id$="-btn"]') as HTMLElement;

        btn?.click();
        window.open = origOpen;

return capturedUrl;
      });

      expect(url).toContain('linkedin.com/company/keeptrackspace');
    }
  });
});

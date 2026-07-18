import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('GithubLinkPlugin', () => {
  test('renders in About drawer group and opens GitHub on click', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { GithubLinkPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // The top menu button should exist in the DOM
    const topMenuBtn = page.locator('[id^="GithubLinkPlugin"][id$="-btn"]');

    await expect(topMenuBtn).toBeAttached();

    // Open drawer and find the GitHub item in the About group
    await page.locator('#drawer-hamburger').click();

    const aboutGroup = page.locator('.drawer-group[data-group-key="about"]');
    const groupItems = aboutGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await aboutGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    const drawerItem = page.locator('.drawer-item[data-top-menu-id="GithubLinkPlugin"]');

    await expect(drawerItem).toBeVisible();

    // Intercept window.open to verify the GitHub URL
    const openedUrl = page.waitForEvent('popup').catch(() => null);

    await drawerItem.click();

    // Verify window.open was called with the GitHub URL
    const popup = await openedUrl;

    if (popup) {
      expect(popup.url()).toContain('github.com/thkruz/keeptrack.space');
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
        const btn = document.querySelector('[id^="GithubLinkPlugin"][id$="-btn"]') as HTMLElement;

        btn?.click();
        window.open = origOpen;

        return capturedUrl;
      });

      expect(url).toContain('github.com/thkruz/keeptrack.space');
    }
  });
});

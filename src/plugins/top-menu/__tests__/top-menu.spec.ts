import { expect, test } from '@playwright/test';
import { expectCleanBoot, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('TopMenu', () => {
  test('nav elements render correctly', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { TopMenu: { enabled: true } },
    });

    // Core nav elements should be visible
    await expect(page.locator('#nav-wrapper')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#search')).toBeAttached();
    await expect(page.locator('#search-results')).toBeAttached();
    await expect(page.locator('#fullscreen-icon')).toBeAttached();
  });

  test('search box accepts a 9-digit NORAD ID without console errors', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { TopMenu: { enabled: true } },
    });

    const searchInput = page.locator('#search');

    await expect(searchInput).toBeAttached();

    // Type a 9-digit CelesTrak supplemental ID. Even with no matching satellite
    // in the (empty) catalog, the numeric-search path must not throw — the
    // pre-fix code at search-manager.ts:557 sorted by parseInt(sccNum6) which
    // is NaN for any extended ID and would produce undefined-behavior sort.
    await searchInput.fill('799500766');

    // Give the debounced search a moment to run.
    await page.waitForTimeout(500);

    // No new console errors should appear from the search path.
    expectCleanBoot(page);
  });
});

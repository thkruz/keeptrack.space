import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

// The endpoint is mocked so the spec never depends on live counts.
const MOCK_RESPONSE = {
  generatedAt: '2026-11-14T12:00:00Z',
  windowHours: 24,
  top: [
    { rank: 1, norad: '25544', count: 1200 },
    { rank: 2, norad: '20580', count: 640 },
    { rank: 3, norad: '9999999', count: 300 },
  ],
  trending: [{ rank: 1, norad: '48274', count: 90 }],
};

test.describe('MostTracked Plugin', () => {
  /** Opens the menu from the drawer's CATALOG group (mode-0). */
  const openMenu = async (page: import('@playwright/test').Page) => {
    await page.locator('#drawer-hamburger').click();

    const catalogGroup = page.locator('.drawer-group[data-group-key="mode-0"]');
    const groupItems = catalogGroup.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await catalogGroup.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    await page.locator('.drawer-item[data-plugin-id="most-tracked-bottom-icon"]').click();
    await expect(page.locator('#most-tracked-menu')).toBeVisible({ timeout: 5_000 });
  };

  test('open side menu, switch tabs, then close', async ({ page }) => {
    await page.route('**/v4/most-tracked', (route) => route.fulfill({ json: MOCK_RESPONSE }));

    // Default e2e setup loads no satellite catalog, so every row is "not in the loaded catalog".
    await waitForAppReady(page, {
      plugins: { MostTracked: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#most-tracked-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    await openMenu(page);

    const topRows = page.locator('#most-tracked-top-list .most-tracked-row');

    await expect(page.locator('#most-tracked-status')).toHaveAttribute('data-status', 'ready');
    await expect(topRows).toHaveCount(3);
    await expect(topRows.nth(2)).toHaveClass(/most-tracked-row--missing/u);

    await page.locator('a[href="#most-tracked-trending-tab"]').click();
    await expect(page.locator('#most-tracked-trending-list .most-tracked-row')).toHaveCount(1);

    await page.locator('#most-tracked-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });

  test('clicking a row selects the object @local', async ({ page }) => {
    await page.route('**/v4/most-tracked', (route) => route.fulfill({ json: MOCK_RESPONSE }));

    await waitForAppReady(page, {
      plugins: { MostTracked: { enabled: true } },
      settings: { noCatalogOnLoad: false, isDisableLoginGate: true, isMobileModeEnabled: true },
    });
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).keepTrack.api.getCatalogManager().sccNum2Id('25544') !== null,
      undefined,
      { timeout: 60_000 }
    );

    await openMenu(page);

    const issRow = page.locator('#most-tracked-top-list .most-tracked-row[data-norad="25544"]');

    await expect(issRow).not.toHaveClass(/most-tracked-row--missing/u);
    await issRow.click();
    await expect(page.locator('#sat-infobox')).toBeVisible({ timeout: 5_000 });
  });

  test('endpoint failure shows an error status, not a crash', async ({ page }) => {
    await page.route('**/v4/most-tracked', (route) => route.fulfill({ status: 503, body: '' }));

    await waitForAppReady(page, {
      plugins: { MostTracked: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    await page.locator('#most-tracked-bottom-icon').evaluate((el: HTMLElement) => el.click());
    await expect(page.locator('#most-tracked-status')).toHaveAttribute('data-status', 'error', { timeout: 5_000 });
  });
});

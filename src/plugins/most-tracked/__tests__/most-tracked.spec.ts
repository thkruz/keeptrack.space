import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

// The endpoint is mocked so the spec never depends on live counts.
const MOCK_RESPONSE = {
  generated_at: '2026-11-14T12:00:00Z',
  window_hours: 24,
  top: [
    { rank: 1, norad_cat_id: '25544', count: 12, users: 4 },
    { rank: 2, norad_cat_id: '20580', count: 6, users: 2 },
    { rank: 3, norad_cat_id: '9999999', count: 3, users: 1 },
  ],
  trending: [{ rank: 1, norad_cat_id: '48274', count: 2, users: 1 }],
};
const ENDPOINT = '**/v4/stats/most-tracked';

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
    await page.route(ENDPOINT, (route) => route.fulfill({ json: MOCK_RESPONSE }));

    // Default e2e setup loads no satellite catalog, so every row is "not in the loaded catalog".
    await waitForAppReady(page, {
      plugins: { MostTracked: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    const bottomIcon = page.locator('#most-tracked-bottom-icon');

    await expect(bottomIcon).toBeAttached();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-disabled/u);

    await openMenu(page);

    const topRows = page.locator('#most-tracked-top-list button.most-tracked-row');

    await expect(page.locator('#most-tracked-status')).toHaveAttribute('data-status', 'ready');
    await expect(topRows).toHaveCount(3);
    await expect(topRows.nth(2)).toBeDisabled();

    await page.locator('a[href="#most-tracked-trending-tab"]').click();
    await expect(page.locator('#most-tracked-trending-list button.most-tracked-row')).toHaveCount(1);

    await page.locator('#most-tracked-menu-close-btn').click();
    await expect(bottomIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });

  test('clicking a row selects the object @local', async ({ page }) => {
    await page.route(ENDPOINT, (route) => route.fulfill({ json: MOCK_RESPONSE }));

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

    const issRow = page.locator('#most-tracked-top-list button.most-tracked-row[data-norad="25544"]');

    await expect(issRow).toBeEnabled();
    await issRow.click();
    await expect(page.locator('#sat-infobox')).toBeVisible({ timeout: 5_000 });
  });

  test('is available on real phones (mobile plugin allowlist)', async ({ page }) => {
    await page.route(ENDPOINT, (route) => route.fulfill({ json: MOCK_RESPONSE }));

    // isForceMobileMode runs the real phone path, where plugins outside MobileManager.MOBILE_PLUGINS are switched off.
    // The plugin is deliberately not force-enabled here.
    await waitForAppReady(page, {
      settings: { isDisableLoginGate: true, isForceMobileMode: true },
    });

    await openMenu(page);
    await expect(page.locator('#most-tracked-top-list button.most-tracked-row')).toHaveCount(3);
  });

  test('a 503 closes the menu and disables the icon, with no toast', async ({ page }) => {
    await page.route(ENDPOINT, (route) => route.fulfill({ status: 503, json: { error: 'Usage data unavailable' } }));

    await waitForAppReady(page, {
      plugins: { MostTracked: { enabled: true } },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    const toastBefore = await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).keepTrack.api.getUiManager().lastToast as string | undefined
    );

    await openMenu(page);

    await expect(page.locator('#most-tracked-bottom-icon')).toHaveClass(/bmenu-item-disabled/u, { timeout: 5_000 });
    // Closed side menus slide off-screen and become inert (src/engine/utils/slide.ts).
    await expect(page.locator('#most-tracked-menu')).toHaveAttribute('inert', '', { timeout: 5_000 });
    expect(
      await page.evaluate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => (window as any).keepTrack.api.getUiManager().lastToast as string | undefined
      )
    ).toBe(toastBefore);
  });

  test('renders the live endpoint @local', async ({ page }) => {
    // No mock: talks to the real endpoint, so it only runs locally.
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

    await expect(page.locator('#most-tracked-status')).toHaveAttribute('data-status', 'ready', { timeout: 10_000 });
    await expect(page.locator('#most-tracked-top-list button.most-tracked-row').first()).toBeVisible();
  });
});

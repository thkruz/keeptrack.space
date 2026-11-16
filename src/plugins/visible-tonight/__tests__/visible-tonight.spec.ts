import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/** Opens the menu from the drawer's EVENTS group (mode-2). */
const openMenu = async (page: import('@playwright/test').Page) => {
  await page.locator('#drawer-hamburger').click();

  const eventsGroup = page.locator('.drawer-group[data-group-key="mode-2"]');
  const groupItems = eventsGroup.locator('.drawer-group-items');

  if (await groupItems.isHidden()) {
    await eventsGroup.locator('.drawer-group-header').click();
    await expect(groupItems).toBeVisible({ timeout: 2_000 });
  }

  await page.locator('.drawer-item[data-plugin-id="visible-tonight-bottom-icon"]').click();
  await expect(page.locator('#visible-tonight-menu')).toBeVisible({ timeout: 5_000 });
};

test.describe('VisibleTonight Plugin', () => {
  test.describe('with a location', () => {
    test.use({ geolocation: { latitude: 40.7128, longitude: -74.006 }, permissions: ['geolocation'] });

    test('asks for the location only on tap, then searches', async ({ page }) => {
      // Default e2e setup loads no satellite catalog, so the search ends at "catalog still loading".
      await waitForAppReady(page, {
        plugins: { VisibleTonight: { enabled: true } },
        settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
      });

      await openMenu(page);

      const status = page.locator('#visible-tonight-status');
      const locate = page.locator('#visible-tonight-locate-btn');

      await expect(status).toHaveAttribute('data-status', 'needLocation');
      await expect(locate).toBeVisible();

      await locate.click();
      await expect(status).toHaveAttribute('data-status', 'noCatalog');

      await page.locator('#visible-tonight-menu-close-btn').click();
      await expect(page.locator('#visible-tonight-bottom-icon')).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
    });

    test('is available on real phones (mobile plugin allowlist)', async ({ page }) => {
      // isForceMobileMode runs the real phone path, where plugins outside MobileManager.MOBILE_PLUGINS are switched off.
      // The plugin is deliberately not force-enabled here.
      await waitForAppReady(page, {
        settings: { isDisableLoginGate: true, isForceMobileMode: true },
      });

      await openMenu(page);
      await expect(page.locator('#visible-tonight-locate-btn')).toBeVisible();
    });
  });

  test.describe('without a location', () => {
    test.use({ permissions: [] });

    test('explains a refused location and keeps the button', async ({ page, context }) => {
      await context.clearPermissions();
      await waitForAppReady(page, {
        plugins: { VisibleTonight: { enabled: true } },
        settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
      });

      await openMenu(page);
      await page.locator('#visible-tonight-locate-btn').click();

      await expect(page.locator('#visible-tonight-status')).toHaveAttribute('data-status', 'denied', { timeout: 25_000 });
      await expect(page.locator('#visible-tonight-locate-btn')).toBeVisible();
      // Refused location still leaves a way forward: typing one in.
      await expect(page.locator('#visible-tonight-edit-btn')).toBeVisible();
    });

    test('a typed location is shown and searched, no browser location needed (#1468)', async ({ page, context }) => {
      await context.clearPermissions();
      await waitForAppReady(page, {
        plugins: { VisibleTonight: { enabled: true } },
        settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
      });

      await openMenu(page);
      await page.locator('#visible-tonight-edit-btn').click();
      await expect(page.locator('#visible-tonight-location-form')).toBeVisible();
      // Only the form's own actions while editing: the main button must really be hidden, not just flagged.
      await expect(page.locator('#visible-tonight-locate-btn')).toBeHidden();

      await page.locator('#visible-tonight-lat').fill('-33.8688');
      await page.locator('#visible-tonight-lon').fill('151.2093');
      await page.locator('#visible-tonight-apply-btn').click();

      await expect(page.locator('#visible-tonight-location-form')).toBeHidden();
      await expect(page.locator('#visible-tonight-location-text')).toHaveText(/33\.87° S, 151\.21° E/u);
      // Default e2e setup loads no catalog, so the search ends at "catalog still loading".
      await expect(page.locator('#visible-tonight-status')).toHaveAttribute('data-status', 'noCatalog');
    });
  });
});

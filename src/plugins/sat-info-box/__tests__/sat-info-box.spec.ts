import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('SatInfoBox and Related Plugins', () => {
  test('sat-infobox container and all sub-plugin sections are created in DOM', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        SatInfoBoxCore: { enabled: true },
        SatInfoBoxActions: { enabled: true },
        SatInfoBoxLinks: { enabled: true },
        SatInfoBoxOrbital: { enabled: true },
        SatInfoBoxObject: { enabled: true },
        SatInfoBoxMission: { enabled: true },
        SatInfoBoxSponsor: { enabled: true },
        SatInfoBoxSensor: { enabled: true },
        SatInfoBoxDoppler: { enabled: true },
      },
    });

    // ── Core SatInfoBox container ──────────────────────────────────────
    const container = page.locator('#sat-infobox');

    await expect(container).toBeAttached({ timeout: 10_000 });

    // Core header elements
    await expect(page.locator('#sat-info-header')).toBeAttached();
    await expect(page.locator('#sat-info-title')).toBeAttached();
    await expect(page.locator('#sat-info-title-name')).toBeAttached();
    await expect(page.locator('#sat-infobox-fi')).toBeAttached();

    // Identifiers section
    await expect(page.locator('#sat-identifier-data')).toBeAttached();
    await expect(page.locator('#sat-intl-des')).toBeAttached();
    await expect(page.locator('#sat-objnum')).toBeAttached();
    await expect(page.locator('#sat-alt-name')).toBeAttached();
    await expect(page.locator('#sat-alt-id')).toBeAttached();
    await expect(page.locator('#sat-source')).toBeAttached();
    await expect(page.locator('#sat-confidence')).toBeAttached();

    // Collapse icon for identifiers section
    await expect(page.locator('#sat-identifier-data-collapse')).toBeAttached();

    // ── SatInfoBoxActions (Pro) ────────────────────────────────────────
    await expect(page.locator('#sat-info-box-actions')).toBeAttached();

    // ── SatInfoBoxLinks (Pro) ──────────────────────────────────────────
    await expect(page.locator('#links-section')).toBeAttached();

    // ── SatInfoBoxOrbital ──────────────────────────────────────────────
    await expect(page.locator('#orbital-section')).toBeAttached();
    await expect(page.locator('#sat-latitude')).toBeAttached();
    await expect(page.locator('#sat-longitude')).toBeAttached();
    await expect(page.locator('#sat-altitude')).toBeAttached();
    await expect(page.locator('#sat-period')).toBeAttached();
    await expect(page.locator('#sat-inclination')).toBeAttached();
    await expect(page.locator('#sat-eccentricity')).toBeAttached();
    await expect(page.locator('#sat-raan')).toBeAttached();
    await expect(page.locator('#sat-argPe')).toBeAttached();
    await expect(page.locator('#sat-apogee')).toBeAttached();
    await expect(page.locator('#sat-perigee')).toBeAttached();
    await expect(page.locator('#sat-elset-age')).toBeAttached();

    // ── SatInfoBoxObject ───────────────────────────────────────────────
    await expect(page.locator('#object-section')).toBeAttached();
    await expect(page.locator('#sat-type')).toBeAttached();
    await expect(page.locator('#sat-status')).toBeAttached();
    await expect(page.locator('#sat-country')).toBeAttached();
    await expect(page.locator('#sat-launchSite')).toBeAttached();
    await expect(page.locator('#sat-vehicle')).toBeAttached();
    await expect(page.locator('#sat-configuration')).toBeAttached();
    await expect(page.locator('#sat-rcs')).toBeAttached();
    await expect(page.locator('#sat-stdmag')).toBeAttached();

    // Secondary satellite section
    await expect(page.locator('#secondary-sat-info')).toBeAttached();

    // ── SatInfoBoxMission (Pro) ────────────────────────────────────────
    await expect(page.locator('#sat-mission-data')).toBeAttached();

    // ── SatInfoBoxSensor ───────────────────────────────────────────────
    await expect(page.locator('#sensor-sat-info')).toBeAttached();
    await expect(page.locator('#sat-range')).toBeAttached();
    await expect(page.locator('#sat-azimuth')).toBeAttached();
    await expect(page.locator('#sat-elevation')).toBeAttached();

    // ── SatInfoBoxDoppler (Pro) ────────────────────────────────────────
    await expect(page.locator('#doppler-sat-info')).toBeAttached();

    // ── Container should be hidden (no satellite selected) ─────────────
    await expect(container).toHaveClass(/start-hidden/u);
  });

  test('sat-infobox has no drawer entry (infrastructure plugin)', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SatInfoBoxCore: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });

    // Open drawer
    await page.locator('#drawer-hamburger').click();

    // SatInfoBox has no bottom icon, so no drawer item should exist for it
    const drawerItem = page.locator('.drawer-item[data-plugin-id*="sat-info"]');

    await expect(drawerItem).toHaveCount(0);
  });
});

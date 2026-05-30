import { expect, test } from '@playwright/test';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

test.describe('Plot Analysis Plugins', () => {
  test('satellite-dependent plots are disabled, standalone plots have DOM elements', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: {
        EciPlot: { enabled: true },
        EcfPlot: { enabled: true },
        RicPlot: { enabled: true },
        Lat2LonPlots: { enabled: true },
        Time2LonPlots: { enabled: true },
        Inc2AltPlots: { enabled: true },
        Inc2LonPlots: { enabled: true },
      },
      settings: { isDisableLoginGate: true, isMobileModeEnabled: true },
    });

    // ── Satellite-dependent plots: ECI, ECF, RIC ──
    // These use legacy bottomIconLabel pattern → element names from locale slugs
    // "ECI Plot" → "eci-plot-bottom-icon", "ECF Plot" → "ecf-plot-bottom-icon",
    // "RIC Plot" → "ric-plot-bottom-icon"
    const eciIcon = page.locator('#eci-plot-bottom-icon');
    const ecfIcon = page.locator('#ecf-plot-bottom-icon');
    const ricIcon = page.locator('#ric-plot-bottom-icon');

    await expect(eciIcon).toBeAttached();
    await expect(ecfIcon).toBeAttached();
    await expect(ricIcon).toBeAttached();

    // All three should be disabled (no satellite selected)
    await expect(eciIcon).toHaveClass(/bmenu-item-disabled/u);
    await expect(ecfIcon).toHaveClass(/bmenu-item-disabled/u);
    await expect(ricIcon).toHaveClass(/bmenu-item-disabled/u);

    // Verify chart canvases exist in DOM for each
    await expect(page.locator('#plot-analysis-chart-eci')).toBeAttached();
    await expect(page.locator('#plot-analysis-chart-ecf')).toBeAttached();
    await expect(page.locator('#plot-analysis-chart-ric')).toBeAttached();

    // ── Composition-based plots (login-gated): Time2Lon, Inc2Alt, Inc2Lon ──
    const time2lonIcon = page.locator('#time2lon-plots-icon');
    const inc2altIcon = page.locator('#inc2alt-plots-icon');
    const inc2lonIcon = page.locator('#inc2lon-plots-icon');

    await expect(time2lonIcon).toBeAttached();
    await expect(inc2altIcon).toBeAttached();
    await expect(inc2lonIcon).toBeAttached();

    // Their chart containers should be in the DOM
    await expect(page.locator('#plot-analysis-chart-time2lon')).toBeAttached();
    await expect(page.locator('#plot-analysis-chart-inc2alt')).toBeAttached();
    await expect(page.locator('#plot-analysis-chart-inc2lon')).toBeAttached();

    // ── Open drawer and verify Analysis group has plot items ──
    await page.locator('#drawer-hamburger').click();
    const group = page.locator('.drawer-group[data-group-key="mode-4"]');
    const groupItems = group.locator('.drawer-group-items');

    if (await groupItems.isHidden()) {
      await group.locator('.drawer-group-header').click();
      await expect(groupItems).toBeVisible({ timeout: 2_000 });
    }

    // Verify composition-pattern drawer items
    await expect(page.locator('.drawer-item[data-plugin-id="time2lon-plots-icon"]')).toBeVisible();
    await expect(page.locator('.drawer-item[data-plugin-id="inc2alt-plots-icon"]')).toBeVisible();
    await expect(page.locator('.drawer-item[data-plugin-id="inc2lon-plots-icon"]')).toBeVisible();

    // Verify legacy-pattern drawer items
    await expect(page.locator('.drawer-item[data-plugin-id="eci-plot-bottom-icon"]')).toBeVisible();
    await expect(page.locator('.drawer-item[data-plugin-id="ecf-plot-bottom-icon"]')).toBeVisible();
    await expect(page.locator('.drawer-item[data-plugin-id="ric-plot-bottom-icon"]')).toBeVisible();

    // ── Open Inc2AltPlots (non-satellite-dependent, login gate disabled) ──
    const inc2altDrawer = page.locator('.drawer-item[data-plugin-id="inc2alt-plots-icon"]');

    await inc2altDrawer.click();

    const inc2altMenu = page.locator('#inc2alt-plots-menu');

    await expect(inc2altMenu).toBeVisible({ timeout: 5_000 });

    // Verify statistics elements
    await expect(page.locator('#inc2alt-total-count')).toBeAttached();
    await expect(page.locator('#inc2alt-constellation-counts')).toBeAttached();

    // Close via close button
    await page.locator('#inc2alt-plots-menu-close-btn').click();
    await expect(inc2altIcon).not.toHaveClass(/bmenu-item-selected/u, { timeout: 5_000 });
  });
});

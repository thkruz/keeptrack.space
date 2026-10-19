import { expect, test } from '@test/e2e/coverage';
import { expectCleanBoot, isProBuild, OSS_BASELINE_SKIP, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baseline for plan 03 T5: the sensor list shows the cited "Ground Stations" group
 * (43 stations; 10 of them are the existing DSN/ESTRACK entries). Local-only.
 */
test.describe('Sensor list Ground Stations group @local', () => {
  test('lists the 43 cited ground stations @local', async ({ page }) => {
    await waitForAppReady(page, {
      plugins: { SensorListPlugin: { enabled: true }, SensorInfoPlugin: { enabled: true } },
      settings: { isMobileModeEnabled: true },
    });
    test.skip(await isProBuild(page), OSS_BASELINE_SKIP);

    await page.evaluate(() => {
      document.getElementById('sensors-bottom-icon')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(page.locator('#sensor-list-menu')).toBeVisible({ timeout: 5_000 });

    const group = page.locator('[data-sensor-group="groundStations"]');

    await expect(group.locator('.sensor-group-header-text')).toHaveText('Ground Stations');
    await expect(group.locator('.sensor-row[data-sensor]')).toHaveCount(43);

    await group.locator('.sensor-group-header').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(page.locator('#sensor-list-menu')).toHaveScreenshot('sensor-list-ground-stations.png', { maxDiffPixelRatio: 0.02 });

    // Selecting a station surfaces its citation in Sensor Info.
    await group.locator('.sensor-row[data-sensor="KSAT-SVALBARD"]').click();
    await page.waitForTimeout(500);
    const source = await page.evaluate(() => {
      const plugin = (window as unknown as { keepTrack: { api: { getPluginByName(n: string): { getSensorInfo(): void } } } }).keepTrack.api.getPluginByName('SensorInfoPlugin');

      plugin.getSensorInfo();

      return document.getElementById('sensor-source')?.textContent ?? '';
    });

    expect(source).toBe('www.wikidata.org, retrieved 2026-09-19');

    expectCleanBoot(page);
  });
});

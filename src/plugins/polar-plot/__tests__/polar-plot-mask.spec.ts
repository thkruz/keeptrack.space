import { expect, test } from '@test/e2e/coverage';
import { loadFixedIssScene, selectFixedIss } from '@test/e2e/fixed-scene';
import { expectCleanBoot } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baseline for plan 03 T3: the polar plot shades the sensor's horizon mask as a grey
 * band from the rim inward. Local-only (canvas text rendering depends on this machine).
 *
 * Scene: pinned ISS at a fixed frozen time, primary sensor = the NSN Wallops ground-station
 * preset rebuilt (as a custom sensor) with an interpolated tent mask peaking at 40 deg over az 90.
 */
test.describe('Polar plot horizon mask @local', () => {
  test('polar plot draws the mask annulus @local', async ({ page }) => {
    await loadFixedIssScene(page, {
      date: new Date('2008-09-20T12:30:00.000Z'),
      plugins: { PolarPlotPlugin: { enabled: true }, SensorListPlugin: { enabled: true } },
    });

    const maskCount = await page.evaluate(() => {
      type Sensor = { constructor: new (p: object) => Sensor; getMaskVertexCount(): number };
      type Api = {
        getSensorManager(): { setSensor(s: Sensor | string | null, id?: number | null): void; addSecondarySensor(s: Sensor, replace: boolean): void; getSensor(): Sensor };
      };
      const sm = (window as unknown as { keepTrack: { api: Api } }).keepTrack.api.getSensorManager();

      sm.setSensor('NSN-WALLOPS');
      const base = sm.getSensor();
      const vertices = [0, 45, 90, 135, 180, 270].map((az) => ({ startAz: az, stopAz: az, minEl: az === 90 ? 40 : az === 45 || az === 135 ? 15 : 5 }));
      // Same path as the custom-sensor form: a 'Custom Sensor' replaces the primary sensor
      const masked = new base.constructor({ ...base, name: 'Custom Sensor', objName: 'Custom Sensor-mask', elevationMasks: vertices, interpolateMask: true });

      sm.addSecondarySensor(masked, true);

      return sm.getSensor().getMaskVertexCount();
    });

    expect(maskCount).toBe(6);

    await selectFixedIss(page);
    await page.evaluate(() => {
      document.getElementById('polar-plot-bottom-icon')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(page.locator('#polar-plot')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1_000);

    await expect(page.locator('#polar-plot')).toHaveScreenshot('polar-plot-mask.png', { maxDiffPixelRatio: 0.02 });

    expectCleanBoot(page);
  });
});

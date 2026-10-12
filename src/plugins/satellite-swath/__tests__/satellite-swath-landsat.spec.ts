import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/*
 * Plan 01 cross-check (local only, needs the live catalog): Landsat 9 (49260) with a 185 km
 * swath. The ribbon's nadir width at one instant must be within 3% of 185 km, and its half-width
 * within 1% of the Pro coverage grid's swathGroundRadiusRad(92.5) ground radius, which is
 * 92.5 km / 6371 km rad, i.e. 92.5 km of ground on the 6371 km sphere.
 */
type XWindow = {
  keepTrack: {
    api: {
      getCatalogManager(): { objectCache: unknown[]; sccNum2Id(s: string): number | null };
      getPluginByName(n: string): {
        selectSat(id: number): void;
        bottomMenuClicked(): void;
        closeSettingsMenu(): void;
        settings: Record<string, unknown>;
        updateSettings(s: Record<string, unknown>): void;
      };
      getScene(): { swathFactory: { meanAltKm: number; meshes: { vertexCount: number; vertices: Float32Array; ranges: { first: number; count: number; kind: string }[] }[] } };
    };
  };
  settingsManager: { swathLiftKm: number };
};

test.describe('Swath Landsat 9 cross-check @local', () => {
  test.setTimeout(120_000);

  test('185 km swath matches the published width @local', async ({ page }) => {
    await waitForAppReady(page, { settings: { noCatalogOnLoad: false, isDisableLoginGate: true }, plugins: { SatelliteSwath: { enabled: true } } });
    await page.waitForFunction(() => (window as unknown as XWindow).keepTrack.api.getCatalogManager().sccNum2Id('49260') !== null, undefined, { timeout: 40_000 });

    await page.evaluate(() => {
      const api = (window as unknown as XWindow).keepTrack.api;

      api.getPluginByName('SelectSatManager').selectSat(api.getCatalogManager().sccNum2Id('49260') as number);
    });
    await page.waitForTimeout(2_000);
    await page.evaluate(() => {
      const swath = (window as unknown as XWindow).keepTrack.api.getPluginByName('SatelliteSwath');

      swath.bottomMenuClicked();
      swath.updateSettings({ ...swath.settings, presetId: 'custom', mode: 'width', swathKm: 185, maxOffNadirDeg: 0, minSunElevDeg: -90, isDaylightOnly: false });
      swath.closeSettingsMenu();
    });
    await page.waitForFunction(() => ((window as unknown as XWindow).keepTrack.api.getScene().swathFactory.meshes[0]?.vertexCount ?? 0) > 0, undefined, { timeout: 15_000 });

    const result = await page.evaluate(() => {
      const w = window as unknown as XWindow;
      const f = w.keepTrack.api.getScene().swathFactory;
      const mesh = f.meshes[0];
      const range = mesh.ranges.find((r) => r.kind === 'nadir')!;
      // The middle sample of the first nadir run: vertices (left, right) at 2k, 2k + 1.
      const k = range.first + 2 * Math.floor(range.count / 4);
      const v = mesh.vertices;
      const lx = v[k * 3];
      const ly = v[k * 3 + 1];
      const lz = v[k * 3 + 2];
      const rx = v[k * 3 + 3];
      const ry = v[k * 3 + 4];
      const rz = v[k * 3 + 5];
      const ln = Math.hypot(lx, ly, lz);
      const rn = Math.hypot(rx, ry, rz);
      const angle = Math.acos((lx * rx + ly * ry + lz * rz) / (ln * rn));
      const groundR = (ln + rn) / 2 - w.settingsManager.swathLiftKm;
      const widthKm = angle * groundR;
      // Pro coverage grid: swathGroundRadiusRad(92.5) = 92.5 / 6371 rad, on the 6371 km sphere.
      const gridHalfKm = (92.5 / 6371) * 6371;

      return { widthKm, halfKm: widthKm / 2, gridHalfKm, meanAltKm: f.meanAltKm };
    });

    console.log(`LANDSAT9 ${JSON.stringify(result)}`);
    test.info().annotations.push({ type: 'xcheck', description: JSON.stringify(result) });

    expect(Math.abs(result.widthKm - 185) / 185).toBeLessThanOrEqual(0.03);
    expect(Math.abs(result.halfKm - result.gridHalfKm) / result.gridHalfKm).toBeLessThanOrEqual(0.01);
  });
});

import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/*
 * Perf gate for plan 02 (orbit eclipse dimming, slider bands, Epoch Age). Local-only:
 * it measures this machine's GPU. Samples requestAnimationFrame deltas for 10 s with
 * the features off, then 10 s with them on, on the default all-satellites scene with
 * the ISS selected (so the selected orbit is re-crunched every frame), and asserts
 * the p50 / p99 increase stays inside budget.
 */

type PerfWindow = {
  settingsManager: { isDrawOrbitEclipse: boolean; isShowEpochAge: boolean };
  keepTrack: {
    api: {
      getCatalogManager(): { objectCache: unknown[]; sccNum2Id(s: string): number | null };
      getPluginByName(n: string): { selectSat(id: number): void };
      getTimeManager(): { changePropRate(n: number): void };
      getOrbitManager(): { orbitEclipseSettingChanged(): void };
    };
  };
};

const SAMPLE_MS = 10_000;

// Headless Chromium falls back to SwiftShader (~12 fps), which measures the CPU
// rasterizer rather than the frame pipeline. Ask ANGLE for the real GPU instead.
test.use({ launchOptions: { args: ['--enable-webgl', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } });

const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

test.describe('Plan 02 perf gate @local @perf', () => {
  test.setTimeout(120_000);

  test('eclipse marks and epoch age stay within the frame budget @local @perf', async ({ page }) => {
    await waitForAppReady(page, { settings: { noCatalogOnLoad: false, isDisableLoginGate: true } });
    await page.waitForFunction(() => (window as unknown as PerfWindow).keepTrack.api.getCatalogManager().objectCache.length > 1000, undefined, {
      timeout: 40_000,
    });

    // Select the ISS with the features off, let the scene settle.
    await page.evaluate(() => {
      const w = window as unknown as PerfWindow;

      w.settingsManager.isDrawOrbitEclipse = false;
      w.settingsManager.isShowEpochAge = false;
      const id = w.keepTrack.api.getCatalogManager().sccNum2Id('25544');

      if (id !== null) {
        w.keepTrack.api.getPluginByName('SelectSatManager').selectSat(id);
      }
      w.keepTrack.api.getTimeManager().changePropRate(1);
    });
    await page.waitForTimeout(4_000);

    const sample = (ms: number) =>
      page.evaluate(
        (duration) =>
          new Promise<number[]>((resolve) => {
            const deltas: number[] = [];
            let last = performance.now();
            const end = last + duration;
            const tick = (now: number): void => {
              deltas.push(now - last);
              last = now;
              if (now < end) {
                requestAnimationFrame(tick);
              } else {
                resolve(deltas);
              }
            };

            requestAnimationFrame(tick);
          }),
        ms
      );

    const off = (await sample(SAMPLE_MS)).sort((a, b) => a - b);

    // Features on: dimming re-requests the orbit with the Sun vector; the band layer
    // and badge rebuild through their normal (debounced) event paths.
    await page.evaluate(() => {
      const w = window as unknown as PerfWindow;

      w.settingsManager.isDrawOrbitEclipse = true;
      w.settingsManager.isShowEpochAge = true;
      w.keepTrack.api.getOrbitManager().orbitEclipseSettingChanged();
      const id = w.keepTrack.api.getCatalogManager().sccNum2Id('25544');

      if (id !== null) {
        w.keepTrack.api.getPluginByName('SelectSatManager').selectSat(id);
      }
    });
    await page.waitForTimeout(1_000);

    const on = (await sample(SAMPLE_MS)).sort((a, b) => a - b);

    const result = {
      offP50: percentile(off, 50),
      offP99: percentile(off, 99),
      onP50: percentile(on, 50),
      onP99: percentile(on, 99),
      frames: [off.length, on.length],
    };

    test.info().annotations.push({ type: 'perf', description: JSON.stringify(result) });
    console.log(`PERF ${JSON.stringify(result)}`);

    expect(result.onP50 - result.offP50).toBeLessThanOrEqual(0.5);
    expect(result.onP99 - result.offP99).toBeLessThanOrEqual(2.0);
  });
});

import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/*
 * Perf gate for plan 01 (ground swath). Local-only: it measures this machine's GPU. Samples
 * requestAnimationFrame deltas for 10 s with the swath off, then 10 s with the swath and its
 * field-of-regard fill on, on the default all-satellites scene with the ISS selected, and
 * asserts the p50 / p99 increase stays inside budget. The ribbon rebuilds only when the
 * cruncher's sample window moves, so the per-frame cost is the fan triangle and the draws.
 */

type PerfWindow = {
  settingsManager: { isDrawSwath: boolean; isDrawSwathFieldOfRegard: boolean };
  keepTrack: {
    api: {
      getCatalogManager(): { objectCache: unknown[]; sccNum2Id(s: string): number | null };
      getPluginByName(n: string): { selectSat(id: number): void; bottomMenuClicked(): void; closeSettingsMenu(): void };
      getTimeManager(): { changePropRate(n: number): void };
      getScene(): { swathFactory: { rebuildCount: number; meshes: { vertexCount: number }[]; updateAll(): void; drawAll(...a: unknown[]): void } };
    };
  };
};

const SAMPLE_MS = 10_000;

// Headless Chromium falls back to SwiftShader (~12 fps), which measures the CPU
// rasterizer rather than the frame pipeline. Ask ANGLE for the real GPU instead.
test.use({ launchOptions: { args: ['--enable-webgl', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } });

const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

test.describe('Plan 01 perf gate @local @perf', () => {
  test.setTimeout(120_000);

  test('ground swath stays within the frame budget @local @perf', async ({ page }) => {
    await waitForAppReady(page, { settings: { noCatalogOnLoad: false, isDisableLoginGate: true }, plugins: { SatelliteSwath: { enabled: true } } });
    await page.waitForFunction(() => (window as unknown as PerfWindow).keepTrack.api.getCatalogManager().objectCache.length > 1000, undefined, {
      timeout: 40_000,
    });

    await page.evaluate(() => {
      const w = window as unknown as PerfWindow;
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

    // Swath on (mr-eo default preset: 120 km nadir + 20 deg field of regard), menu closed.
    await page.evaluate(() => {
      const w = window as unknown as PerfWindow;
      const swath = w.keepTrack.api.getPluginByName('SatelliteSwath');

      w.settingsManager.isDrawSwathFieldOfRegard = true;
      swath.bottomMenuClicked();
      swath.closeSettingsMenu();
    });
    await page.waitForFunction(() => ((window as unknown as PerfWindow).keepTrack.api.getScene().swathFactory.meshes[0]?.vertexCount ?? 0) > 0, undefined, {
      timeout: 15_000,
    });
    await page.waitForTimeout(1_000);

    /*
     * At 60 Hz vsync the rAF deltas only move once a frame overruns 16.7 ms, so also time the
     * swath's own per-frame CPU work (fan update + draw calls) while sampling.
     */
    await page.evaluate(() => {
      const f = (window as unknown as PerfWindow).keepTrack.api.getScene().swathFactory as unknown as Record<string, unknown> & {
        updateAll(): void;
        drawAll(...a: unknown[]): void;
      };
      const stats = { ms: 0, frames: 0 };
      const update = f.updateAll.bind(f);
      const draw = f.drawAll.bind(f);

      (window as unknown as { swathStats: typeof stats }).swathStats = stats;
      f.updateAll = () => {
        const t0 = performance.now();

        update();
        stats.ms += performance.now() - t0;
        stats.frames++;
      };
      f.drawAll = (...a: unknown[]) => {
        const t0 = performance.now();

        draw(...a);
        stats.ms += performance.now() - t0;
      };
    });

    const on = (await sample(SAMPLE_MS)).sort((a, b) => a - b);
    const swathCpu = await page.evaluate(() => {
      const st = (window as unknown as { swathStats: { ms: number; frames: number } }).swathStats;

      return st.frames > 0 ? st.ms / st.frames : Number.NaN;
    });
    const factory = await page.evaluate(() => {
      const f = (window as unknown as PerfWindow).keepTrack.api.getScene().swathFactory;

      return { rebuilds: f.rebuildCount, vertices: f.meshes.reduce((n, m) => n + m.vertexCount, 0) };
    });

    const result = {
      offP50: percentile(off, 50),
      offP99: percentile(off, 99),
      onP50: percentile(on, 50),
      onP99: percentile(on, 99),
      frames: [off.length, on.length],
      swathCpuMsPerFrame: swathCpu,
      ...factory,
    };

    test.info().annotations.push({ type: 'perf', description: JSON.stringify(result) });
    console.log(`PERF ${JSON.stringify(result)}`);

    expect(await page.evaluate(() => (window as unknown as PerfWindow).settingsManager.isDrawSwath)).toBe(true);
    expect(result.onP50 - result.offP50).toBeLessThanOrEqual(0.5);
    expect(result.onP99 - result.offP99).toBeLessThanOrEqual(2.0);
  });
});

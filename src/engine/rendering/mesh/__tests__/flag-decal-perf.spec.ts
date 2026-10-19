import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/*
 * Perf gate for plan 04 (flag decal). Local-only: it measures this machine's GPU. The default
 * all-satellites scene with the ISS selected and the camera in close, so the mesh pass runs every
 * frame. Samples requestAnimationFrame deltas for 10 s with the decal off, then 10 s with it on,
 * and asserts the p50 increase stays within the plan's 0.2 ms (p99 within 2.0 ms).
 *
 * vsync and the frame-rate limit are disabled so rAF deltas track the real frame cost instead of
 * snapping to 16.7 ms. The mesh draw's own CPU time is also reported, and a second, amplified
 * pass (the mesh drawn AMPLIFY times per frame) makes the per-draw GPU difference visible above
 * frame noise; it is reported, not gated. Run it against a build
 * without the decal to compare the off path with the pre-feature baseline (the settings writes
 * below are harmless there).
 */

type PerfWindow = {
  settingsManager: { isDrawFlagDecals: boolean };
  keepTrack: {
    api: {
      getCatalogManager(): { objectCache: unknown[]; sccNum2Id(s: string): number | null };
      getPluginByName(n: string): { selectSat(id: number): void };
      getMainCamera(): { state: { camDistBuffer: number } };
      getTimeManager(): { changePropRate(n: number): void };
      getMeshManager(): {
        draw(...a: unknown[]): void;
        currentMeshObject: { model?: { name: string; buffers?: unknown }; flag?: { enabled: boolean } };
        flagAtlasState_?: string;
      };
    };
  };
};

const SAMPLE_MS = 10_000;
const AMPLIFY = 50;
const AMPLIFIED_SAMPLE_MS = 5_000;

test.use({
  launchOptions: { args: ['--enable-webgl', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] },
});

const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

test.describe('Plan 04 perf gate @local @perf', () => {
  test.setTimeout(150_000);

  test('flag decal stays within the frame budget @local @perf', async ({ page }) => {
    await waitForAppReady(page, { settings: { noCatalogOnLoad: false, isDisableLoginGate: true, isFocusOnSatelliteWhenSelected: true, isFlagDecalsFeatureEnabled: true } });
    await page.waitForFunction(() => (window as unknown as PerfWindow).keepTrack.api.getCatalogManager().objectCache.length > 1000, undefined, {
      timeout: 40_000,
    });

    await page.evaluate(() => {
      const w = window as unknown as PerfWindow;
      const id = w.keepTrack.api.getCatalogManager().sccNum2Id('25544');

      w.settingsManager.isDrawFlagDecals = false;
      if (id !== null) {
        w.keepTrack.api.getPluginByName('SelectSatManager').selectSat(id);
      }
      w.keepTrack.api.getTimeManager().changePropRate(1);
    });
    await page.waitForTimeout(3_000);
    await page.evaluate(() => {
      (window as unknown as PerfWindow).keepTrack.api.getMainCamera().state.camDistBuffer = 0.2;
    });
    await page.waitForFunction(() => Boolean((window as unknown as PerfWindow).keepTrack.api.getMeshManager().currentMeshObject.model?.buffers), undefined, {
      timeout: 30_000,
    });
    await page.waitForTimeout(2_000);

    // Time the mesh draw (CPU side) while sampling.
    await page.evaluate(() => {
      const mm = (window as unknown as PerfWindow).keepTrack.api.getMeshManager();
      const stats = { ms: 0, calls: 0, repeat: 1 };
      const draw = mm.draw.bind(mm);

      (window as unknown as { meshStats: typeof stats }).meshStats = stats;
      mm.draw = (...a: unknown[]) => {
        const t0 = performance.now();

        for (let i = 0; i < stats.repeat; i++) {
          draw(...a);
        }
        stats.ms += performance.now() - t0;
        stats.calls++;
      };
    });

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
    const takeMeshCpu = () =>
      page.evaluate(() => {
        const st = (window as unknown as { meshStats: { ms: number; calls: number; repeat: number } }).meshStats;
        const perCall = st.calls > 0 ? st.ms / st.calls : Number.NaN;

        st.ms = 0;
        st.calls = 0;

        return perCall;
      });

    await takeMeshCpu();
    const off = (await sample(SAMPLE_MS)).sort((a, b) => a - b);
    const offMeshCpu = await takeMeshCpu();

    await page.evaluate(() => {
      (window as unknown as PerfWindow).settingsManager.isDrawFlagDecals = true;
    });
    await page.waitForTimeout(2_000);
    const state = await page.evaluate(() => {
      const mm = (window as unknown as PerfWindow).keepTrack.api.getMeshManager();

      return { model: mm.currentMeshObject.model?.name, flag: mm.currentMeshObject.flag?.enabled ?? null, atlas: mm.flagAtlasState_ ?? null };
    });

    await takeMeshCpu();
    const on = (await sample(SAMPLE_MS)).sort((a, b) => a - b);
    const onMeshCpu = await takeMeshCpu();

    // Amplified pass: same order (off, then on), mesh drawn AMPLIFY times per frame.
    const setAmplified = (on: boolean, repeat: number) =>
      page.evaluate(
        ([flag, r]) => {
          const w = window as unknown as PerfWindow & { meshStats: { repeat: number } };

          w.settingsManager.isDrawFlagDecals = flag as boolean;
          w.meshStats.repeat = r as number;
        },
        [on, repeat] as const
      );

    await setAmplified(false, AMPLIFY);
    await page.waitForTimeout(1_000);
    const ampOff = (await sample(AMPLIFIED_SAMPLE_MS)).sort((a, b) => a - b);

    await setAmplified(true, AMPLIFY);
    await page.waitForTimeout(1_000);
    const ampOn = (await sample(AMPLIFIED_SAMPLE_MS)).sort((a, b) => a - b);

    await setAmplified(true, 1);

    const result = {
      offP50: percentile(off, 50),
      offP99: percentile(off, 99),
      onP50: percentile(on, 50),
      onP99: percentile(on, 99),
      frames: [off.length, on.length],
      meshCpuMsPerDraw: [offMeshCpu, onMeshCpu],
      amplified: { repeat: AMPLIFY, offP50: percentile(ampOff, 50), onP50: percentile(ampOn, 50), frames: [ampOff.length, ampOn.length] },
      ...state,
    };

    test.info().annotations.push({ type: 'perf', description: JSON.stringify(result) });
    console.log(`PERF ${JSON.stringify(result)}`);

    expect(result.onP50 - result.offP50).toBeLessThanOrEqual(0.2);
    expect(result.onP99 - result.offP99).toBeLessThanOrEqual(2.0);
  });
});

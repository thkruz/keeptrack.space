import { expect, test } from '@test/e2e/coverage';
import { waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/**
 * Regression guard for the anchor-relative orbit-line fix (see the memory note
 * `orbit-line-anchor-relative` and scripts/orbit-diagnostics/). In ECF mode a
 * zoomed-in geostationary satellite's orbit line used to shiver because its
 * vertices were full-magnitude (~42164 km) float32 values re-rolling their ~4 m
 * rounding every frame. The fix stores the line RELATIVE to a float64 anchor and
 * patches the head vertex onto the dot each frame. This test asserts both
 * structural properties on the real, running app - the unit test
 * (src/engine/math/__tests__/orbit-anchor-math.test.ts) covers the float
 * precision itself.
 */

// Mirror of rotateEcefToEciZ / the vertex shader's ecefToEciCS.
const rotateEcefToEciZ = (x: number, y: number, z: number, c: number, s: number): [number, number, number] => [x * c - y * s, x * s + y * c, z];

interface EvalApi {
  getCatalogManager(): { objectCache: ({ id?: number; isSatellite?: () => boolean } | null)[] };
  getDotsManager(): { positionData: Float32Array | null; getRenderedPositionArray(i: number): number[] };
  getOrbitManager(): { getBufferData(id: number): Float32Array | null; orbitAnchors_: Map<number, number[]> };
  getTimeManager(): { changePropRate(n: number): void; gmst: number };
  getPluginByName(name: string): { selectSat(id: number): void };
}
type EvalWindow = { keepTrack: { api: EvalApi } };

interface FrameSample {
  gmst: number;
  anchor: [number, number, number];
  head: [number, number, number, number];
  mid: [number, number, number];
  dot: [number, number, number];
}

test.describe('Orbit-line ECF stability', () => {
  test('a selected geostationary satellite draws an anchor-relative line glued to its dot', async ({ page }) => {
    await waitForAppReady(page, {
      settings: { noCatalogOnLoad: false, isOrbitCruncherInEcf: true, isDisableLoginGate: true },
    });

    // Wait for the catalog and the position cruncher to populate.
    await page.waitForFunction(() => (window as unknown as EvalWindow).keepTrack.api.getCatalogManager().objectCache.length > 1000, { timeout: 40_000 });
    await page.waitForFunction(
      () => {
        const pd = (window as unknown as EvalWindow).keepTrack.api.getDotsManager().positionData;

        return !!pd && pd.length > 3;
      },
      { timeout: 20_000 }
    );
    await page.waitForTimeout(4_000);

    // Find a near-equatorial geostationary satellite by position magnitude (robust
    // to catalog contents; avoids depending on orbital-element getters).
    const geoId = await page.evaluate(() => {
      const api = (window as unknown as EvalWindow).keepTrack.api;
      const cat = api.getCatalogManager();
      const pd = api.getDotsManager().positionData;

      if (!pd) {
        return -1;
      }
      const count = Math.floor(pd.length / 3);

      for (let i = 0; i < count; i++) {
        const r = Math.hypot(pd[i * 3], pd[i * 3 + 1], pd[i * 3 + 2]);
        const obj = cat.objectCache[i];

        // GEO altitude (~42164 km radius) and near-equatorial (low |z|, so a clean figure).
        if (r > 41500 && r < 42800 && Math.abs(pd[i * 3 + 2]) < 2000 && obj?.isSatellite?.()) {
          return obj.id ?? i;
        }
      }

      return -1;
    });

    expect(geoId, 'a geostationary satellite should exist in the catalog').toBeGreaterThanOrEqual(0);

    await page.evaluate((id) => {
      const api = (window as unknown as EvalWindow).keepTrack.api;

      api.getPluginByName('SelectSatManager').selectSat(id);
      api.getTimeManager().changePropRate(1);
    }, geoId);
    await page.waitForTimeout(2_500);

    // Sample a handful of frames, reading buffer + anchor + gmst + dot atomically
    // per frame so they are mutually consistent.
    const samples = await page.evaluate(
      (id): Promise<FrameSample[]> =>
        new Promise((resolve) => {
          const api = (window as unknown as EvalWindow).keepTrack.api;
          const om = api.getOrbitManager();
          const dm = api.getDotsManager();
          const tm = api.getTimeManager();
          const out: FrameSample[] = [];
          const wanted = 10;
          const tick = (): void => {
            const buf = om.getBufferData(id);
            const anchor = om.orbitAnchors_.get(id) ?? [0, 0, 0];
            const dot = dm.getRenderedPositionArray(id);

            if (buf && buf.length >= 8) {
              const m = 4 * Math.floor(buf.length / 8);

              out.push({
                gmst: tm.gmst,
                anchor: [anchor[0], anchor[1], anchor[2]],
                head: [buf[0], buf[1], buf[2], buf[3]],
                mid: [buf[m], buf[m + 1], buf[m + 2]],
                dot: [dot[0], dot[1], dot[2]],
              });
            }
            if (out.length < wanted) {
              requestAnimationFrame(tick);
            } else {
              resolve(out);
            }
          };

          requestAnimationFrame(tick);
        }),
      geoId
    );

    expect(samples.length, 'orbit buffer should have populated for the selected sat').toBeGreaterThan(2);

    let maxGapKm = 0;

    for (const s of samples) {
      const anchorMag = Math.hypot(s.anchor[0], s.anchor[1], s.anchor[2]);
      const headRelMag = Math.hypot(s.head[0], s.head[1], s.head[2]);
      const midRelMag = Math.hypot(s.mid[0], s.mid[1], s.mid[2]);

      // (1) The buffer is anchor-relative, not absolute: the anchor sits at GEO
      // magnitude while the stored vertices are small offsets from it (a
      // regression to absolute buffers would put ~42164 km into every vertex).
      expect(anchorMag).toBeGreaterThan(40_000);
      expect(headRelMag).toBeLessThan(2_000);
      expect(midRelMag).toBeLessThan(15_000);

      // (2) The head vertex is flagged current-ECI-relative (negative alpha) so
      // the shader draws it without the ECEF->ECI rotation.
      expect(s.head[3]).toBeLessThan(0);

      // (3) The line head is glued to the dot: head(relative) + anchor(rotated to
      // now) reconstructs the dot position. This is what the old per-frame
      // whole-buffer align hack approximated; the anchored head makes it exact.
      const anchorEciNow = rotateEcefToEciZ(s.anchor[0], s.anchor[1], s.anchor[2], Math.cos(s.gmst), Math.sin(s.gmst));
      const gap = Math.hypot(s.head[0] + anchorEciNow[0] - s.dot[0], s.head[1] + anchorEciNow[1] - s.dot[1], s.head[2] + anchorEciNow[2] - s.dot[2]);

      maxGapKm = Math.max(maxGapKm, gap);
    }

    // Sub-metre in practice; a loose bound catches a broken anchor rotation or a
    // head no longer pinned to the dot without flaking on cruncher-update timing.
    expect(maxGapKm).toBeLessThan(0.1);
  });
});

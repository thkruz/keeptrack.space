import { expect, test } from '@test/e2e/coverage';
import { fixedSceneMasks, loadFixedIssScene, lookAtLatLon, selectFixedIss } from '@test/e2e/fixed-scene';
import { expectCleanBoot } from '@test/e2e/keeptrack-fixtures';

/*
 * Visual baseline for plan 02 T1: the selected ISS orbit line is dimmed along the
 * arc that sits in Earth's shadow. Local-only (screenshots depend on this GPU).
 *
 * At 2008-09-20 12:30 UTC the pinned ISS is over the North Pacific near local
 * midnight, so its eclipse arc faces a camera parked over the night side.
 */
test.describe('Orbit line eclipse dimming @local', () => {
  test('ISS orbit shows one dimmed arc @local', async ({ page }) => {
    await loadFixedIssScene(page, { date: new Date('2008-09-20T12:30:00.000Z') });
    await selectFixedIss(page);
    await lookAtLatLon(page, 20, -170, 0.4);

    // Structural check on the live buffer: with orbitFadeFactor f and N+1 vertices the
    // unshadowed alpha is min(f * (N + 1) / (i + 1), 1); shadowed vertices carry that
    // times orbitEclipseAlpha. Expect exactly one run of shadowed vertices.
    const runs = await page.evaluate(() => {
      type Api = {
        getCatalogManager(): { sccNum2Id(s: string): number };
        getOrbitManager(): { getBufferData(id: number): Float32Array | null };
      };
      const w = window as unknown as { keepTrack: { api: Api }; settingsManager: { orbitFadeFactor: number; orbitEclipseAlpha: number } };
      const id = w.keepTrack.api.getCatalogManager().sccNum2Id('25544');
      const buf = w.keepTrack.api.getOrbitManager().getBufferData(id);

      if (!buf) {
        return { runs: -1, dimmed: 0 };
      }
      const len = buf.length / 4;
      const f = w.settingsManager.orbitFadeFactor;
      const a = w.settingsManager.orbitEclipseAlpha;
      let count = 0;
      let dimmed = 0;
      let prev = false;

      // Vertex 0 is the per-frame head patch (w = -1); skip it.
      for (let i = 1; i < len; i++) {
        const base = Math.min(f * (len / (i + 1)), 1);
        const isDim = Math.abs(buf[i * 4 + 3] - base * a) < 1e-4 && Math.abs(base * a - base) > 1e-4;

        if (isDim) {
          dimmed++;
          if (!prev) {
            count++;
          }
        }
        prev = isDim;
      }

      return { runs: count, dimmed };
    });

    expect(runs.dimmed).toBeGreaterThan(0);
    // The arc may straddle the start of the buffer (the ISS is in shadow now), so allow
    // it to split at the head: one run, or two when it wraps.
    expect(runs.runs).toBeGreaterThanOrEqual(1);
    expect(runs.runs).toBeLessThanOrEqual(2);

    await expect(page).toHaveScreenshot('iss-orbit-eclipse.png', {
      maxDiffPixelRatio: 0.02,
      mask: fixedSceneMasks(page),
    });

    expectCleanBoot(page);
  });
});

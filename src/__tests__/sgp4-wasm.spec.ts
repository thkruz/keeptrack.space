import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Sgp4, Sgp4OpsMode } from '@ootk/src/main';
import { Sgp4GravConstants } from '@ootk/src/sgp4/sgp4';
import { expect, test } from '@test/e2e/coverage';
import { expectCleanBoot, waitForAppReady } from '@test/e2e/keeptrack-fixtures';

/*
 * End-to-end proof that the license-restricted USSF Astro Standards SGP4
 * wasm propagator (ootk Sgp4Wasm) loads inside the real app and agrees with
 * the pure-TypeScript Sgp4 class. The artifacts are optional and local-only,
 * so this spec skips when they were not deployed into dist/.
 */

const ARTIFACTS_DEPLOYED = ['Sgp4Prop.js', 'Sgp4Prop.wasm', 'Sgp4Prop.xp.js', 'Sgp4Prop.xp.wasm'].every((file) =>
  existsSync(join(process.cwd(), 'dist', 'wasm', 'sgp4prop', file))
);

/** ISS TLE (epoch: 2024-001 12:00:00 UTC). */
const ISS_LINE1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9002';
const ISS_LINE2 = '2 25544  51.6400 208.9163 0006730 358.5720 122.3372 15.50104550100010';
const TSINCE_MIN = 60;

test.describe('Sgp4Wasm in-app', () => {
  test.skip(!ARTIFACTS_DEPLOYED, 'Sgp4Prop artifacts not present in dist/wasm/sgp4prop (license-restricted, local-only)');

  test('loads the wasm propagator and matches the pure-TS Sgp4 class', async ({ page }) => {
    await waitForAppReady(page);

    const wasmResult = await page.evaluate(
      async ({ line1, line2, tsince }) => {
        const api = (window as any).keepTrack.api;
        const sgp4Wasm = await api.loadSgp4Wasm();

        const satKey = sgp4Wasm.addSat(line1, line2);

        sgp4Wasm.initSats([satKey]);

        const state = sgp4Wasm.propagateOne(satKey, tsince);

        // satKeys are BigInt and cannot cross the evaluate boundary; return plain numbers
        return {
          err: state.err,
          pos: [state.position.x, state.position.y, state.position.z],
          vel: [state.velocity.x, state.velocity.y, state.velocity.z],
          height: state.llh.height,
        };
      },
      { line1: ISS_LINE1, line2: ISS_LINE2, tsince: TSINCE_MIN }
    );

    expect(wasmResult.err).toBe(0);
    expect(wasmResult.height).toBeGreaterThan(100);

    // Reference: pure-TypeScript SGP4 (TEME frame) computed in the test process
    const satrec = Sgp4.createSatrec(ISS_LINE1, ISS_LINE2, Sgp4GravConstants.wgs72, Sgp4OpsMode.AFSPC);
    const reference = Sgp4.propagate(satrec, TSINCE_MIN);

    if (!reference.position || !reference.velocity) {
      throw new Error('Pure-TS Sgp4 reference propagation failed');
    }

    expect(Math.abs(wasmResult.pos[0] - reference.position.x)).toBeLessThan(0.1);
    expect(Math.abs(wasmResult.pos[1] - reference.position.y)).toBeLessThan(0.1);
    expect(Math.abs(wasmResult.pos[2] - reference.position.z)).toBeLessThan(0.1);
    expect(Math.abs(wasmResult.vel[0] - reference.velocity.x)).toBeLessThan(1e-4);
    expect(Math.abs(wasmResult.vel[1] - reference.velocity.y)).toBeLessThan(1e-4);
    expect(Math.abs(wasmResult.vel[2] - reference.velocity.z)).toBeLessThan(1e-4);

    expectCleanBoot(page);
  });

  test('propagatorBackend setting routes app propagation through the wasm backend', async ({ page }) => {
    test.setTimeout(120_000);

    // Full catalog boot so satellites, crunchers, and the backend all interact
    await waitForAppReady(page, { settings: { propagatorBackend: 'sgp4-wasm', noCatalogOnLoad: false } });

    // Activation is fire-and-forget at boot; poll until the backend lands
    await expect.poll(() => page.evaluate(() => (window as any).keepTrack.api.isWasmPropagatorActive()), { timeout: 20_000 }).toBe(true);

    const probe = await page.evaluate(() => {
      const now = new Date();
      const api = (window as any).keepTrack.api;
      const cache = api.getCatalogManager().objectCache as any[];
      const sat = cache.find((obj) => obj?.satrec && obj?.tle1);

      if (!sat) {
        return { found: false, hasWasmKey: false, posMagnitude: 0, sampled: 0, fellBack: 0 };
      }

      const eci = sat.eci(now);

      /*
       * Sample satellites across the whole catalog — including the JSC Vimpel
       * objects (blank/zeroed satnum + 'V' classification) that the Astro
       * Standards library initially rejects. Propagating on the main thread
       * forces a lazy wasm attach; any that fail leave wasmSatKey === -1n and
       * silently propagate in TypeScript (the dspace_ regression).
       */
      let sampled = 0;
      let fellBack = 0;
      const step = Math.max(1, Math.floor(cache.length / 500));

      for (let i = 0; i < cache.length; i += step) {
        const obj = cache[i];

        if (!obj?.satrec || !obj?.tle1) {
          continue;
        }
        obj.eci(now); // forces wasm attach on first propagation
        sampled++;
        if (obj.satrec.wasmSatKey === -1n) {
          fellBack++;
        }
      }

      return {
        found: true,
        // The satKey only attaches when propagation actually routed through wasm
        hasWasmKey: typeof sat.satrec.wasmSatKey === 'bigint' && sat.satrec.wasmSatKey > 0n,
        posMagnitude: eci ? Math.hypot(eci.position.x, eci.position.y, eci.position.z) : 0,
        sampled,
        fellBack,
      };
    });

    expect(probe.found).toBe(true);
    expect(probe.hasWasmKey).toBe(true);
    expect(probe.posMagnitude).toBeGreaterThan(6378); // above Earth's surface

    // No satellite (including JSC Vimpel) may silently fall back to TypeScript SGP4
    expect(probe.sampled).toBeGreaterThan(100);
    expect(probe.fellBack).toBe(0);

    // Also catches the workers' '[sgp4-wasm]' fallback warning if any worker
    // failed to activate the backend
    expectCleanBoot(page);
  });

  test('loads the SGP4-XP variant alongside the classic build', async ({ page }) => {
    await waitForAppReady(page);

    const result = await page.evaluate(
      async ({ line1, line2, tsince }) => {
        const api = (window as any).keepTrack.api;
        const [classic, xp] = await Promise.all([api.loadSgp4Wasm(), api.loadSgp4XpWasm()]);

        const classicKey = classic.addSat(line1, line2);

        classic.initSats([classicKey]);
        const classicState = classic.propagateOne(classicKey, tsince);

        const xpKey = xp.addSat(line1, line2);

        xp.initSats([xpKey]);
        const xpState = xp.propagateOne(xpKey, tsince);

        return {
          classicErr: classicState.err,
          xpErr: xpState.err,
          deltaX: Math.abs(classicState.position.x - xpState.position.x),
          deltaY: Math.abs(classicState.position.y - xpState.position.y),
          deltaZ: Math.abs(classicState.position.z - xpState.position.z),
        };
      },
      { line1: ISS_LINE1, line2: ISS_LINE2, tsince: TSINCE_MIN }
    );

    expect(result.classicErr).toBe(0);
    expect(result.xpErr).toBe(0);

    // Same type-0 TLE propagated by both builds must agree
    expect(result.deltaX).toBeLessThan(1e-6);
    expect(result.deltaY).toBeLessThan(1e-6);
    expect(result.deltaZ).toBeLessThan(1e-6);
  });
});

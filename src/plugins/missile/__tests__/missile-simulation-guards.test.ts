import { MissileSimulation } from '@app/plugins/missile/missile-simulation';
import { MissileSpec } from '@app/plugins/missile/missile-types';
import { itLocalOnly } from '@test/local-only';

/** Base spec using the ICBM-class motor the plugin fires (length 30 m, diameter 2.9 m). */
const baseSpec = (over: Partial<MissileSpec>): MissileSpec => ({
  launchLatitude: 0,
  launchLongitude: 0,
  targetLatitude: 0,
  targetLongitude: 0,
  numberOfWarheads: 1,
  missileObjectNum: 0,
  startTime: 0,
  description: 'test',
  length: 30,
  diameter: 2.9,
  burnRate: 0.07,
  maxRangeKm: 16000,
  minAltitudeKm: 1120,
  ...over,
});

describe('MissileSimulation degenerate-output guards', () => {
  it('a valid ICBM shot still succeeds with equal-length, finite, on-track lists', () => {
    const res = new MissileSimulation(baseSpec({ launchLatitude: 52.5, launchLongitude: 82.75, targetLatitude: 40.713, targetLongitude: -74.006 })).run();

    expect(res.kind).toBe('success');
    if (res.kind !== 'success') {
      return;
    }
    const t = res.trajectory;

    // The regression the guards protect: lat/lon lists must never fall short of the
    // altitude list, and must contain no NaN tail.
    expect(t.lonList.length).toBe(t.altList.length);
    expect(t.latList.length).toBe(t.altList.length);
    expect(t.latList.every((v) => Number.isFinite(v))).toBe(true);
    expect(t.lonList.every((v) => Number.isFinite(v))).toBe(true);
  });

  // Local-only: sweeping the numerical solver over many arcs is too CPU-intensive for the
  // shared CI runners (it times out there). It still runs in a normal local `npm test`, so
  // it guards against regressions before a push without re-running on the CI pipeline.
  itLocalOnly('never returns a success carrying a NaN coordinate or mismatched list lengths', () => {
    // Sweep a range of short/medium regional arcs with the oversized ICBM motor - exactly
    // the combinations that used to bake NaN tails. Whatever the outcome, a `success` must
    // be internally consistent (no NaN, equal-length lists).
    for (let arcDeg = 3; arcDeg <= 25; arcDeg += 2) {
      const res = new MissileSimulation(baseSpec({ launchLatitude: 0, launchLongitude: 0, targetLatitude: 0, targetLongitude: arcDeg, minAltitudeKm: 300 })).run();

      if (res.kind === 'success') {
        const t = res.trajectory;

        expect(t.latList.length).toBe(t.altList.length);
        expect(t.lonList.length).toBe(t.altList.length);
        expect(t.latList.every((v) => Number.isFinite(v))).toBe(true);
        expect(t.lonList.every((v) => Number.isFinite(v))).toBe(true);
      } else {
        // The alternative to a clean success is an explicit, typed rejection - never a
        // silent bad track. Any of error / tooClose / lowApogee is acceptable here.
        expect(['error', 'tooClose', 'lowApogee']).toContain(res.kind);
      }
    }
  });

  it('rejects a short-range shot fired with an oversized motor instead of overshooting', () => {
    // ~440 km arc with the full ICBM motor: the vehicle carries far too much energy for the
    // range, so the solver must report an error rather than a corrupted "success".
    const res = new MissileSimulation(baseSpec({ launchLatitude: 50.6, launchLongitude: 36.59, targetLatitude: 50.45, targetLongitude: 30.523, minAltitudeKm: 300 })).run();

    // Must be an explicit rejection, not a corrupted success. (The manager layer then
    // falls back to the analytic solver for shots like this; here we assert the raw
    // rocket model no longer emits a broken track.)
    expect(res.kind).not.toBe('success');
  });

  it('terminates (does not hang) even when the motor reaches orbital velocity', () => {
    // Before the step cap this combination spun the coast loop forever. Reaching this
    // assertion at all proves the loop is bounded.
    const res = new MissileSimulation(baseSpec({ launchLatitude: 50.6, launchLongitude: 36.59, targetLatitude: 50.45, targetLongitude: 30.523, minAltitudeKm: 0 })).run();

    expect(res.kind).toBeDefined();
  });
});

import { Satellite, TleLine1, TleLine2 } from '@app/engine/ootk/src/main';
import {
  applyDeltaV,
  BREAKUP_PRESETS,
  BreakupRawForm,
  buildFragmentTle,
  computeImpactBias,
  computeRicBasis,
  DEFAULT_BREAKUP_PRESET,
  getBreakupPreset,
  isAnalystRangeValid,
  MS_TO_KMS,
  makeRng,
  nextGaussian,
  parseBreakupParams,
  sampleDeltaV,
  Vec3,
} from '@app/plugins/breakup/breakup-core';

const BREAKUP_DATE = new Date('2021-07-25T12:00:00Z');

// A near-circular LEO (ISS) and a highly eccentric (Molniya-like) HEO parent.
const ISS_TLE1 = '1 25544U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991' as TleLine1;
const ISS_TLE2 = '2 25544  51.6423 168.5744 0001475 184.3976 313.3642 15.48839820294053' as TleLine2;
const HEO_TLE1 = '1 44444U 19999A   21203.40407588  .00000000  00000-0  00000-0 0  9991' as TleLine1;
const HEO_TLE2 = '2 44444  63.4000 100.0000 7200000  270.0000  10.0000  2.00600000 00001' as TleLine2;

const stateOf = (tle1: TleLine1, tle2: TleLine2) => {
  const pv = new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!;

  return { position: pv.position as Vec3, velocity: pv.velocity as Vec3 };
};

const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('breakup-core', () => {
  describe('makeRng', () => {
    it('is deterministic for a given seed', () => {
      const a = makeRng(42);
      const b = makeRng(42);

      for (let i = 0; i < 10; i++) {
        expect(a()).toBe(b());
      }
    });

    it('returns values in [0, 1)', () => {
      const rng = makeRng(7);

      for (let i = 0; i < 1000; i++) {
        const v = rng();

        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe('nextGaussian', () => {
    it('produces a finite, roughly zero-mean distribution', () => {
      const rng = makeRng(123);
      let sum = 0;
      const n = 5000;

      for (let i = 0; i < n; i++) {
        const g = nextGaussian(rng);

        expect(Number.isFinite(g)).toBe(true);
        sum += g;
      }

      expect(Math.abs(sum / n)).toBeLessThan(0.1);
    });
  });

  describe('parseBreakupParams', () => {
    const raw: BreakupRawForm = {
      radialDv: '20',
      inTrackDv: '50',
      crossTrackDv: '20',
      count: '25',
      startNum: '90000',
    };

    it('parses all numeric fields', () => {
      const { params, startNumWasInvalid } = parseBreakupParams(raw, 90000);

      expect(params.breakupCount).toBe(25);
      expect(params.radialDeltaV).toBe(20);
      expect(params.inTrackDeltaV).toBe(50);
      expect(params.crossTrackDeltaV).toBe(20);
      expect(params.startNum).toBe(90000);
      expect(startNumWasInvalid).toBe(false);
    });

    it('falls back to the default start number and flags invalid input', () => {
      const { params, startNumWasInvalid } = parseBreakupParams({ ...raw, startNum: 'abc' }, 90000);

      expect(params.startNum).toBe(90000);
      expect(startNumWasInvalid).toBe(true);
    });

    it('floors negative or NaN spreads at zero', () => {
      const { params } = parseBreakupParams({ ...raw, radialDv: '-5', inTrackDv: '', crossTrackDv: '-1' }, 90000);

      expect(params.radialDeltaV).toBe(0);
      expect(params.inTrackDeltaV).toBe(0);
      expect(params.crossTrackDeltaV).toBe(0);
    });
  });

  describe('computeRicBasis', () => {
    it('returns an orthonormal basis with radial along the position', () => {
      const position: Vec3 = { x: 7000, y: 0, z: 0 };
      const velocity: Vec3 = { x: 0, y: 7.5, z: 0 };
      const basis = computeRicBasis(position, velocity);

      const mag = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
      const d = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

      for (const v of [basis.radial, basis.inTrack, basis.crossTrack]) {
        expect(mag(v)).toBeCloseTo(1, 6);
      }
      expect(d(basis.radial, basis.inTrack)).toBeCloseTo(0, 6);
      expect(d(basis.radial, basis.crossTrack)).toBeCloseTo(0, 6);
      expect(d(basis.inTrack, basis.crossTrack)).toBeCloseTo(0, 6);
      // radial=+x (position), in-track=+y (velocity), cross-track=+z (orbit normal)
      expect(basis.radial.x).toBeCloseTo(1, 6);
      expect(basis.inTrack.y).toBeCloseTo(1, 6);
      expect(basis.crossTrack.z).toBeCloseTo(1, 6);
    });
  });

  describe('sampleDeltaV', () => {
    it('returns zero for zero spread', () => {
      const dv = sampleDeltaV(makeRng(1), { radial: 0, inTrack: 0, crossTrack: 0 });

      expect(Math.abs(dv.r)).toBe(0);
      expect(Math.abs(dv.i)).toBe(0);
      expect(Math.abs(dv.c)).toBe(0);
    });

    it('is deterministic for a given seed and stays within +/-3 sigma (km/s)', () => {
      const spread = { radial: 10, inTrack: 30, crossTrack: 10 };
      const a = sampleDeltaV(makeRng(5), spread);
      const b = sampleDeltaV(makeRng(5), spread);

      expect(a).toEqual(b);
      expect(Math.abs(a.r)).toBeLessThanOrEqual(3 * 10 * MS_TO_KMS + 1e-12);
      expect(Math.abs(a.i)).toBeLessThanOrEqual(3 * 30 * MS_TO_KMS + 1e-12);
      expect(Math.abs(a.c)).toBeLessThanOrEqual(3 * 10 * MS_TO_KMS + 1e-12);
    });

    it('shifts the sample mean by the bias (kinetic-impact offset)', () => {
      const spread = { radial: 40, inTrack: 40, crossTrack: 40 };
      const bias = { r: 0.2, i: -0.1, c: 0.05 }; // km/s
      const rng = makeRng(42);
      const n = 4000;
      const sum = { r: 0, i: 0, c: 0 };

      for (let k = 0; k < n; k++) {
        const dv = sampleDeltaV(rng, spread, bias);

        sum.r += dv.r;
        sum.i += dv.i;
        sum.c += dv.c;
      }
      // The zero-mean Gaussian spread averages out, leaving the bias.
      expect(sum.r / n).toBeCloseTo(bias.r, 1);
      expect(sum.i / n).toBeCloseTo(bias.i, 1);
      expect(sum.c / n).toBeCloseTo(bias.c, 1);
    });
  });

  describe('computeImpactBias', () => {
    // Axis-aligned RIC basis so projection is trivial to reason about.
    const basis = {
      radial: { x: 1, y: 0, z: 0 },
      inTrack: { x: 0, y: 1, z: 0 },
      crossTrack: { x: 0, y: 0, z: 1 },
    };

    it('projects the relative velocity onto RIC and scales by the transfer fraction', () => {
      const relVel = { x: 2, y: -4, z: 1 }; // km/s
      const bias = computeImpactBias(relVel, basis, 0.05);

      expect(bias.r).toBeCloseTo(0.1, 12);
      expect(bias.i).toBeCloseTo(-0.2, 12);
      expect(bias.c).toBeCloseTo(0.05, 12);
    });

    it('gives an ascending hit positive radial bias and a descending hit negative', () => {
      const ascending = computeImpactBias({ x: 3, y: 0, z: 0 }, basis, 0.05);
      const descending = computeImpactBias({ x: -3, y: 0, z: 0 }, basis, 0.05);

      expect(ascending.r).toBeGreaterThan(0);
      expect(descending.r).toBeLessThan(0);
    });
  });

  describe('applyDeltaV', () => {
    it('adds the delta-V along the correct RIC axes', () => {
      const position: Vec3 = { x: 7000, y: 0, z: 0 };
      const velocity: Vec3 = { x: 0, y: 7.5, z: 0 };
      const basis = computeRicBasis(position, velocity);
      const v = applyDeltaV(velocity, basis, { r: 0.05, i: 0.1, c: 0.2 });

      expect(v.x).toBeCloseTo(0.05, 9); // radial -> +x
      expect(v.y).toBeCloseTo(7.6, 9); // in-track -> +y
      expect(v.z).toBeCloseTo(0.2, 9); // cross-track -> +z
    });
  });

  describe('buildFragmentTle', () => {
    it('produces two 69-character lines with the analyst SCC stamped', () => {
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);
      const basis = computeRicBasis(position, velocity);
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, basis, { r: 0, i: 0, c: 0 }, '90123');

      expect(tle1).toHaveLength(69);
      expect(tle2).toHaveLength(69);
      expect(tle1.substring(2, 7)).toBe('90123');
      expect(tle2.substring(2, 7)).toBe('90123');
    });

    // The bug this guards: a fragment built from osculating elements lands ~100+ km
    // off the parent (worst for HEO). The rv2tle fit must reproduce the breakup point.
    it('reproduces the LEO parent position at the breakup epoch for zero delta-V', () => {
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);
      const basis = computeRicBasis(position, velocity);
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, basis, { r: 0, i: 0, c: 0 }, '90000');
      const fragPos = new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!.position as Vec3;

      expect(dist(fragPos, position)).toBeLessThan(1); // within 1 km of the breakup point
    });

    it('reproduces the HEO parent position at the breakup epoch for zero delta-V', () => {
      const { position, velocity } = stateOf(HEO_TLE1, HEO_TLE2);
      const basis = computeRicBasis(position, velocity);
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, basis, { r: 0, i: 0, c: 0 }, '90001');
      const fragPos = new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!.position as Vec3;

      expect(dist(fragPos, position)).toBeLessThan(1); // the regime the old code refused
    });

    it('places a small in-track delta-V fragment near the breakup point at the epoch', () => {
      const { position, velocity } = stateOf(HEO_TLE1, HEO_TLE2);
      const basis = computeRicBasis(position, velocity);
      // 50 m/s in-track: at the breakup instant the fragment still leaves the breakup point.
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, basis, { r: 0, i: 0.05, c: 0 }, '90002');
      const fragPos = new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!.position as Vec3;

      expect(dist(fragPos, position)).toBeLessThan(2);
    });

    it('throws on a sub-orbital (reentering) fragment from a large delta-V on a low orbit', () => {
      // -600 m/s in-track on the LEO ISS drops perigee below the surface (mean motion
      // > 18 rev/day) - the exact case that errored on a low-altitude ASAT breakup.
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);
      const basis = computeRicBasis(position, velocity);

      expect(() => buildFragmentTle(BREAKUP_DATE, position, velocity, basis, { r: 0, i: -0.6, c: 0 }, '90000')).toThrow(/sub-orbital|reenter|mean motion/u);
    });
  });

  describe('breakup presets', () => {
    const rms = (p: { radial: number; inTrack: number; crossTrack: number }) => Math.sqrt(p.radial ** 2 + p.inTrack ** 2 + p.crossTrack ** 2);

    it('defines the five event-type presets in increasing energy by type', () => {
      const ids = BREAKUP_PRESETS.map((p) => p.id);

      expect(ids).toEqual(['explosion', 'collision', 'asat_cosmos', 'asat_fy1c', 'venting']);

      expect(rms(getBreakupPreset('venting')!)).toBeLessThan(rms(getBreakupPreset('explosion')!));
      expect(rms(getBreakupPreset('asat_cosmos')!)).toBeLessThan(rms(getBreakupPreset('collision')!));
      // The Cosmos 1408 ASAT was much lower energy than Fengyun-1C.
      expect(rms(getBreakupPreset('asat_cosmos')!)).toBeLessThan(rms(getBreakupPreset('asat_fy1c')!));
    });

    it('keeps explosion/venting isotropic and collision/ASAT in-plane biased', () => {
      for (const id of ['explosion', 'venting']) {
        const p = getBreakupPreset(id)!;

        expect(p.radial).toBe(p.inTrack);
        expect(p.inTrack).toBe(p.crossTrack);
      }

      for (const id of ['collision', 'asat_cosmos', 'asat_fy1c']) {
        const p = getBreakupPreset(id)!;

        // In-plane axes equal; cross-track (out of plane) suppressed.
        expect(p.radial).toBe(p.inTrack);
        expect(p.crossTrack).toBeLessThan(p.radial);
      }
    });

    it('default preset matches the explosion preset', () => {
      expect(DEFAULT_BREAKUP_PRESET).toBe('explosion');
      expect(getBreakupPreset(DEFAULT_BREAKUP_PRESET)).not.toBeNull();
    });

    it('returns null for unknown / custom ids', () => {
      expect(getBreakupPreset('custom')).toBeNull();
      expect(getBreakupPreset('asat')).toBeNull();
      expect(getBreakupPreset('nope')).toBeNull();
    });
  });

  describe('isAnalystRangeValid', () => {
    const START = 90000;
    const SIZE = 10000;

    it('accepts a range fully inside the analyst block', () => {
      expect(isAnalystRangeValid(90000, 25, START, SIZE)).toBe(true);
      expect(isAnalystRangeValid(99990, 10, START, SIZE)).toBe(true);
    });

    it('rejects a start before the analyst block', () => {
      expect(isAnalystRangeValid(89999, 5, START, SIZE)).toBe(false);
    });

    it('rejects a range that overruns the analyst block', () => {
      expect(isAnalystRangeValid(99991, 10, START, SIZE)).toBe(false);
    });

    it('rejects a non-positive count', () => {
      expect(isAnalystRangeValid(90000, 0, START, SIZE)).toBe(false);
    });
  });
});

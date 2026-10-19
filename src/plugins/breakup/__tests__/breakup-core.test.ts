import { Satellite, TleLine1, TleLine2 } from '@app/engine/ootk/src/main';
import {
  AxisTriple,
  applyDeltaV,
  BREAKUP_PRESETS,
  BreakupRawForm,
  buildFragmentTle,
  computeDispersionStats,
  computeFrameBasis,
  computeImpactBias,
  computeRicBasis,
  DEFAULT_BREAKUP_PRESET,
  DeltaVDispersion,
  dispersionFromParams,
  FrameBasis,
  frameToInertial,
  gaussianSigmas,
  getBreakupPreset,
  isAnalystRangeValid,
  MAXWELL_MEAN_PER_SIGMA,
  makeRng,
  nextGaussian,
  parseBreakupParams,
  perigeeAltitudeFromTle2,
  SubOrbitalFragmentError,
  sampleDispersion,
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
const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/** In-track delta-V (km/s) on a parent state, as an inertial vector. */
const inTrackKms = (position: Vec3, velocity: Vec3, dvKms: number) => applyDeltaV(ZERO, computeRicBasis(position, velocity), { r: 0, i: dvKms, c: 0 });

const gaussian = (axes: AxisTriple, maxTotalSpeed = 0): DeltaVDispersion => ({ model: 'gaussian', axes, meanSpeed: 0, maxTotalSpeed });

/** Draw n samples and collect per-axis means, per-axis RMS, and the resultant speeds. */
const drawMany = (dispersion: DeltaVDispersion, n: number, seed = 2026) => {
  const rng = makeRng(seed);
  const sum: AxisTriple = [0, 0, 0];
  const sumSq: AxisTriple = [0, 0, 0];
  const speeds: number[] = [];
  let maxAbsAxis = 0;

  for (let k = 0; k < n; k++) {
    const s = sampleDispersion(rng, dispersion);

    for (let a = 0; a < 3; a++) {
      sum[a] += s[a];
      sumSq[a] += s[a] * s[a];
      maxAbsAxis = Math.max(maxAbsAxis, Math.abs(s[a]));
    }
    speeds.push(Math.hypot(s[0], s[1], s[2]));
  }

  return {
    axisMeans: sum.map((v) => v / n) as AxisTriple,
    axisRms: sumSq.map((v) => Math.sqrt(v / n)) as AxisTriple,
    meanSpeed: speeds.reduce((a, b) => a + b, 0) / n,
    maxSpeed: Math.max(...speeds),
    maxAbsAxis,
  };
};

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

    it('defaults to RTN, Gaussian and no cap when the optional fields are absent (interceptor form)', () => {
      const { params } = parseBreakupParams(raw, 90000);

      expect(params.frame).toBe('rtn');
      expect(params.model).toBe('gaussian');
      expect(params.meanSpeed).toBe(0);
      expect(params.maxTotalSpeed).toBe(0);
    });

    it('parses the frame, model, mean speed and cap, rejecting unknown frame/model ids', () => {
      const { params } = parseBreakupParams({ ...raw, frame: 'ntw', model: 'maxwellian', meanSpeed: '86.5', maxTotalSpeed: '350' }, 90000);

      expect(params).toMatchObject({ frame: 'ntw', model: 'maxwellian', meanSpeed: 86.5, maxTotalSpeed: 350 });

      const bad = parseBreakupParams({ ...raw, frame: 'lvlh', model: 'cauchy', maxTotalSpeed: '' }, 90000).params;

      expect(bad).toMatchObject({ frame: 'rtn', model: 'gaussian', maxTotalSpeed: 0 });
    });

    it('accepts fractional per-axis values (54.2 m/s)', () => {
      const { params } = parseBreakupParams({ ...raw, radialDv: '54.2', inTrackDv: '54.2', crossTrackDv: '54.2' }, 90000);

      expect(dispersionFromParams(params).axes).toEqual([54.2, 54.2, 54.2]);
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

  describe('computeFrameBasis', () => {
    const expectOrthonormalRightHanded = (b: FrameBasis) => {
      for (let i = 0; i < 3; i++) {
        expect(dot(b[i], b[i])).toBeCloseTo(1, 12);
        for (let j = i + 1; j < 3; j++) {
          expect(dot(b[i], b[j])).toBeCloseTo(0, 12);
        }
      }
      // axis1 x axis2 = axis3 (R x T = N for RTN, N x T = W for NTW).
      expect(dist(cross(b[0], b[1]), b[2])).toBeLessThan(1e-12);
    };

    it('builds orthonormal, right-handed RTN and NTW triads on an eccentric (HEO) orbit', () => {
      const { position, velocity } = stateOf(HEO_TLE1, HEO_TLE2);

      expectOrthonormalRightHanded(computeFrameBasis('rtn', position, velocity));
      expectOrthonormalRightHanded(computeFrameBasis('ntw', position, velocity));
      expectOrthonormalRightHanded(computeFrameBasis('eci', position, velocity));
    });

    it('aligns RTN R with the position and NTW T with the velocity, sharing the orbit normal', () => {
      const { position, velocity } = stateOf(HEO_TLE1, HEO_TLE2);
      const rtn = computeFrameBasis('rtn', position, velocity);
      const ntw = computeFrameBasis('ntw', position, velocity);
      const unit = (a: Vec3) => {
        const m = Math.hypot(a.x, a.y, a.z);

        return { x: a.x / m, y: a.y / m, z: a.z / m };
      };

      expect(dist(rtn[0], unit(position))).toBeLessThan(1e-12);
      expect(dist(ntw[1], unit(velocity))).toBeLessThan(1e-12);
      expect(dist(rtn[2], ntw[2])).toBeLessThan(1e-12);
      // On an eccentric orbit, off apsis, T (along v) and the RTN transverse axis differ by the flight-path angle.
      expect(dot(rtn[1], ntw[1])).toBeLessThan(1 - 1e-6);
    });

    it('uses the identity for ECI (TEME)', () => {
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);

      expect(computeFrameBasis('eci', position, velocity)).toEqual([
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
      ]);
    });
  });

  describe('frameToInertial', () => {
    it('preserves the delta-V magnitude for RTN and NTW (orthonormal basis)', () => {
      const { position, velocity } = stateOf(HEO_TLE1, HEO_TLE2);
      const rng = makeRng(77);

      for (const frame of ['rtn', 'ntw'] as const) {
        const basis = computeFrameBasis(frame, position, velocity);

        for (let k = 0; k < 1000; k++) {
          const c: AxisTriple = [100 * nextGaussian(rng), 100 * nextGaussian(rng), 100 * nextGaussian(rng)];
          const v = frameToInertial(basis, c);

          expect(Math.abs(Math.hypot(v.x, v.y, v.z) - Math.hypot(c[0], c[1], c[2]))).toBeLessThan(1e-9);
        }
      }
    });

    it('recovers the frame components by projecting back onto the basis', () => {
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);
      const basis = computeFrameBasis('rtn', position, velocity);
      const v = frameToInertial(basis, [5, -12, 3]);

      expect(dot(v, basis[0])).toBeCloseTo(5, 10);
      expect(dot(v, basis[1])).toBeCloseTo(-12, 10);
      expect(dot(v, basis[2])).toBeCloseTo(3, 10);
    });
  });

  describe('sampleDispersion', () => {
    const N = 10_000;

    it('returns zero for zero spread and is deterministic for a seed', () => {
      expect(sampleDispersion(makeRng(1), gaussian([0, 0, 0])).map(Math.abs)).toEqual([0, 0, 0]);
      expect(sampleDispersion(makeRng(5), gaussian([10, 30, 10]))).toEqual(sampleDispersion(makeRng(5), gaussian([10, 30, 10])));
    });

    it('has zero directional bias: each axis mean converges to 0 m/s (N = 10,000, sigma = 54.2)', () => {
      const { axisMeans } = drawMany(gaussian([54.2, 54.2, 54.2]), N);

      // Standard error is 54.2 / sqrt(10,000) = 0.54 m/s; 2 m/s is ~3.7 standard errors.
      for (const m of axisMeans) {
        expect(Math.abs(m)).toBeLessThan(2);
      }
    });

    it('converges to the Maxwell-Boltzmann mean speed: sigma 54.2 gives 86.5 +/- 1.0 m/s (N = 10,000)', () => {
      const { meanSpeed, axisRms } = drawMany(gaussian([54.2, 54.2, 54.2]), N);

      expect(Math.abs(meanSpeed - 86.5)).toBeLessThan(1.0);
      for (const r of axisRms) {
        expect(Math.abs(r - 54.2) / 54.2).toBeLessThan(0.03);
      }
    });

    it('does not clip the Gaussian tails (no hidden +/-3 sigma clamp)', () => {
      // P(|z| > 3) = 0.27% per axis, so ~80 of 30,000 axis draws land beyond 3 sigma.
      expect(drawMany(gaussian([10, 10, 10]), N).maxAbsAxis).toBeGreaterThan(30);
    });

    it('derives sigma = mu / (2 sqrt(2/pi)) for the isotropic Maxwellian and hits the target mean', () => {
      const dispersion: DeltaVDispersion = { model: 'maxwellian', axes: [0, 0, 0], meanSpeed: 86.5, maxTotalSpeed: 0 };

      expect(MAXWELL_MEAN_PER_SIGMA).toBeCloseTo(1.5957691216, 9);
      expect(gaussianSigmas(dispersion)?.[0]).toBeCloseTo(54.2, 1);
      expect(Math.abs(drawMany(dispersion, N).meanSpeed - 86.5)).toBeLessThan(1.0);
    });

    it('draws the uniform box within +/-max with variance max^2 / 3 and zero mean', () => {
      const dispersion: DeltaVDispersion = { model: 'uniform', axes: [30, 60, 90], meanSpeed: 0, maxTotalSpeed: 0 };
      const rng = makeRng(9);

      for (let k = 0; k < 2000; k++) {
        const s = sampleDispersion(rng, dispersion);

        expect(Math.abs(s[0])).toBeLessThanOrEqual(30);
        expect(Math.abs(s[1])).toBeLessThanOrEqual(60);
        expect(Math.abs(s[2])).toBeLessThanOrEqual(90);
      }

      const { axisMeans, axisRms } = drawMany(dispersion, N);

      [30, 60, 90].forEach((max, a) => {
        expect(Math.abs(axisMeans[a])).toBeLessThan(0.05 * max);
        expect(Math.abs(axisRms[a] - max / Math.sqrt(3)) / (max / Math.sqrt(3))).toBeLessThan(0.03);
      });
    });

    it('enforces the total-speed cap by redrawing, keeping the cloud zero-mean', () => {
      const { maxSpeed, axisMeans, meanSpeed } = drawMany(gaussian([54.2, 54.2, 54.2], 120), N);
      const expected = computeDispersionStats(gaussian([54.2, 54.2, 54.2], 120));

      expect(maxSpeed).toBeLessThanOrEqual(120);
      for (const m of axisMeans) {
        expect(Math.abs(m)).toBeLessThan(2);
      }
      // The truncated mean matches the closed-form prediction.
      expect(Math.abs(meanSpeed - expected.meanSpeed)).toBeLessThan(1.0);
    });

    it('pulls a sample onto the cap sphere when the cap rejects almost everything', () => {
      const s = sampleDispersion(makeRng(3), gaussian([1000, 1000, 1000], 0.001));

      expect(Math.hypot(s[0], s[1], s[2])).toBeCloseTo(0.001, 9);
    });
  });

  describe('computeDispersionStats', () => {
    it('reports mean 86.5 m/s, RMS sqrt(3) sigma and P99 3.368 sigma for isotropic sigma = 54.2', () => {
      const stats = computeDispersionStats(gaussian([54.2, 54.2, 54.2]));

      expect(stats.meanSpeed.toFixed(1)).toBe('86.5');
      expect(stats.rmsSpeed).toBeCloseTo(Math.sqrt(3) * 54.2, 4);
      // chi(3) 99th percentile = sqrt(chi^2_3(0.99)) = sqrt(11.3449) = 3.36821.
      expect(stats.p99Speed / 54.2).toBeCloseTo(3.36821, 3);
      expect(stats.acceptance).toBe(1);
    });

    it('gives the same result for a Maxwellian with mean 86.5 m/s', () => {
      const stats = computeDispersionStats({ model: 'maxwellian', axes: [0, 0, 0], meanSpeed: 86.5, maxTotalSpeed: 0 });

      expect(stats.meanSpeed).toBeCloseTo(86.5, 6);
    });

    /** Monte Carlo reference: mean, RMS, P99 and acceptance of the raw (uncapped) draws inside the cap. */
    const monteCarlo = (dispersion: DeltaVDispersion, n = 200_000) => {
      const rng = makeRng(31337);
      const raw = { ...dispersion, maxTotalSpeed: 0 };
      const cap = dispersion.maxTotalSpeed > 0 ? dispersion.maxTotalSpeed : Infinity;
      const kept: number[] = [];

      for (let k = 0; k < n; k++) {
        const s = sampleDispersion(rng, raw);
        const speed = Math.hypot(s[0], s[1], s[2]);

        if (speed <= cap) {
          kept.push(speed);
        }
      }
      kept.sort((a, b) => a - b);

      return {
        meanSpeed: kept.reduce((a, b) => a + b, 0) / kept.length,
        rmsSpeed: Math.sqrt(kept.reduce((a, b) => a + b * b, 0) / kept.length),
        p99Speed: kept[Math.floor(0.99 * kept.length)],
        acceptance: kept.length / n,
      };
    };

    const cases: [string, DeltaVDispersion][] = [
      ['anisotropic Gaussian (collision preset)', gaussian([120, 120, 50])],
      ['capped isotropic Gaussian', gaussian([54.2, 54.2, 54.2], 120)],
      ['capped anisotropic Gaussian', gaussian([230, 230, 90], 350)],
      ['uniform box', { model: 'uniform', axes: [30, 60, 90], meanSpeed: 0, maxTotalSpeed: 0 }],
      ['capped uniform box', { model: 'uniform', axes: [100, 100, 100], meanSpeed: 0, maxTotalSpeed: 120 }],
    ];

    it.each(cases)('matches Monte Carlo for the %s', (_name, dispersion) => {
      const stats = computeDispersionStats(dispersion);
      const mc = monteCarlo(dispersion);

      expect(Math.abs(stats.meanSpeed - mc.meanSpeed) / mc.meanSpeed).toBeLessThan(0.005);
      expect(Math.abs(stats.rmsSpeed - mc.rmsSpeed) / mc.rmsSpeed).toBeLessThan(0.005);
      expect(Math.abs(stats.p99Speed - mc.p99Speed) / mc.p99Speed).toBeLessThan(0.01);
      expect(Math.abs(stats.acceptance - mc.acceptance)).toBeLessThan(0.005);
    });

    it('is all zeros for zero spread', () => {
      expect(computeDispersionStats(gaussian([0, 0, 0]))).toEqual({ meanSpeed: 0, rmsSpeed: 0, p99Speed: 0, acceptance: 1 });
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
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, ZERO, '90123');

      expect(tle1).toHaveLength(69);
      expect(tle2).toHaveLength(69);
      expect(tle1.substring(2, 7)).toBe('90123');
      expect(tle2.substring(2, 7)).toBe('90123');
    });

    // The bug this guards: a fragment built from osculating elements lands ~100+ km
    // off the parent (worst for HEO). The rv2tle fit must reproduce the breakup point.
    it('reproduces the LEO parent position at the breakup epoch for zero delta-V', () => {
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, ZERO, '90000');
      const fragPos = new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!.position as Vec3;

      expect(dist(fragPos, position)).toBeLessThan(1); // within 1 km of the breakup point
    });

    it('reproduces the HEO parent position at the breakup epoch for zero delta-V', () => {
      const { position, velocity } = stateOf(HEO_TLE1, HEO_TLE2);
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, ZERO, '90001');
      const fragPos = new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!.position as Vec3;

      expect(dist(fragPos, position)).toBeLessThan(1); // the regime the old code refused
    });

    it('places a small in-track delta-V fragment near the breakup point at the epoch', () => {
      const { position, velocity } = stateOf(HEO_TLE1, HEO_TLE2);
      // 50 m/s in-track: at the breakup instant the fragment still leaves the breakup point.
      const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, inTrackKms(position, velocity, 0.05), '90002');
      const fragPos = new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!.position as Vec3;

      expect(dist(fragPos, position)).toBeLessThan(2);
    });

    it('throws on a sub-orbital (reentering) fragment from a large delta-V on a low orbit', () => {
      // -600 m/s in-track on the LEO ISS drops perigee below the surface (mean motion
      // > 18 rev/day) - the exact case that errored on a low-altitude ASAT breakup.
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);

      expect(() => buildFragmentTle(BREAKUP_DATE, position, velocity, inTrackKms(position, velocity, -0.6), '90000')).toThrow(SubOrbitalFragmentError);
    });

    it('rejects a fragment whose perigee drops into the atmosphere even though its mean motion is valid', () => {
      // -100 m/s in-track from a ~420 km circular orbit puts perigee near 65 km: a
      // valid-looking TLE (about 16 rev/day) that the old epoch-altitude check let through.
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);

      expect(() => buildFragmentTle(BREAKUP_DATE, position, velocity, inTrackKms(position, velocity, -0.1), '90000')).toThrow(SubOrbitalFragmentError);
    });

    it('keeps a fragment whose lowered perigee is still above 100 km', () => {
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);
      const { tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, inTrackKms(position, velocity, -0.05), '90000');

      expect(perigeeAltitudeFromTle2(tle2)).toBeGreaterThan(100);
    });

    it('fits every fragment of a 54.2 m/s Gaussian cloud within 0.5 km of the breakup point', () => {
      const { position, velocity } = stateOf(ISS_TLE1, ISS_TLE2);
      const basis = computeFrameBasis('rtn', position, velocity);
      const rng = makeRng(999);

      for (let k = 0; k < 250; k++) {
        const dvMps = frameToInertial(basis, sampleDispersion(rng, gaussian([54.2, 54.2, 54.2])));
        const dvKms = { x: dvMps.x / 1000, y: dvMps.y / 1000, z: dvMps.z / 1000 };

        try {
          const { tle1, tle2 } = buildFragmentTle(BREAKUP_DATE, position, velocity, dvKms, '90000');

          expect(dist(new Satellite({ tle1, tle2 }).eci(BREAKUP_DATE)!.position as Vec3, position)).toBeLessThan(0.5);
        } catch (err) {
          // Only reentry is an acceptable reason to skip a fragment here.
          expect(err).toBeInstanceOf(SubOrbitalFragmentError);
        }
      }
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

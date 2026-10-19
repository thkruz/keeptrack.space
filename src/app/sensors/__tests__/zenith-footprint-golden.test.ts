import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Degrees, Kilometers, Radians } from '@ootk/src/main';

/*
 * Zenith footprint golden (ootk v8 plan, section 2 and section 4 step 1).
 *
 * Captured on ootk v7. ootk v8 replaces the zenith branch of
 * boresightFrameFromAzElRoll, which rotates the default zenith frame by 180 deg
 * and changes what rollAngle means at zenith. KeepTrack migrates the four
 * affected catalog fans (KWAJSPF, LEOMSR, LEOKSR, LEOWASR) by setting rollAngle
 * to 0. This test is the gate for that change: it MUST pass unchanged after the
 * ootk v8 fix plus the four rollAngle edits, proving that every footprint is
 * identical.
 *
 * What is compared:
 *  - In-FOV booleans for 2,000 seeded sky directions per sensor (uniform over
 *    the hemisphere), plus 2,000 more concentrated around the fan line so the
 *    thin 2 deg fans see enough hits to make the gate meaningful.
 *  - The SET of boundary samples (directionAt every 5 deg, 72 samples per
 *    face), rounded to 9 decimals and sorted. Order is deliberately ignored:
 *    the v8 frame starts the boundary on the opposite side of the ellipse.
 *
 * Nothing here reads the internal frame vectors or depends on sample order.
 * Delete this test and its snapshot once ootk v8 ships (plan section 2).
 */

const SENSOR_IDS = ['KWAJSPF', 'LEOMSR', 'LEOKSR', 'LEOWASR', 'LEOPFISR'] as const;
const DIRECTION_COUNT = 2000;
const BOUNDARY_STEP_DEG = 5;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** mulberry32: tiny deterministic PRNG returning floats in [0, 1). */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Seed derived from the sensor id so each sensor gets its own fixed stream. */
const seedFor = (id: string, salt: number): number => {
  let h = 2166136261 ^ salt;

  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }

  return h >>> 0;
};

const round9 = (v: number): string => {
  const r = Math.round(v * 1e9) / 1e9;

  // Normalize -0 so a sign flip on an exact zero component cannot change the set
  return (r === 0 ? 0 : r).toFixed(9);
};

const getSensor = (id: string): DetailedSensor => {
  const sensor = (sensors as Record<string, DetailedSensor>)[id];

  if (!sensor) {
    throw new Error(`Sensor ${id} not found in catalog`);
  }

  return sensor;
};

const rangeBounds = (sensor: DetailedSensor): { minRng: number; maxRng: number } => {
  const fov = sensor.getFieldOfView();

  if (!fov) {
    throw new Error(`Sensor ${sensor.objName} has no FieldOfView`);
  }

  return { minRng: fov.minRange, maxRng: fov.maxRange };
};

/** Encodes booleans as a compact '0'/'1' string, wrapped every 100 chars for readable diffs. */
const encodeBits = (bits: boolean[]): string[] => {
  const s = bits.map((b) => (b ? '1' : '0')).join('');
  const lines: string[] = [];

  for (let i = 0; i < s.length; i += 100) {
    lines.push(s.slice(i, i + 100));
  }

  return lines;
};

/** 2,000 directions uniform over the upper hemisphere (az 0-360, el 0-90 by area), range inside bounds. */
const hemisphereSamples = (id: string, sensor: DetailedSensor): boolean[] => {
  const rand = mulberry32(seedFor(id, 1));
  const { minRng, maxRng } = rangeBounds(sensor);
  const out: boolean[] = [];

  for (let i = 0; i < DIRECTION_COUNT; i++) {
    const az = rand() * 360;
    const el = Math.asin(rand()) * RAD2DEG;
    const rng = minRng + rand() * (maxRng - minRng);

    out.push(sensor.isRaeInFov(az as Degrees, el as Degrees, rng as Kilometers));
  }

  return out;
};

/**
 * 2,000 directions concentrated near the fan line: azimuth within 8 deg of the
 * boresight azimuth or its back-azimuth (the catalog fans lie along boresightAz),
 * elevation uniform 0-90. Uses only catalog config, never frame vectors.
 */
const fanLineSamples = (id: string, sensor: DetailedSensor): boolean[] => {
  const rand = mulberry32(seedFor(id, 2));
  const { minRng, maxRng } = rangeBounds(sensor);
  const fanAz = sensor.fovParams?.boresightAz ?? 0;
  const out: boolean[] = [];

  for (let i = 0; i < DIRECTION_COUNT; i++) {
    const side = rand() < 0.5 ? 0 : 180;
    const az = (((fanAz + side + (rand() * 16 - 8)) % 360) + 360) % 360;
    const el = rand() * 90;
    const rng = minRng + rand() * (maxRng - minRng);

    out.push(sensor.isRaeInFov(az as Degrees, el as Degrees, rng as Kilometers));
  }

  return out;
};

/** Sorted, rounded set of boundary samples over every face FOV. */
const boundarySet = (sensor: DetailedSensor): string[] => {
  const faces = sensor.getFaceFovs() ?? [];
  const samples: string[] = [];

  for (const fov of faces) {
    for (let deg = 0; deg < 360; deg += BOUNDARY_STEP_DEG) {
      const d = fov.directionAt((deg * DEG2RAD) as Radians);

      samples.push(`${round9(d.x)},${round9(d.y)},${round9(d.z)}`);
    }
  }

  return samples.sort();
};

describe('zenith footprint golden (ootk v7 before-picture)', () => {
  it('catalog zenith sensors keep the same footprint', async () => {
    const golden: Record<string, unknown> = {};

    for (const id of SENSOR_IDS) {
      const sensor = getSensor(id);
      const hemi = hemisphereSamples(id, sensor);
      const fan = fanLineSamples(id, sensor);
      const boundary = boundarySet(sensor);

      expect(boundary.length).toBe((sensor.getFaceFovs()?.length ?? 0) * (360 / BOUNDARY_STEP_DEG));

      golden[id] = {
        faceCount: sensor.getFaceFovs()?.length ?? 0,
        hemisphereInFov: hemi.filter(Boolean).length,
        fanLineInFov: fan.filter(Boolean).length,
        hemisphereBits: encodeBits(hemi),
        fanLineBits: encodeBits(fan),
        boundary,
      };
    }

    await expect(`${JSON.stringify(golden, null, 2)}\n`).toMatchFileSnapshot('./__snapshots__/zenith-footprint-golden.json');
  });

  describe('KWAJSPF (Space Fence) is an east-west fan through zenith', () => {
    const rng = 1000 as Kilometers;

    it.each([
      ['west half', 270, 45],
      ['east half', 90, 45],
      ['zenith', 0, 90],
    ])('accepts the %s', (_label, az, el) => {
      expect(getSensor('KWAJSPF').isRaeInFov(az as Degrees, el as Degrees, rng)).toBe(true);
    });

    it.each([
      ['north, across the thin axis', 0, 45],
      ['south, across the thin axis', 180, 45],
    ])('rejects the %s', (_label, az, el) => {
      expect(getSensor('KWAJSPF').isRaeInFov(az as Degrees, el as Degrees, rng)).toBe(false);
    });
  });
});

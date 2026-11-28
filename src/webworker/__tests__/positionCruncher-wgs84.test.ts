import { GROUND_BUFFER_DISTANCE } from '@app/engine/utils/constants';
import {
  missileInViewFlag,
  missileLlaDegToEci,
  onmessageProcessing,
  PositionCruncherIncomingMsg,
  sendDataToSatSet,
  updateLandObject,
  updateMissile,
} from '@app/webworker/positionCruncher';
import { DEG2RAD, GreenwichMeanSiderealTime, Kilometers, lla2eci, llaRad2eci, Radians } from '@ootk/src/main';
import { vi } from 'vitest';

/*
 * Rows PC1-PC3 of AUDIT-wgs84.md: ground sites and missiles in the position cruncher sit on the
 * WGS84 ellipsoid (llaRad2eci), not on the deprecated 6371 km sphere (lla2eci).
 *
 * Hand-computed WGS84 references (a = 6378.137, f = 1/298.257223563, e^2 = 2f - f^2 = 0.00669438):
 *   N(phi) = a / sqrt(1 - e^2 sin^2 phi); x = (N + h) cos phi; z = (N (1 - e^2) + h) sin phi.
 *   45 N, h 0:   N = 6388.8383, x = 4517.5909, z = 4487.3484.
 *   45 N, h 2.5: x = 4517.5909 + 2.5 cos 45 = 4519.3586, z = 4487.3484 + 2.5 sin 45 = 4489.1162.
 *   Equator, h 2.5: x = a + 2.5 = 6380.637.   Pole, h 2.5: z = b + 2.5 = 6356.7523 + 2.5 = 6359.2523.
 */

const MSG_OBJ_DATA = 0;
const MSG_NEW_MISSILE = 3;

const send = (data: Record<string, unknown>) => onmessageProcessing({ data } as unknown as PositionCruncherIncomingMsg);

let posted: { satPos?: Float32Array; satVel?: Float32Array }[] = [];

const lastPosted = () => {
  posted = [];
  sendDataToSatSet();

  return posted[posted.length - 1];
};

const posOf = (i: number) => {
  const p = lastPosted().satPos!;

  return { x: p[i * 3], y: p[i * 3 + 1], z: p[i * 3 + 2] };
};

const velOf = (i: number) => {
  const v = lastPosted().satVel!;

  return { x: v[i * 3], y: v[i * 3 + 1], z: v[i * 3 + 2] };
};

const loadLandObjects = (sites: { lat: number; lon: number; alt: number }[]) => {
  send({ typ: MSG_OBJ_DATA, dat: JSON.stringify(sites), seqNum: 1, fieldOfViewSetLength: 0 });
};

beforeEach(() => {
  vi.useFakeTimers();
  posted = [];
  globalThis.postMessage = vi.fn((payload: (typeof posted)[number]) => {
    posted.push(payload);
  }) as unknown as typeof globalThis.postMessage;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('updateLandObject (WGS84, row PC1)', () => {
  const gmst0 = 0 as GreenwichMeanSiderealTime;

  it('puts a site at 45 N, 0 E, alt 0 at the hand-computed WGS84 point plus the 2.5 km buffer', () => {
    loadLandObjects([{ lat: 45, lon: 0, alt: 0 }]);
    updateLandObject(0, gmst0);
    const p = posOf(0);

    expect(GROUND_BUFFER_DISTANCE).toBe(2.5);
    expect(p.x).toBeCloseTo(4519.3586, 2);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(4489.1162, 2);
  });

  it('puts an equatorial site at a + 2.5 km', () => {
    loadLandObjects([{ lat: 0, lon: 0, alt: 0 }]);
    updateLandObject(0, gmst0);
    const p = posOf(0);

    expect(p.x).toBeCloseTo(6380.637, 2);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('puts a polar site at b + 2.5 km', () => {
    loadLandObjects([{ lat: 90, lon: 0, alt: 0 }]);
    updateLandObject(0, gmst0);
    const p = posOf(0);

    expect(Math.hypot(p.x, p.y)).toBeCloseTo(0, 2);
    expect(p.z).toBeCloseTo(6359.2523, 2);
  });

  it('equals llaRad2eci of the site raised by the buffer, including site altitude, longitude and gmst', () => {
    loadLandObjects([{ lat: -33.5, lon: 151.2, alt: 0.4 }]);
    const gmst = 1.234 as GreenwichMeanSiderealTime;

    updateLandObject(0, gmst);
    const p = posOf(0);
    const expected = llaRad2eci({ lat: (-33.5 * DEG2RAD) as Radians, lon: (151.2 * DEG2RAD) as Radians, alt: (0.4 + 2.5) as Kilometers }, gmst);

    expect(p.x).toBeCloseTo(expected.x, 2);
    expect(p.y).toBeCloseTo(expected.y, 2);
    expect(p.z).toBeCloseTo(expected.z, 2);
  });
});

describe('missileLlaDegToEci (rows PC2, PC3)', () => {
  it('takes degrees and matches the hand-computed WGS84 point at 45 N, gmst 0', () => {
    const p = missileLlaDegToEci(45, 0, 0, 0);

    expect(p.x).toBeCloseTo(4517.5909, 3);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(4487.3484, 3);
  });

  it('rotates by gmst in the same sense as the old lla2eci', () => {
    const p = missileLlaDegToEci(0, 30, 0, Math.PI / 6);
    const old = lla2eci({ lat: 0 as Radians, lon: (30 * DEG2RAD) as Radians, alt: 0 as Kilometers }, (Math.PI / 6) as GreenwichMeanSiderealTime);

    expect(Math.atan2(p.y, p.x)).toBeCloseTo(Math.atan2(old.y, old.x), 12);
    expect(Math.atan2(p.y, p.x)).toBeCloseTo(Math.PI / 3, 12);
  });
});

describe('updateMissile velocity (row PC3: no spike from mixing sphere and ellipsoid)', () => {
  // 600 s trajectory at 1 Hz from 40 N to 50 N along lon 10 E, apex 300 km. Ground speed about
  // 1.85 km/s, peak climb rate about 1.6 km/s, so the per-second displacement stays near 2-3 km.
  const N_POINTS = 601;
  const latList = Array.from({ length: N_POINTS }, (_, t) => 40 + (10 * t) / 600);
  const lonList = Array.from({ length: N_POINTS }, () => 10);
  const altList = Array.from({ length: N_POINTS }, (_, t) => 300 * Math.sin((Math.PI * t) / 600));
  const startTime = Date.UTC(2026, 10, 25, 0, 0, 0);
  const EARTH_RATE = 7.2921159e-5;

  const loadMissile = () => {
    loadLandObjects([{ lat: 1, lon: 0, alt: 0 }]);
    send({ typ: MSG_NEW_MISSILE, id: 0, active: true, latList, lonList, altList, startTime });
  };

  it('keeps the velocity magnitude between 1 and 4 km per step for the whole flight', () => {
    loadMissile();
    const gmst0 = 0.7;
    const mags: number[] = [];

    for (let t = 0; t <= 590; t++) {
      const gmst = gmst0 + EARTH_RATE * t;

      updateMissile(0, new Date(startTime + t * 1000), gmst + EARTH_RATE, gmst as GreenwichMeanSiderealTime);
      if (t >= 2) {
        const v = velOf(0);

        mags.push(Math.hypot(v.x, v.y, v.z));
      }
    }

    expect(Math.min(...mags)).toBeGreaterThan(1);
    expect(Math.max(...mags)).toBeLessThan(4);
  });

  it('would spike by about 20 km if the look-ahead sample stayed on the 6371 km sphere', () => {
    // Guard on the hazard itself: the WGS84 point and the spherical point for the same sample at
    // 45 N differ by about 21.7 km (AUDIT reference table), far above the 4 km bound above.
    const wgs = missileLlaDegToEci(45, 10, 100, 0);
    const sph = lla2eci({ lat: (45 * DEG2RAD) as Radians, lon: (10 * DEG2RAD) as Radians, alt: 100 as Kilometers }, 0 as GreenwichMeanSiderealTime);

    expect(Math.hypot(wgs.x - sph.x, wgs.y - sph.y, wgs.z - sph.z)).toBeGreaterThan(20);
  });

  it('writes the WGS84 interpolated position and resets velocity at the first point', () => {
    loadMissile();
    updateMissile(0, new Date(startTime), 0.7 + EARTH_RATE, 0.7 as GreenwichMeanSiderealTime);
    const p = posOf(0);
    const expected = missileLlaDegToEci(40, 10, 0, 0.7);
    const v = velOf(0);

    expect(p.x).toBeCloseTo(expected.x, 2);
    expect(p.y).toBeCloseTo(expected.y, 2);
    expect(p.z).toBeCloseTo(expected.z, 2);
    expect([v.x, v.y, v.z]).toEqual([0, 0, 0]);
  });
});

describe('missileInViewFlag', () => {
  const ecf = { x: 7000, y: 0, z: 0 } as never;
  const sensor = (inFov: boolean) => ({
    llaRad: () => ({ lat: 0 as Radians, lon: 0 as Radians, alt: 0 as Kilometers }),
    isRaeInFov: vi.fn(() => inFov),
  });

  it('is 0 with no sensors, even when the flag was 1', () => {
    expect(missileInViewFlag(1, [], ecf)).toBe(0);
  });

  it('is 1 when any sensor sees the missile, and stops testing after the first hit', () => {
    const miss = sensor(false);
    const hit = sensor(true);
    const after = sensor(false);

    expect(missileInViewFlag(0, [miss, hit, after], ecf)).toBe(1);
    expect(after.isRaeInFov).not.toHaveBeenCalled();
  });

  it('keeps a flag already at 1 without testing, and is 0 when no sensor sees it', () => {
    const s = sensor(false);

    expect(missileInViewFlag(1, [s], ecf)).toBe(1);
    expect(s.isRaeInFov).not.toHaveBeenCalled();
    expect(missileInViewFlag(0, [s], ecf)).toBe(0);
  });
});

describe('updateMissile guards', () => {
  it('returns false and zeroes the position for an inactive missile, and false without trajectory lists', () => {
    send({
      typ: MSG_OBJ_DATA,
      dat: JSON.stringify([
        { lat: 1, lon: 0, alt: 0 },
        { lat: 1, lon: 0, alt: 0 },
      ]),
      seqNum: 1,
      fieldOfViewSetLength: 0,
    });
    send({ typ: MSG_NEW_MISSILE, id: 0, active: false, latList: [1], lonList: [1], altList: [1], startTime: 0 });
    send({ typ: MSG_NEW_MISSILE, id: 1, active: true, startTime: 0 });

    expect(updateMissile(0, new Date(0), 0, 0 as GreenwichMeanSiderealTime)).toBe(false);
    expect(updateMissile(1, new Date(0), 0, 0 as GreenwichMeanSiderealTime)).toBe(false);
  });
});

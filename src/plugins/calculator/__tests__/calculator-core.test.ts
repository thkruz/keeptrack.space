import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import {
  ConversionContext,
  CoordFrame,
  frameInputToJ2000,
  inputHasVelocity,
  j2000ToAllFrames,
  j2000ToFrameValues,
  validateFrameInput,
} from '@app/plugins/calculator/calculator-core';
import { Degrees, EpochUTC, Kilometers, RaeVec3, rae2eci, TEME, Vector3D } from '@ootk/src/main';

/** A fixed, sensor-free context. RAE paths are exercised separately. */
const ctx = (): ConversionContext => {
  const date = new Date('2025-01-01T00:00:00.000Z');

  return { epoch: EpochUTC.fromDateTime(date), date, gmst: 0, sensor: null };
};

describe('validateFrameInput', () => {
  it('rejects non-finite numbers in any frame', () => {
    expect(validateFrameInput(CoordFrame.J2000, { x: NaN, y: 0, z: 0 })).toBe('invalidNumber');
    expect(validateFrameInput(CoordFrame.J2000, { x: Infinity, y: 0, z: 0 })).toBe('invalidNumber');
  });

  it('rejects out-of-range Classical elements', () => {
    expect(validateFrameInput(CoordFrame.CLASSICAL, { sma: 7000, ecc: 1, inc: 0, raan: 0, argpe: 0, nu: 0 })).toBe('badEccentricity');
    expect(validateFrameInput(CoordFrame.CLASSICAL, { sma: 0, ecc: 0.1, inc: 0, raan: 0, argpe: 0, nu: 0 })).toBe('badSemiMajorAxis');
  });

  it('accepts valid input', () => {
    expect(validateFrameInput(CoordFrame.J2000, { x: 6778, y: 0, z: 0 })).toBeNull();
    expect(validateFrameInput(CoordFrame.CLASSICAL, { sma: 7000, ecc: 0.001, inc: 51.6, raan: 0, argpe: 0, nu: 0 })).toBeNull();
  });
});

describe('frameInputToJ2000 + j2000ToAllFrames', () => {
  it('round-trips a J2000 position through every other frame', () => {
    const j2000 = frameInputToJ2000(CoordFrame.J2000, { x: 6778, y: 100, z: 200, vx: 0, vy: 7.5, vz: 1 }, ctx());
    const out = j2000ToAllFrames(j2000, CoordFrame.J2000, ctx(), true);

    // The input frame is never echoed back.
    expect(out.j2000).toBeUndefined();
    // Every other frame is computed.
    expect(out.itrf).toBeDefined();
    expect(out.teme).toBeDefined();
    expect(out.lla).toBeDefined();
    expect(out.radec).toBeDefined();
    expect(out.classical).not.toBe('needsVelocity');
  });

  it('reports needsVelocity when the state has no usable velocity', () => {
    const j2000 = frameInputToJ2000(CoordFrame.J2000, { x: 6778, y: 0, z: 0 }, ctx());
    const out = j2000ToAllFrames(j2000, CoordFrame.J2000, ctx(), false);

    expect(out.classical).toBe('needsVelocity');
  });

  it('returns null RAE output when no sensor is present', () => {
    const j2000 = frameInputToJ2000(CoordFrame.J2000, { x: 6778, y: 0, z: 0 }, ctx());
    const out = j2000ToAllFrames(j2000, CoordFrame.J2000, ctx(), false);

    expect(out.rae).toBeNull();
  });

  it('throws a localizable key for RAE input without a sensor', () => {
    expect(() => frameInputToJ2000(CoordFrame.RAE, { r: 3000, a: 45, e: 30 }, ctx())).toThrow('noSensorForRae');
  });

  it('converts Classical input into a usable J2000 state', () => {
    const j2000 = frameInputToJ2000(CoordFrame.CLASSICAL, { sma: 6778 as Kilometers, ecc: 0.001, inc: 51.6, raan: 10, argpe: 20, nu: 30 }, ctx());

    expect(Number.isFinite(j2000.position.x)).toBe(true);
    expect(j2000.position.magnitude()).toBeGreaterThan(6000);
  });
});

describe('j2000ToFrameValues', () => {
  it('produces the input-field bag for the requested frame', () => {
    const j2000 = frameInputToJ2000(CoordFrame.J2000, { x: 6778, y: 100, z: 200, vx: 0, vy: 7.5, vz: 1 }, ctx());

    expect(Object.keys(j2000ToFrameValues(j2000, CoordFrame.J2000, ctx())).sort((a, b) => a.localeCompare(b))).toEqual(['vx', 'vy', 'vz', 'x', 'y', 'z']);
    expect(Object.keys(j2000ToFrameValues(j2000, CoordFrame.LLA, ctx())).sort((a, b) => a.localeCompare(b))).toEqual(['alt', 'lat', 'lon']);
    expect(Object.keys(j2000ToFrameValues(j2000, CoordFrame.CLASSICAL, ctx())).sort((a, b) => a.localeCompare(b))).toEqual(['argpe', 'ecc', 'inc', 'nu', 'raan', 'sma']);
  });

  it('throws for RAE without a sensor', () => {
    const j2000 = frameInputToJ2000(CoordFrame.J2000, { x: 6778, y: 0, z: 0 }, ctx());

    expect(() => j2000ToFrameValues(j2000, CoordFrame.RAE, ctx())).toThrow('noSensorForRae');
  });
});

describe('position-only inputs', () => {
  it.each([
    ['ITRF', CoordFrame.ITRF, { x: 6778, y: 0, z: 0 }],
    ['Geodetic', CoordFrame.LLA, { lat: 0, lon: 0, alt: 400 }],
  ])('%s without velocity reads needsVelocity, not an Earth-rotation orbit', (_name, frame, values) => {
    const j2000 = frameInputToJ2000(frame, values, ctx());

    expect(j2000.velocity.magnitude()).toBe(0);
    const out = j2000ToAllFrames(j2000, frame, ctx(), inputHasVelocity(frame, values));

    expect(out.classical).toBe('needsVelocity');
    // Velocity is unknown (null) in every Cartesian output, never zero or an Earth-rotation term.
    for (const c of [out.j2000, out.itrf, out.teme].filter((v) => v !== undefined)) {
      expect([c.vx, c.vy, c.vz]).toEqual([null, null, null]);
    }
  });

  it('keeps the inertial velocity of an ITRF input that includes velocity', () => {
    const j2000 = frameInputToJ2000(CoordFrame.ITRF, { x: 6778, y: 0, z: 0, vx: 0, vy: 7.2, vz: 1 }, ctx());

    const out = j2000ToAllFrames(j2000, CoordFrame.ITRF, ctx(), true);

    expect(out.classical).not.toBe('needsVelocity');
    expect(typeof out.j2000?.vx).toBe('number');
    expect(typeof out.teme?.vz).toBe('number');
  });
});

describe('explicit zero velocity', () => {
  it('a supplied 0, 0, 0 velocity is shown as 0 in every frame and computed as a supplied velocity', () => {
    const values = { x: 6778, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };

    expect(inputHasVelocity(CoordFrame.J2000, values)).toBe(true);
    const j2000 = frameInputToJ2000(CoordFrame.J2000, values, ctx());
    const out = j2000ToAllFrames(j2000, CoordFrame.J2000, ctx(), inputHasVelocity(CoordFrame.J2000, values));

    expect([out.teme?.vx, out.teme?.vy, out.teme?.vz].map((v) => typeof v)).toEqual(['number', 'number', 'number']);
    expect(Math.hypot(out.teme!.vx!, out.teme!.vy!, out.teme!.vz!)).toBeCloseTo(0, 9);
    // In ITRF the inertially fixed point moves backwards with Earth rotation (omega x r ~ 0.49 km/s).
    expect(Math.hypot(out.itrf!.vx!, out.itrf!.vy!, out.itrf!.vz!)).toBeCloseTo(7.2921159e-5 * 6778, 3);
    // Classical treats it as a supplied (radial, degenerate) velocity, not "needsVelocity".
    expect(out.classical).not.toBe('needsVelocity');
    const ce = out.classical as Exclude<typeof out.classical, 'needsVelocity' | undefined>;

    expect(ce.sma).toBeCloseTo(6778 / 2, 3);
    expect(ce.ecc).toBeCloseTo(1, 9);
  });

  it('an omitted velocity is position-only even though the internal placeholder is also zero', () => {
    const values = { x: 6778, y: 0, z: 0 };

    expect(inputHasVelocity(CoordFrame.J2000, values)).toBe(false);
    const out = j2000ToAllFrames(frameInputToJ2000(CoordFrame.J2000, values, ctx()), CoordFrame.J2000, ctx(), false);

    expect(out.teme?.vx).toBeNull();
    expect(out.classical).toBe('needsVelocity');
  });

  it('Classical input always carries a velocity; Geodetic, RAE and RA/Dec never do', () => {
    expect(inputHasVelocity(CoordFrame.CLASSICAL, { sma: 7000, ecc: 0, inc: 0, raan: 0, argpe: 0, nu: 0 })).toBe(true);
    expect(inputHasVelocity(CoordFrame.LLA, { lat: 0, lon: 0, alt: 400 })).toBe(false);
    expect(inputHasVelocity(CoordFrame.RAE, { r: 3000, a: 45, e: 30 })).toBe(false);
    expect(inputHasVelocity(CoordFrame.RADEC, { ra: 0, dec: 0, range: 7000 })).toBe(false);
  });
});

describe('RAE input (Westford 3000 km / az 45 / el 30 at 2026-03-20)', () => {
  const date = new Date('2026-03-20T12:00:00.000Z');
  const epoch = EpochUTC.fromDateTime(date);
  const lat = 42.6233;
  const lon = -71.4882;
  const alt = 0.131;
  const westford = new DetailedSensor({
    objName: 'MITMIL',
    name: 'Westford, Massachusetts',
    lat: lat as Degrees,
    lon: lon as Degrees,
    alt: alt as Kilometers,
    minAz: 0 as Degrees,
    maxAz: 360 as Degrees,
    minEl: 1 as Degrees,
    maxEl: 90 as Degrees,
    minRng: 200 as Kilometers,
    maxRng: 50000 as Kilometers,
  });
  const rae = { r: 3000, a: 45, e: 30 };
  const rCtx = (): ConversionContext => ({ epoch, date, gmst: epoch.gmstAngle(), sensor: westford });

  it('stores J2000 whose ITRF is the site plus the local east/north/up offset (WGS-84, by hand)', () => {
    const DEG = Math.PI / 180;
    const a = 6378.137;
    const f = 1 / 298.257223563;
    const e2 = f * (2 - f);
    const phi = lat * DEG;
    const lam = lon * DEG;
    const n = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const site = [(n + alt) * Math.cos(phi) * Math.cos(lam), (n + alt) * Math.cos(phi) * Math.sin(lam), (n * (1 - e2) + alt) * Math.sin(phi)];
    const east = rae.r * Math.cos(rae.e * DEG) * Math.sin(rae.a * DEG);
    const north = rae.r * Math.cos(rae.e * DEG) * Math.cos(rae.a * DEG);
    const up = rae.r * Math.sin(rae.e * DEG);
    const target = [
      site[0] - Math.sin(lam) * east - Math.sin(phi) * Math.cos(lam) * north + Math.cos(phi) * Math.cos(lam) * up,
      site[1] + Math.cos(lam) * east - Math.sin(phi) * Math.sin(lam) * north + Math.cos(phi) * Math.sin(lam) * up,
      site[2] + Math.cos(phi) * north + Math.sin(phi) * up,
    ];

    const itrf = frameInputToJ2000(CoordFrame.RAE, rae, rCtx()).toITRF();

    expect(Math.abs(itrf.position.x - target[0])).toBeLessThan(0.01);
    expect(Math.abs(itrf.position.y - target[1])).toBeLessThan(0.01);
    expect(Math.abs(itrf.position.z - target[2])).toBeLessThan(0.01);
  });

  it('matches the independent rae2eci (GMST, of date) -> TEME -> J2000 path, and differs from the raw of-date vector', () => {
    const j2000 = frameInputToJ2000(CoordFrame.RAE, rae, rCtx());
    const eci = rae2eci({ rng: rae.r, az: rae.a, el: rae.e } as RaeVec3<Kilometers, Degrees>, westford.lla(), epoch.gmstAngle());
    const viaTeme = new TEME(epoch, new Vector3D<Kilometers>(eci.x, eci.y, eci.z), Vector3D.origin as never).toJ2000();

    expect(j2000.position.subtract(viaTeme.position).magnitude()).toBeLessThan(0.01);
    // The of-date vector is several km off J2000 in 2026 (precession since 2000), which was the bug.
    expect(j2000.position.subtract(new Vector3D<Kilometers>(eci.x, eci.y, eci.z)).magnitude()).toBeGreaterThan(1);
  });

  it('is position-only (Classical reads needsVelocity) and RAE output round-trips', () => {
    const j2000 = frameInputToJ2000(CoordFrame.RAE, rae, rCtx());

    expect(j2000.velocity.magnitude()).toBe(0);
    expect(j2000ToAllFrames(j2000, CoordFrame.RAE, rCtx(), false).classical).toBe('needsVelocity');

    const back = j2000ToFrameValues(j2000, CoordFrame.RAE, rCtx());

    expect(back.r).toBeCloseTo(3000, 1);
    expect(back.a).toBeCloseTo(45, 2);
    expect(back.e).toBeCloseTo(30, 2);
  });
});

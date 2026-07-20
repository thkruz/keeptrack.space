import { ConversionContext, CoordFrame, frameInputToJ2000, j2000ToAllFrames, j2000ToFrameValues, validateFrameInput } from '@app/plugins/calculator/calculator-core';
import { EpochUTC, Kilometers } from '@ootk/src/main';

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
    const out = j2000ToAllFrames(j2000, CoordFrame.J2000, ctx());

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
    const out = j2000ToAllFrames(j2000, CoordFrame.J2000, ctx());

    expect(out.classical).toBe('needsVelocity');
  });

  it('returns null RAE output when no sensor is present', () => {
    const j2000 = frameInputToJ2000(CoordFrame.J2000, { x: 6778, y: 0, z: 0 }, ctx());
    const out = j2000ToAllFrames(j2000, CoordFrame.J2000, ctx());

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

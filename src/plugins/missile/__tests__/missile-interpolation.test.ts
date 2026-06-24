import { interpolateMissileSample, orbitLineSegment } from '@app/plugins/missile/missile-interpolation';

describe('interpolateMissileSample', () => {
  const lat = [0, 10, 20, 30];
  const lon = [0, 5, 10, 15];
  const alt = [100, 200, 300, 400];
  const start = 1_000_000;

  it('returns the exact sample on a whole-second boundary', () => {
    const s = interpolateMissileSample(lat, lon, alt, start, start + 2000);

    expect(s.lat).toBeCloseTo(20, 9);
    expect(s.lon).toBeCloseTo(10, 9);
    expect(s.alt).toBeCloseTo(300, 9);
  });

  it('blends linearly between two samples (the staircase fix)', () => {
    const s = interpolateMissileSample(lat, lon, alt, start, start + 1500); // halfway between idx 1 and 2

    expect(s.lat).toBeCloseTo(15, 9);
    expect(s.lon).toBeCloseTo(7.5, 9);
    expect(s.alt).toBeCloseTo(250, 9);
  });

  it('moves a fraction within a single second instead of snapping', () => {
    const a = interpolateMissileSample(lat, lon, alt, start, start + 1000);
    const b = interpolateMissileSample(lat, lon, alt, start, start + 1250);

    // A quarter-second later the position has advanced ~25% of one step, not 0 and not a full step.
    expect(b.lat - a.lat).toBeCloseTo(2.5, 9);
  });

  it('clamps before launch to the pad (sample 0)', () => {
    const s = interpolateMissileSample(lat, lon, alt, start, start - 5000);

    expect(s).toEqual({ lat: 0, lon: 0, alt: 100 });
  });

  it('clamps after impact to the final sample', () => {
    const s = interpolateMissileSample(lat, lon, alt, start, start + 999_999);

    expect(s).toEqual({ lat: 30, lon: 15, alt: 400 });
  });

  it('blends longitude along the shorter arc across the antimeridian', () => {
    // 179 -> -179 is a +2 deg step east, not a -358 deg sweep west.
    const s = interpolateMissileSample([0, 0], [179, -179], [100, 100], start, start + 500);

    expect(s.lon).toBeCloseTo(180, 9);
  });
});

describe('orbitLineSegment', () => {
  it('brackets a time with the line vertices and a fraction (matches drawMissileSegment_ sampling)', () => {
    // length 100, 10 segments => vertices at 0,10,20,...; idx 15 sits halfway in segment 1.
    expect(orbitLineSegment(100, 10, 15)).toEqual({ i0: 10, i1: 20, frac: 0.5 });
  });

  it('starts at the first vertex', () => {
    expect(orbitLineSegment(100, 10, 0)).toEqual({ i0: 0, i1: 10, frac: 0 });
  });

  it('clamps past the end to the final vertex', () => {
    const s = orbitLineSegment(100, 10, 9999);

    expect(s.i1).toBe(99);
    expect(s.frac).toBe(1);
  });

  it('works when there are more segments than samples (short trajectory)', () => {
    const s = orbitLineSegment(5, 255, 2.5);

    expect(s.i0).toBeLessThanOrEqual(2);
    expect(s.i1).toBeGreaterThanOrEqual(s.i0);
    expect(s.frac).toBeGreaterThanOrEqual(0);
    expect(s.frac).toBeLessThanOrEqual(1);
  });
});

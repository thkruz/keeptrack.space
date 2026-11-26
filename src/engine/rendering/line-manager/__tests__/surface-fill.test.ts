import { eci2lla, TemeVec3 } from '@ootk/src/main';
import { describe, expect, it } from 'vitest';
import { buildFillTriangles, liftedSurfacePoint, SURFACE_FILL_LIFT_KM, SURFACE_LINE_LIFT_KM, SurfaceLine } from '../surface-line';

/** Geodetic (WGS84) altitude of an ECEF point; gmst 0 makes eci2lla an ecef2lla. */
const geodeticAlt = (x: number, y: number, z: number): number => eci2lla({ x, y, z } as TemeVec3, 0).alt;

function ring(centerLat: number, centerLon: number, radiusDeg: number, n = 72): { lat: number; lon: number }[] {
  const pts: { lat: number; lon: number }[] = [];

  for (let i = 0; i <= n; i++) {
    const b = (i / n) * 2 * Math.PI;
    const lat = centerLat + radiusDeg * Math.cos(b);
    const lon = centerLon + (radiusDeg * Math.sin(b)) / Math.max(0.2, Math.cos((centerLat * Math.PI) / 180));

    pts.push({ lat, lon });
  }

  return pts;
}

describe('buildFillTriangles', () => {
  it('returns nothing for a degenerate ring', () => {
    expect(
      buildFillTriangles({ lat: 0, lon: 0 }, [
        { lat: 0, lon: 0 },
        { lat: 1, lon: 1 },
      ])
    ).toEqual([]);
  });

  it('emits whole triangles lifted above the WGS84 surface by the fill lift (within 1 m)', () => {
    const out = buildFillTriangles({ lat: 10, lon: 20 }, ring(10, 20, 8));

    expect(out.length % 12).toBe(0);
    expect(out.length).toBeGreaterThan(0);
    for (let i = 0; i < out.length; i += 4) {
      expect(Math.abs(geodeticAlt(out[i], out[i + 1], out[i + 2]) - SURFACE_FILL_LIFT_KM)).toBeLessThan(0.001);
      expect(out[i + 3]).toBe(1);
    }
  });

  it('keeps every triangle centroid above the WGS84 ellipsoid even for a large footprint', () => {
    const out = buildFillTriangles({ lat: 0, lon: 0 }, ring(0, 0, 60));

    for (let i = 0; i < out.length; i += 12) {
      const cx = (out[i] + out[i + 4] + out[i + 8]) / 3;
      const cy = (out[i + 1] + out[i + 5] + out[i + 9]) / 3;
      const cz = (out[i + 2] + out[i + 6] + out[i + 10]) / 3;

      expect(geodeticAlt(cx, cy, cz)).toBeGreaterThan(0.5);
    }
  });
});

describe('SurfaceLine.toEcef (WGS84, row SL1)', () => {
  it('matches the hand-computed WGS84 point at 45 N, 0 E with no lift', () => {
    // N = 6378.137 / sqrt(1 - e^2 / 2) = 6388.8383; x = N cos 45; z = N (1 - e^2) sin 45.
    const [x, y, z] = SurfaceLine.toEcef({ lat: 45, lon: 0 }, 0);

    expect(x).toBeCloseTo(4517.5909, 3);
    expect(y).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(4487.3484, 3);
  });

  it('puts the equator at a + lift and the pole at b + lift', () => {
    expect(SurfaceLine.toEcef({ lat: 0, lon: 90 })[1]).toBeCloseTo(6378.137 + SURFACE_LINE_LIFT_KM, 6);
    expect(SurfaceLine.toEcef({ lat: 90, lon: 0 })[2]).toBeCloseTo(6356.752314 + SURFACE_LINE_LIFT_KM, 5);
  });

  it('gives eci2lla altitude = lift within 1 m and recovers lat/lon', () => {
    for (const p of [
      { lat: -62.5, lon: -140 },
      { lat: 12, lon: 33 },
      { lat: 78, lon: 170 },
    ]) {
      const [x, y, z] = SurfaceLine.toEcef(p);
      const lla = eci2lla({ x, y, z } as TemeVec3, 0);

      expect(Math.abs(lla.alt - SURFACE_LINE_LIFT_KM)).toBeLessThan(0.001);
      expect(lla.lat).toBeCloseTo(p.lat, 6);
      expect(lla.lon).toBeCloseTo(p.lon, 6);
    }
  });
});

describe('liftedSurfacePoint', () => {
  it('returns toEcef(p, lift) for the direction of toEcef(p, 0)', () => {
    const p = { lat: 45, lon: 20 };
    const s0 = SurfaceLine.toEcef(p, 0);
    const n = Math.hypot(...s0);
    const lifted = liftedSurfacePoint([s0[0] / n, s0[1] / n, s0[2] / n], 4);
    const expected = SurfaceLine.toEcef(p, 4);

    for (let i = 0; i < 3; i++) {
      expect(lifted[i]).toBeCloseTo(expected[i], 6);
    }
  });
});

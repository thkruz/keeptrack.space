import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { describe, expect, it } from 'vitest';
import { buildFillTriangles, SURFACE_FILL_LIFT_KM } from '../surface-line';

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

  it('emits whole triangles lifted above the surface', () => {
    const out = buildFillTriangles({ lat: 10, lon: 20 }, ring(10, 20, 8));

    expect(out.length % 12).toBe(0);
    expect(out.length).toBeGreaterThan(0);
    for (let i = 0; i < out.length; i += 4) {
      expect(Math.hypot(out[i], out[i + 1], out[i + 2])).toBeCloseTo(RADIUS_OF_EARTH + SURFACE_FILL_LIFT_KM, 3);
      expect(out[i + 3]).toBe(1);
    }
  });

  it('keeps every triangle centroid above the Earth sphere even for a large footprint', () => {
    const out = buildFillTriangles({ lat: 0, lon: 0 }, ring(0, 0, 60));

    for (let i = 0; i < out.length; i += 12) {
      const cx = (out[i] + out[i + 4] + out[i + 8]) / 3;
      const cy = (out[i + 1] + out[i + 5] + out[i + 9]) / 3;
      const cz = (out[i + 2] + out[i + 6] + out[i + 10]) / 3;

      expect(Math.hypot(cx, cy, cz)).toBeGreaterThan(RADIUS_OF_EARTH + 0.5);
    }
  });
});

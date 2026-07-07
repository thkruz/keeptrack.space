import { describe, expect, it } from 'vitest';
import { rebaseToAnchor, rotateEcefToEciZ } from '../orbit-anchor-math';

const f32 = Math.fround;
const mag = (v: readonly number[]): number => Math.hypot(v[0], v[1], v[2]);

describe('orbit-anchor-math', () => {
  describe('rebaseToAnchor', () => {
    it('uses the first vertex as the anchor and stores it as the zero vector', () => {
      const { pointsOut, anchor } = rebaseToAnchor([42164, 100, -50, 1, 42264, 90, -40, 0.5]);

      expect(anchor).toEqual([42164, 100, -50]);
      expect([pointsOut[0], pointsOut[1], pointsOut[2]]).toEqual([0, 0, 0]);
      expect(pointsOut[3]).toBe(1); // head alpha preserved
    });

    it('rebases every vertex relative to the anchor and copies alpha through', () => {
      const { pointsOut } = rebaseToAnchor([1000, 2000, 3000, 1, 1100, 2200, 3300, 0.25]);

      expect([pointsOut[4], pointsOut[5], pointsOut[6], pointsOut[7]]).toEqual([100, 200, 300, 0.25]);
    });

    it('falls back to a zero anchor when the first vertex is non-finite', () => {
      const { pointsOut, anchor } = rebaseToAnchor([NaN, 0, 0, 1, 1, 2, 3, 1]);

      // Zero anchor => the buffer stays an absolute copy (no NaN poisoning).
      expect(anchor).toEqual([0, 0, 0]);
      expect([pointsOut[4], pointsOut[5], pointsOut[6]]).toEqual([1, 2, 3]);
    });

    it('survives the float32 buffer with sub-mm error, unlike an absolute float32 store', () => {
      // A GEO-magnitude anchor with a vertex ~1.5k km away along the ECF analemma.
      const anchorPt = [42164.123, 105.5, -37.25];
      const farPt = [42163.777, 1505.5, -900.0];
      const { pointsOut, anchor } = rebaseToAnchor([...anchorPt, 1, ...farPt, 1]);

      // Reconstruct in float64 from the float32 RELATIVE vertex + the float64 anchor.
      const recon = [f32(pointsOut[4]) + anchor[0], f32(pointsOut[5]) + anchor[1], f32(pointsOut[6]) + anchor[2]];
      const anchorRelErr = Math.hypot(recon[0] - farPt[0], recon[1] - farPt[1], recon[2] - farPt[2]);

      // The old path stored the ABSOLUTE value straight into float32.
      const absErr = Math.hypot(f32(farPt[0]) - farPt[0], f32(farPt[1]) - farPt[1], f32(farPt[2]) - farPt[2]);

      expect(anchorRelErr).toBeLessThan(0.001); // sub-millimetre
      expect(absErr).toBeGreaterThan(anchorRelErr * 100); // metre-scale float32 quantization at 42164 km
    });
  });

  describe('rotateEcefToEciZ', () => {
    it('round-trips to identity when rotated back by -gmst', () => {
      const gmst = 1.2345;
      const [x, y, z] = rotateEcefToEciZ(42164, 1200, -900, Math.cos(gmst), Math.sin(gmst));
      const [bx, by, bz] = rotateEcefToEciZ(x, y, z, Math.cos(-gmst), Math.sin(-gmst));

      expect(bx).toBeCloseTo(42164, 6);
      expect(by).toBeCloseTo(1200, 6);
      expect(bz).toBeCloseTo(-900, 6);
    });

    it('leaves z untouched (rotation is about the Z axis)', () => {
      const [, , z] = rotateEcefToEciZ(1, 2, 987.6, 0.3, 0.7);

      expect(z).toBe(987.6);
    });

    it('preserves vector magnitude', () => {
      const gmst = 2.7;
      const rotated = rotateEcefToEciZ(42164, 1200, -900, Math.cos(gmst), Math.sin(gmst));

      expect(mag(rotated)).toBeCloseTo(mag([42164, 1200, -900]), 6);
    });
  });

  describe('precision property: anchor-relative render is frame-stable', () => {
    // Emulate the vertex shader's two render paths in float32, the way the GPU
    // runs them, and compare their frame-to-frame jitter for a GEO orbit vertex.
    const EARTH_ROT_RAD_PER_S = 7.2921159e-5;
    const dGmst = EARTH_ROT_RAD_PER_S / 60; // one 1x frame of Earth rotation at 60 fps
    const gmst0 = 1.0;

    const anchorEcef: [number, number, number] = [42164, 0, 0];
    const vertexEcef: [number, number, number] = [42120, 1200, -300]; // ~1.2k km from the anchor

    // NEW path: rotate the SMALL relative vertex in float32, then add the
    // float64-computed anchorLocal (worldShift centers the scene on the anchor,
    // so anchorLocal is ~0).
    const renderAnchorRelative = (gmst: number): [number, number, number] => {
      const c = f32(Math.cos(gmst));
      const s = f32(Math.sin(gmst));
      const anchorEciNow = rotateEcefToEciZ(anchorEcef[0], anchorEcef[1], anchorEcef[2], Math.cos(gmst), Math.sin(gmst));
      const anchorLocal = [f32(anchorEciNow[0] - anchorEciNow[0]), f32(anchorEciNow[1] - anchorEciNow[1]), f32(anchorEciNow[2] - anchorEciNow[2])];
      const rel = [f32(vertexEcef[0] - anchorEcef[0]), f32(vertexEcef[1] - anchorEcef[1]), f32(vertexEcef[2] - anchorEcef[2])];
      const rot = [f32(f32(rel[0] * c) - f32(rel[1] * s)), f32(f32(rel[0] * s) + f32(rel[1] * c)), f32(rel[2])];

      return [f32(rot[0] + anchorLocal[0]), f32(rot[1] + anchorLocal[1]), f32(rot[2] + anchorLocal[2])];
    };

    // OLD path: rotate the full ~42164 km ABSOLUTE vertex in float32, then add
    // the (float32) world offset - a catastrophic cancellation whose rounding
    // re-rolls every frame.
    const renderAbsoluteF32 = (gmst: number): [number, number, number] => {
      const c = f32(Math.cos(gmst));
      const s = f32(Math.sin(gmst));
      const anchorEciNow = rotateEcefToEciZ(anchorEcef[0], anchorEcef[1], anchorEcef[2], Math.cos(gmst), Math.sin(gmst));
      const worldOffset = [f32(-anchorEciNow[0]), f32(-anchorEciNow[1]), f32(-anchorEciNow[2])];
      const v = [f32(vertexEcef[0]), f32(vertexEcef[1]), f32(vertexEcef[2])];
      const rot = [f32(f32(v[0] * c) - f32(v[1] * s)), f32(f32(v[0] * s) + f32(v[1] * c)), f32(v[2])];

      return [f32(rot[0] + worldOffset[0]), f32(rot[1] + worldOffset[1]), f32(rot[2] + worldOffset[2])];
    };

    // Second difference removes the smooth sweep, leaving the float32 jitter.
    const jitter = (render: (g: number) => [number, number, number]): number => {
      const a = render(gmst0 - dGmst);
      const b = render(gmst0);
      const c = render(gmst0 + dGmst);

      return Math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1], a[2] - 2 * b[2] + c[2]);
    };

    it('anchor-relative jitters far less than the absolute float32 path', () => {
      const anchorJitter = jitter(renderAnchorRelative);
      const absJitter = jitter(renderAbsoluteF32);

      // The anchor path keeps sub-metre stability; the absolute path is metre-scale.
      expect(anchorJitter).toBeLessThan(1);
      expect(absJitter).toBeGreaterThan(anchorJitter * 5);
    });
  });
});

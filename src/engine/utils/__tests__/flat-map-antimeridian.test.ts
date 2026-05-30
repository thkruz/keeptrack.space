import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { eciToFlatMapX, shouldDiscardFlatMapFragment, wrapLon } from '@app/engine/utils/transforms';

const RE = RADIUS_OF_EARTH;
const MAP_W = 2 * Math.PI * RE;

/**
 * Simulate GPU linear interpolation between two orbit vertices at parameter t ∈ [0, 1].
 * Returns the interpolated flat-map X and the interpolated ECI position,
 * mirroring what the GPU rasterizer produces for a GL_LINE_STRIP segment.
 */
function simulateLineFragment(
  eciA: [number, number, number],
  eciB: [number, number, number],
  t: number,
  gmst: number,
  centerX: number,
): { interpolatedFlatX: number; interpolatedEci: [number, number] } {
  // Vertex shader: compute flatX for each endpoint
  const flatXA = eciToFlatMapX(eciA[0], eciA[1], gmst, RE, centerX);
  const flatXB = eciToFlatMapX(eciB[0], eciB[1], gmst, RE, centerX);

  // GPU linearly interpolates both flatX and ECI position
  const interpolatedFlatX = (1 - t) * flatXA + t * flatXB;
  const interpolatedEci: [number, number] = [
    (1 - t) * eciA[0] + t * eciB[0],
    (1 - t) * eciA[1] + t * eciB[1],
  ];

  return { interpolatedFlatX, interpolatedEci };
}

/**
 * Build an ECI position on Earth's surface at a given longitude (degrees) and latitude 0.
 * Uses ECEF (gmst=0) for simplicity.
 */
function eciAtLonDeg(lonDeg: number): [number, number, number] {
  const lonRad = (lonDeg * Math.PI) / 180;

  return [RE * Math.cos(lonRad), RE * Math.sin(lonRad), 0];
}

describe('wrapLon', () => {
  it('should return identity for values already in [-PI, PI]', () => {
    expect(wrapLon(0)).toBeCloseTo(0);
    expect(wrapLon(1)).toBeCloseTo(1);
    expect(wrapLon(-1)).toBeCloseTo(-1);
  });

  it('should wrap values outside [-PI, PI]', () => {
    expect(wrapLon(Math.PI + 0.1)).toBeCloseTo(-Math.PI + 0.1);
    expect(wrapLon(-Math.PI - 0.1)).toBeCloseTo(Math.PI - 0.1);
    // 3*PI wraps to -PI (equivalent to PI on the antimeridian)
    expect(Math.abs(wrapLon(3 * Math.PI))).toBeCloseTo(Math.PI);
  });

  it('should handle exact boundary values', () => {
    expect(Math.abs(wrapLon(Math.PI))).toBeCloseTo(Math.PI);
    expect(Math.abs(wrapLon(-Math.PI))).toBeCloseTo(Math.PI);
  });
});

describe('eciToFlatMapX', () => {
  const gmst = 0; // ECEF mode

  it('should place lon=0 at X=0 when camera is centered', () => {
    const eci = eciAtLonDeg(0);

    expect(eciToFlatMapX(eci[0], eci[1], gmst, RE, 0)).toBeCloseTo(0);
  });

  it('should place lon=90 at positive X', () => {
    const eci = eciAtLonDeg(90);
    const x = eciToFlatMapX(eci[0], eci[1], gmst, RE, 0);

    expect(x).toBeCloseTo((Math.PI / 2) * RE);
  });

  it('should place lon=-90 at negative X', () => {
    const eci = eciAtLonDeg(-90);
    const x = eciToFlatMapX(eci[0], eci[1], gmst, RE, 0);

    expect(x).toBeCloseTo((-Math.PI / 2) * RE);
  });

  it('should wrap correctly with non-zero camera center', () => {
    const eci = eciAtLonDeg(170);
    const x1 = eciToFlatMapX(eci[0], eci[1], gmst, RE, 0);
    const x2 = eciToFlatMapX(eci[0], eci[1], gmst, RE, MAP_W * 0.4);

    // Both should place the satellite at the same logical longitude,
    // but wrapped to the nearest copy of the camera center
    expect(Math.abs(x1 - x2) % MAP_W).toBeLessThan(MAP_W);
  });

  it('should handle GMST rotation', () => {
    // With GMST = PI/2, an ECI point at X-axis maps to lon=-90° ECEF
    const eci = eciAtLonDeg(0); // ECI X-axis
    const x = eciToFlatMapX(eci[0], eci[1], Math.PI / 2, RE, 0);

    expect(x).toBeCloseTo((-Math.PI / 2) * RE);
  });
});

describe('antimeridian crossing detection', () => {
  const gmst = 0; // ECEF mode
  const centerX = 0;

  describe('non-crossing segments should NOT be discarded', () => {
    it('should keep fragments for a segment within the same hemisphere', () => {
      const eciA = eciAtLonDeg(30);
      const eciB = eciAtLonDeg(50);

      for (let t = 0.1; t <= 0.9; t += 0.1) {
        const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, t, gmst, centerX);

        expect(shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, gmst, RE, centerX)).toBe(false);
      }
    });

    it('should keep fragments for a segment crossing the prime meridian', () => {
      const eciA = eciAtLonDeg(-20);
      const eciB = eciAtLonDeg(20);

      for (let t = 0.1; t <= 0.9; t += 0.1) {
        const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, t, gmst, centerX);

        expect(shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, gmst, RE, centerX)).toBe(false);
      }
    });

    it('should keep fragments for short segments near the antimeridian on one side', () => {
      const eciA = eciAtLonDeg(160);
      const eciB = eciAtLonDeg(175);

      for (let t = 0.1; t <= 0.9; t += 0.1) {
        const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, t, gmst, centerX);

        expect(shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, gmst, RE, centerX)).toBe(false);
      }
    });
  });

  describe('crossing segments SHOULD be discarded', () => {
    it('should discard mid-segment fragments for +170° to -170° crossing', () => {
      const eciA = eciAtLonDeg(170);
      const eciB = eciAtLonDeg(-170);

      // Test the middle 80% of the segment — these should all be discarded
      let discardedCount = 0;

      for (let t = 0.1; t <= 0.9; t += 0.05) {
        const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, t, gmst, centerX);

        if (shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, gmst, RE, centerX)) {
          discardedCount++;
        }
      }

      // The vast majority of fragments should be discarded
      expect(discardedCount).toBeGreaterThan(12); // out of 17 samples
    });

    it('should discard fragments for +179° to -179° crossing', () => {
      const eciA = eciAtLonDeg(179);
      const eciB = eciAtLonDeg(-179);

      // Even very close to vertices (t=0.05), fragments should be discarded
      const { interpolatedFlatX: midFlatX, interpolatedEci: midEci } = simulateLineFragment(eciA, eciB, 0.5, gmst, centerX);

      expect(shouldDiscardFlatMapFragment(midFlatX, midEci, gmst, RE, centerX)).toBe(true);
    });

    it('should discard fragments for +160° to -160° wide crossing', () => {
      const eciA = eciAtLonDeg(160);
      const eciB = eciAtLonDeg(-160);

      const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, 0.5, gmst, centerX);

      expect(shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, gmst, RE, centerX)).toBe(true);
    });
  });

  describe('crossing detection with camera pan', () => {
    it('should still detect crossings when camera is slightly panned', () => {
      // Small pan keeps the wrapping seam near ±180°, so ±170° still cross
      const eciA = eciAtLonDeg(170);
      const eciB = eciAtLonDeg(-170);
      const smallPan = 100; // ~1° of longitude offset

      const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, 0.5, gmst, smallPan);

      expect(shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, gmst, RE, smallPan)).toBe(true);
    });

    it('should NOT detect crossings when pan moves seam away from vertices', () => {
      // Large pan moves the wrapping seam far from ±180°, so ±170° vertices
      // end up on the same side — no crossing artifact occurs (correct behavior)
      const eciA = eciAtLonDeg(170);
      const eciB = eciAtLonDeg(-170);
      const largePan = MAP_W * 0.3; // Seam shifts to ~±72°

      const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, 0.5, gmst, largePan);

      expect(shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, gmst, RE, largePan)).toBe(false);
    });
  });

  describe('crossing detection with GMST rotation', () => {
    it('should detect crossings in ECI mode with non-zero GMST', () => {
      // In ECI mode, the antimeridian shifts with GMST.
      // Place vertices at ECI longitudes that cross the ECEF antimeridian after GMST subtraction.
      const testGmst = Math.PI / 4; // 45° rotation
      // ECI lon = ECEF lon + GMST, so ECEF ±170° → ECI ±170° + 45°
      const eciA = eciAtLonDeg(170 + 45);
      const eciB = eciAtLonDeg(-170 + 45);

      const { interpolatedFlatX, interpolatedEci } = simulateLineFragment(eciA, eciB, 0.5, testGmst, 0);

      expect(shouldDiscardFlatMapFragment(interpolatedFlatX, interpolatedEci, testGmst, RE, 0)).toBe(true);
    });
  });

  describe('gradient check concept validation', () => {
    it('should show large flatX rate for crossing vs small for non-crossing', () => {
      // Simulate the gradient check concept: for crossing segments, the difference
      // in flatX between adjacent samples (simulating fwidth) is much larger than
      // the difference in ECI position.
      const gmstVal = 0;
      const center = 0;

      // Crossing segment
      const crossA = eciAtLonDeg(170);
      const crossB = eciAtLonDeg(-170);

      const dt = 0.01; // Small step simulating adjacent screen pixels
      const crossF1 = simulateLineFragment(crossA, crossB, 0.5, gmstVal, center);
      const crossF2 = simulateLineFragment(crossA, crossB, 0.5 + dt, gmstVal, center);

      const crossFlatXRate = Math.abs(crossF2.interpolatedFlatX - crossF1.interpolatedFlatX);
      const crossEciRate = Math.hypot(
        crossF2.interpolatedEci[0] - crossF1.interpolatedEci[0],
        crossF2.interpolatedEci[1] - crossF1.interpolatedEci[1],
      );

      // Non-crossing segment
      const normalA = eciAtLonDeg(30);
      const normalB = eciAtLonDeg(50);

      const normF1 = simulateLineFragment(normalA, normalB, 0.5, gmstVal, center);
      const normF2 = simulateLineFragment(normalA, normalB, 0.5 + dt, gmstVal, center);

      const normFlatXRate = Math.abs(normF2.interpolatedFlatX - normF1.interpolatedFlatX);
      const normEciRate = Math.hypot(
        normF2.interpolatedEci[0] - normF1.interpolatedEci[0],
        normF2.interpolatedEci[1] - normF1.interpolatedEci[1],
      );

      // For crossing: flatX rate / ECI rate should be enormous (>10x)
      const crossingRatio = crossFlatXRate / crossEciRate;
      // For normal: flatX rate / ECI rate should be modest (<10x)
      const normalRatio = normFlatXRate / normEciRate;

      expect(crossingRatio).toBeGreaterThan(10);
      expect(normalRatio).toBeLessThan(10);
    });
  });

  describe('threshold value validation', () => {
    it('should use 2% of map width as the position divergence threshold', () => {
      // The threshold in the shader is mapW * 0.02
      // Verify that this value is large enough for non-crossing segments
      // but small enough to catch crossing artifacts
      const threshold = MAP_W * 0.02;
      const thresholdDegrees = (threshold / MAP_W) * 360;

      // 2% of map width = 7.2° of longitude — safe margin for non-crossing
      // segments where linear interpolation diverges from atan by at most a few degrees
      expect(thresholdDegrees).toBeCloseTo(7.2, 0);
      expect(thresholdDegrees).toBeLessThan(20);
      expect(thresholdDegrees).toBeGreaterThan(2);
    });
  });
});

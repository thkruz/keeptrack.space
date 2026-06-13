import { findTca, goldenSectionMin } from '@app/engine/math/tca-search';

describe('tca-search', () => {
  // Parabola with its minimum at t = 90s and value 5 km
  const parabola = (tMs: number): number => 5 + ((tMs - 90_000) / 60_000) ** 2;

  describe('goldenSectionMin', () => {
    it('converges on the minimum of a unimodal function', () => {
      const t = goldenSectionMin(parabola, 0, 300_000, 50);

      expect(Math.abs(t - 90_000)).toBeLessThanOrEqual(50);
    });
  });

  describe('findTca', () => {
    it('finds the global minimum below the coarse grid resolution', () => {
      const result = findTca(parabola, 0, 300_000, 60_000, 50);

      expect(result).not.toBeNull();
      expect(Math.abs(result!.tcaMs - 90_000)).toBeLessThanOrEqual(100);
      expect(result!.missKm).toBeCloseTo(5, 3);
    });

    it('finds a minimum sitting at the window end', () => {
      const decreasing = (tMs: number): number => 1000 - tMs / 1000;
      const result = findTca(decreasing, 0, 250_000, 60_000, 50);

      expect(result).not.toBeNull();
      expect(result!.tcaMs).toBeCloseTo(250_000, -3);
    });

    it('skips non-finite samples and still refines', () => {
      const spotty = (tMs: number): number => (tMs < 30_000 ? NaN : parabola(tMs));
      const result = findTca(spotty, 0, 300_000, 60_000, 50);

      expect(result).not.toBeNull();
      expect(Math.abs(result!.tcaMs - 90_000)).toBeLessThanOrEqual(100);
    });

    it('returns null when every sample fails or the window is invalid', () => {
      expect(findTca(() => NaN, 0, 300_000, 60_000)).toBeNull();
      expect(findTca(parabola, 100, 100, 60_000)).toBeNull();
      expect(findTca(parabola, 0, 300_000, 0)).toBeNull();
    });
  });
});

import { findApproachMinima, findTca, goldenSectionMin } from '@app/engine/conjunction/conjunction-tca';

describe('conjunction-tca: goldenSectionMin', () => {
  it('finds the minimum of a parabola', () => {
    expect(goldenSectionMin((x) => (x - 3) ** 2, 0, 10, 1e-6)).toBeCloseTo(3, 4);
  });

  it('tolerates reversed bounds', () => {
    expect(goldenSectionMin((x) => (x - 3) ** 2, 10, 0, 1e-6)).toBeCloseTo(3, 4);
  });
});

describe('conjunction-tca: findTca', () => {
  it('locates the global minimum and its miss distance', () => {
    // V-shaped separation bottoming at t = 5000 ms, miss = 2 km.
    const dist = (t: number) => Math.abs(t - 5000) / 1000 + 2;
    const res = findTca(dist, 0, 10000, 1000, 1);

    expect(res).not.toBeNull();
    expect(Math.abs(res!.tcaMs - 5000)).toBeLessThan(50);
    expect(res!.missKm).toBeCloseTo(2, 2);
  });

  it('returns null when every sample is non-finite', () => {
    expect(findTca(() => NaN, 0, 1000, 100)).toBeNull();
  });
});

describe('conjunction-tca: findApproachMinima', () => {
  it('finds every local minimum, refined below the coarse grid', () => {
    // dist = 10 + cos(2π t / period): minima (cos = -1, dist = 9) every period.
    const period = 6000;
    const dist = (t: number) => 10 + Math.cos((2 * Math.PI * t) / period);
    const minima = findApproachMinima(dist, 4 * period, 100, 1);

    expect(minima.length).toBeGreaterThanOrEqual(3);
    for (const m of minima) {
      expect(m.missKm).toBeCloseTo(9, 1);
    }
  });

  it('returns nothing for a monotonic function', () => {
    expect(findApproachMinima((t) => t, 10000, 100)).toHaveLength(0);
  });
});

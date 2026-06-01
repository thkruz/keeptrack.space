import { CatalogManager } from '@app/app/data/catalog-manager';
import { Satellite } from '@ootk/src/main';

/*
 * The orbital-density math (mean-altitude binning + spherical-shell density)
 * is pure given a satellite array but lives in private methods, so it is
 * reached here via a typed cast on a bare CatalogManager instance.
 */
describe('CatalogManager orbital-density math', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cm: any;

  beforeEach(() => {
    cm = new CatalogManager();
  });

  const sat = (id: number, apogee: number, perigee: number): Satellite => ({
    id, sccNum: id.toString(), apogee, perigee,
  }) as unknown as Satellite;

  describe('calculateEffectiveAltitude_', () => {
    it('returns the mean of apogee and perigee', () => {
      expect(cm.calculateEffectiveAltitude_(sat(0, 400, 200))).toBe(300);
    });
  });

  describe('calculateOrbitalDensity_', () => {
    it('produces the fixed 75-2000 km bin set (25 km bins)', () => {
      const bins = cm.calculateOrbitalDensity_([], 25);

      // (2000 - 75) / 25 = 77 bins.
      expect(bins).toHaveLength(77);
      expect(bins[0].minAltitude).toBe(75);
      expect(bins[0].maxAltitude).toBe(100);
    });

    it('counts a satellite into the bin matching its mean altitude', () => {
      // Mean altitude 100 -> binIndex (100-75)/25 = 1.
      const bins = cm.calculateOrbitalDensity_([sat(1, 100, 100)], 25);

      expect(bins[1].minAltitude).toBe(100);
      expect(bins[1].count).toBe(1);
    });

    it('computes spatial density as count / spherical-shell volume', () => {
      const bins = cm.calculateOrbitalDensity_([sat(1, 100, 100)], 25);
      const inner = 6371 + bins[1].minAltitude;
      const outer = 6371 + bins[1].maxAltitude;
      const volume = (4 / 3) * Math.PI * (outer ** 3 - inner ** 3);

      expect(bins[1].density).toBeCloseTo(1 / volume, 20);
    });

    it('ignores satellites whose altitude falls outside the bin range', () => {
      // Mean altitude 5000 km is beyond the 2000 km cap -> not counted anywhere.
      const bins = cm.calculateOrbitalDensity_([sat(1, 5000, 5000)], 25);
      const total = bins.reduce((acc: number, b: { count: number }) => acc + b.count, 0);

      expect(total).toBe(0);
    });
  });
});

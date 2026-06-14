import { Degrees, Hours, Minutes, Satellite } from '@ootk/src/main';
import {
  LookAngleResolver,
  filterByArgOfPerigee,
  filterByInclination,
  filterByLookAngle,
  filterByObjType,
  filterByPeriod,
  filterByRcs,
  filterByRightAscension,
  filterByTleAge,
} from '@app/plugins/find-sat/find-sat-filters';

/** Minimal satellite-like stub for the pure predicate tests. */
const sat = (props: Partial<Satellite> & { id: number }): Satellite => ({
  isSatellite: () => true,
  isMissile: () => false,
  ...props,
} as unknown as Satellite);

describe('find-sat-filters', () => {
  describe('filterByObjType', () => {
    it('keeps only objects whose type is in the list', () => {
      const sats = [sat({ id: 1, type: 1 }), sat({ id: 2, type: 2 }), sat({ id: 3, type: 3 })];

      expect(filterByObjType(sats, [1, 3]).map((s) => s.id)).toEqual([1, 3]);
    });
  });

  describe('range predicates use exclusive bounds', () => {
    it('filterByInclination excludes the exact bounds', () => {
      const sats = [sat({ id: 1, inclination: 50 as Degrees }), sat({ id: 2, inclination: 51 as Degrees }), sat({ id: 3, inclination: 52 as Degrees })];

      expect(filterByInclination(sats, 50 as Degrees, 52 as Degrees).map((s) => s.id)).toEqual([2]);
    });

    it('filterByRightAscension filters on rightAscension', () => {
      const sats = [sat({ id: 1, rightAscension: 10 as Degrees }), sat({ id: 2, rightAscension: 200 as Degrees })];

      expect(filterByRightAscension(sats, 100 as Degrees, 300 as Degrees).map((s) => s.id)).toEqual([2]);
    });

    it('filterByArgOfPerigee filters on argOfPerigee', () => {
      const sats = [sat({ id: 1, argOfPerigee: 10 as Degrees }), sat({ id: 2, argOfPerigee: 90 as Degrees })];

      expect(filterByArgOfPerigee(sats, 50 as Degrees, 100 as Degrees).map((s) => s.id)).toEqual([2]);
    });

    it('filterByPeriod filters on period', () => {
      const sats = [sat({ id: 1, period: 90 as Minutes }), sat({ id: 2, period: 1436 as Minutes })];

      expect(filterByPeriod(sats, 1400 as Minutes, 1500 as Minutes).map((s) => s.id)).toEqual([2]);
    });
  });

  describe('filterByRcs', () => {
    it('excludes objects with no RCS', () => {
      const sats = [sat({ id: 1, rcs: 5 }), sat({ id: 2 }), sat({ id: 3, rcs: 50 })];

      expect(filterByRcs(sats, 1, 10).map((s) => s.id)).toEqual([1]);
    });
  });

  describe('filterByTleAge', () => {
    it('keeps satellites within [min, max] hours and clamps a negative min to 0', () => {
      const now = new Date('2024-01-01T00:00:00Z');
      const sats = [
        sat({ id: 1, ageOfElset: () => 0.5 }),
        sat({ id: 2, ageOfElset: () => 5 }),
        sat({ id: 3, ageOfElset: () => 50 }),
      ];

      expect(filterByTleAge(sats, -10 as Hours, 10 as Hours, now).map((s) => s.id)).toEqual([1, 2]);
    });
  });

  describe('filterByLookAngle', () => {
    const resolver: LookAngleResolver = (s) => (s.id === 99 ? null : { az: 180, el: 45, rng: 500 });

    it('filters on the requested axis within [min, max]', () => {
      const sats = [sat({ id: 1 }), sat({ id: 2 })];

      expect(filterByLookAngle(sats, resolver, 'el', 40, 50)).toHaveLength(2);
      expect(filterByLookAngle(sats, resolver, 'el', 0, 30)).toHaveLength(0);
    });

    it('drops objects the resolver cannot place', () => {
      const sats = [sat({ id: 1 }), sat({ id: 99 })];

      expect(filterByLookAngle(sats, resolver, 'az', 0, 360).map((s) => s.id)).toEqual([1]);
    });

    it('drops non-satellite / non-missile objects', () => {
      const debris = { id: 5, isSatellite: () => false, isMissile: () => false } as unknown as Satellite;

      expect(filterByLookAngle([debris], resolver, 'az', 0, 360)).toHaveLength(0);
    });
  });
});

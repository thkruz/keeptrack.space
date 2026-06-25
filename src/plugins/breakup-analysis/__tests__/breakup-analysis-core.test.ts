import { Satellite, SpaceObjectType } from '@ootk/src/main';
import {
  buildCsvRows,
  buildGabbardData,
  calcAltitudeStats,
  calcFieldStats,
  calcYearsBetween,
  countByType,
  sortFragments,
  summarizeEvent,
} from '@app/plugins/breakup-analysis/breakup-analysis-core';
import { BREAKUP_EVENTS } from '@app/plugins/breakup-analysis/breakup-events';

const fakeSat = (over: Record<string, unknown> = {}): Satellite => ({
  type: SpaceObjectType.DEBRIS,
  sccNum: '25730',
  name: 'FENGYUN 1C DEB',
  perigee: 800,
  apogee: 900,
  inclination: 98.5,
  eccentricity: 0.005,
  period: 101.3,
  getTypeString: () => 'Debris',
  ...over,
}) as unknown as Satellite;

describe('breakup-analysis-core', () => {
  describe('calcYearsBetween', () => {
    it('returns the fractional year gap', () => {
      expect(calcYearsBetween('1999-05-10', '2007-01-11')).toBe('7.7');
    });

    it('is order independent', () => {
      expect(calcYearsBetween('2010-01-01', '2000-01-01')).toBe('10.0');
    });
  });

  describe('calcFieldStats', () => {
    it('computes min/max/mean', () => {
      const sats = [fakeSat({ inclination: 10 }), fakeSat({ inclination: 20 }), fakeSat({ inclination: 30 })];

      expect(calcFieldStats(sats, (s) => s.inclination)).toEqual({ min: 10, max: 30, mean: 20 });
    });

    it('zeroes for an empty set', () => {
      expect(calcFieldStats([], (s) => s.inclination)).toEqual({ min: 0, max: 0, mean: 0 });
    });
  });

  describe('calcAltitudeStats', () => {
    it('summarizes perigee/apogee', () => {
      const stats = calcAltitudeStats([fakeSat({ perigee: 700, apogee: 900 }), fakeSat({ perigee: 800, apogee: 1000 })]);

      expect(stats.minPerigee).toBe(700);
      expect(stats.meanPerigee).toBe(750);
      expect(stats.maxApogee).toBe(1000);
    });

    it('zeroes for an empty set', () => {
      expect(calcAltitudeStats([]).meanApogee).toBe(0);
    });
  });

  describe('countByType', () => {
    it('buckets by object type', () => {
      const sats = [
        fakeSat({ type: SpaceObjectType.PAYLOAD }),
        fakeSat({ type: SpaceObjectType.ROCKET_BODY }),
        fakeSat({ type: SpaceObjectType.DEBRIS }),
        fakeSat({ type: SpaceObjectType.DEBRIS }),
      ];

      expect(countByType(sats)).toEqual({ payloads: 1, rocketBodies: 1, debris: 2 });
    });
  });

  describe('summarizeEvent', () => {
    it('aggregates tracking ratio and stats', () => {
      const event = { ...BREAKUP_EVENTS[0], estimatedDebrisCount: 1000 };
      const summary = summarizeEvent(event, [fakeSat(), fakeSat()]);

      expect(summary.tracked).toBe(2);
      expect(summary.estimated).toBe(1000);
      expect(summary.trackingRatio).toBe('0.2');
      expect(summary.counts.debris).toBe(2);
    });

    it('does not divide by zero when no estimate', () => {
      const event = { ...BREAKUP_EVENTS[0], estimatedDebrisCount: 0 };

      expect(summarizeEvent(event, [fakeSat()]).trackingRatio).toBe('0');
    });
  });

  describe('buildGabbardData', () => {
    it('emits an apogee and perigee point per finite-period fragment', () => {
      const data = buildGabbardData([fakeSat({ period: 100, apogee: 900, perigee: 800 })]);

      expect(data.apogee).toEqual([[100, 900]]);
      expect(data.perigee).toEqual([[100, 800]]);
    });

    it('drops fragments with non-finite or non-positive period', () => {
      const data = buildGabbardData([
        fakeSat({ period: NaN }),
        fakeSat({ period: 0 }),
        fakeSat({ period: -5 }),
        fakeSat({ period: 95 }),
      ]);

      expect(data.apogee).toHaveLength(1);
    });
  });

  describe('buildCsvRows', () => {
    it('produces flat numeric rows', () => {
      const rows = buildCsvRows([fakeSat({ sccNum: '12345', perigee: 800.456, eccentricity: 0.00512 })]);

      expect(rows[0].noradId).toBe('12345');
      expect(rows[0].perigeeKm).toBe(800.5);
      expect(rows[0].eccentricity).toBe(0.0051);
    });
  });

  describe('sortFragments', () => {
    it('sorts numerically ascending/descending without mutating input', () => {
      const sats = [fakeSat({ perigee: 900 }), fakeSat({ perigee: 700 }), fakeSat({ perigee: 800 })];
      const asc = sortFragments(sats, 'perigee', 'asc');
      const desc = sortFragments(sats, 'perigee', 'desc');

      expect(asc.map((s) => s.perigee)).toEqual([700, 800, 900]);
      expect(desc.map((s) => s.perigee)).toEqual([900, 800, 700]);
      // original untouched
      expect(sats[0].perigee).toBe(900);
    });

    it('sorts SCC numbers numerically, not lexically', () => {
      const sats = [fakeSat({ sccNum: '100' }), fakeSat({ sccNum: '5' }), fakeSat({ sccNum: '25' })];

      expect(sortFragments(sats, 'sccNum', 'asc').map((s) => s.sccNum)).toEqual(['5', '25', '100']);
    });

    it('sorts string fields with a locale compare', () => {
      const sats = [fakeSat({ name: 'Charlie' }), fakeSat({ name: 'Alpha' }), fakeSat({ name: 'Bravo' })];

      expect(sortFragments(sats, 'name', 'asc').map((s) => s.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });
  });
});

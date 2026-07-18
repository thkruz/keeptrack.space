/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  buildRpoCsvRow,
  computeEventPc,
  dataToSat,
  findClosestApproach,
  findSatsAvAGeo,
  findSatsAvALeo,
  ProximityOpsEvent,
  RPO_CSV_HEADERS,
  satToData,
  sortByDistance,
} from '@app/plugins/proximity-ops/proximity-ops-core';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';

const cloneSat = (over: Record<string, unknown> = {}) => Object.assign(Object.create(Object.getPrototypeOf(defaultSat)), defaultSat, { id: 2, ...over });

const fakeBinSat = (over: Record<string, unknown> = {}) => ({
  tle1: '1 ...',
  period: 95,
  inclination: 51.6,
  rightAscension: 100,
  lla: () => ({ lat: 0, lon: 10 }),
  ...over,
});

const rpoEvent = (over: Partial<ProximityOpsEvent> = {}): ProximityOpsEvent => ({
  sat1Id: 0,
  sat1SccNum: '00005',
  sat1Name: 'ISS',
  sat2Id: 1,
  sat2SccNum: '25544',
  sat2Name: 'TIANGONG',
  date: new Date('2026-05-31T00:00:00.000Z'),
  ric: { position: { x: 1, y: 2, z: 3 }, velocity: { x: 0.1, y: 0.2, z: 0.3 } },
  dist: 12.34,
  vel: 0.56,
  pc: null,
  ...over,
});

describe('proximity-ops-core', () => {
  describe('findClosestApproach', () => {
    it('returns a finite-shaped event with a TCA inside the search window', () => {
      const start = new Date('2022-01-01T00:00:00Z');
      const event = findClosestApproach(defaultSat as any, cloneSat() as any, start, 5400);

      expect(typeof event.dist).toBe('number');
      expect(typeof event.vel).toBe('number');
      expect(event.ric.position).toBeDefined();
      expect(event.ric.velocity).toBeDefined();
      expect(event.date.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(event.date.getTime()).toBeLessThanOrEqual(start.getTime() + 5400 * 1000);
    });

    it('returns a null Pc by default (filled later only for reported events)', () => {
      const event = findClosestApproach(defaultSat as any, cloneSat() as any, new Date('2022-01-01T00:00:00Z'), 5400);

      expect(event.pc).toBeNull();
    });
  });

  describe('computeEventPc', () => {
    it('returns null when no confidence level is supplied (Pc skipped)', () => {
      expect(computeEventPc(defaultSat as any, cloneSat() as any, new Date('2022-01-01T00:00:00Z'))).toBeNull();
    });
  });

  describe('sortByDistance', () => {
    it('orders approaches closest-first without mutating the input', () => {
      const input = [rpoEvent({ dist: 30 }), rpoEvent({ dist: 5 }), rpoEvent({ dist: 12 })];
      const sorted = sortByDistance(input);

      expect(sorted.map((e) => e.dist)).toEqual([5, 12, 30]);
      expect(input.map((e) => e.dist)).toEqual([30, 5, 12]);
    });
  });

  describe('CSV export helpers', () => {
    it('buildRpoCsvRow produces one value per header (15 columns)', () => {
      expect(RPO_CSV_HEADERS).toHaveLength(15);
      expect(buildRpoCsvRow(rpoEvent())).toHaveLength(RPO_CSV_HEADERS.length);
    });

    it('emits the RIC breakdown columns from the event geometry', () => {
      const row = buildRpoCsvRow(rpoEvent());

      // dr/dt/dn are columns 7-9 (after the 7 identity/date columns).
      expect(row.slice(7, 10)).toEqual([1, 2, 3]);
      expect(row.slice(10, 13)).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('satToData / dataToSat round-trip', () => {
    it('preserves the catalog id, sccNum, and name', () => {
      const data = satToData(defaultSat as any);

      expect(data.sccNum).toBe(defaultSat.sccNum);
      expect(data.id).toBe(defaultSat.id);

      const rebuilt = dataToSat(data);

      expect(rebuilt).toBeInstanceOf(Satellite);
      expect(rebuilt.name).toBe(defaultSat.name);
    });
  });

  describe('pure bin filters', () => {
    it('findSatsAvALeo keeps only the plane-matched LEO satellites', () => {
      const sats = [fakeBinSat({ inclination: 51.6, rightAscension: 100 }), fakeBinSat({ inclination: 0, rightAscension: 300 })];

      expect(findSatsAvALeo(sats as any, 51.6, 100)).toHaveLength(1);
    });

    it('findSatsAvAGeo keeps only satellites near the target longitude', () => {
      const sats = [fakeBinSat({ period: 24 * 60, lla: () => ({ lat: 0, lon: 10 }) }), fakeBinSat({ period: 24 * 60, lla: () => ({ lat: 0, lon: 120 }) })];

      expect(findSatsAvAGeo(sats as any, 10, new Date('2026-05-31T00:00:00.000Z'))).toHaveLength(1);
    });
  });
});

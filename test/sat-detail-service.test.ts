import { vi } from 'vitest';
import { satDetailService } from '@app/app/data/catalogs/sat-detail-service';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';

/*
 * SatDetailDataService lazily fetches per-satellite detail and merges the
 * UPPER_SNAKE API fields onto camelCase Satellite properties. The global fetch
 * (which apiFetch delegates to) is stubbed so the merge + guard logic is tested
 * without network.
 */
const respond = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
} as Response);

const satWith = (sccNum: string): Satellite => {
  const s = defaultSat.clone() as Satellite;

  s.sccNum = sccNum;
  s.mission = '';

  return s;
};

describe('SatDetailDataService', () => {
  afterEach(() => vi.restoreAllMocks());

  describe('hasDetail', () => {
    it('is true when the satellite already has a mission', () => {
      const s = satWith('50001');

      s.mission = 'Earth Observation';
      expect(satDetailService.hasDetail(s)).toBe(true);
    });

    it('is false for a satellite with no detail yet', () => {
      expect(satDetailService.hasDetail(satWith('50002'))).toBe(false);
    });
  });

  describe('fetchSatDetail', () => {
    it('merges UPPER_SNAKE API fields onto the satellite (array response)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond([{ MISSION: 'Recon', PURPOSE: 'Test', LAUNCH_VEHICLE: 'Falcon 9' }]));
      const sat = satWith('50010');

      await satDetailService.fetchSatDetail(sat);

      expect(sat.mission).toBe('Recon');
      expect(sat.purpose).toBe('Test');
      expect(sat.launchVehicle).toBe('Falcon 9');
    });

    it('unwraps a { data: {...} } response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond({ data: { MANUFACTURER: 'Boeing' } }));
      const sat = satWith('50011');

      await satDetailService.fetchSatDetail(sat);

      expect(sat.manufacturer).toBe('Boeing');
    });

    it('does not re-fetch once detail has been merged', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond([{ MISSION: 'First' }]));
      const sat = satWith('50012');

      await satDetailService.fetchSatDetail(sat); // first fetch -> mission populated
      expect(sat.mission).toBe('First');

      // Re-point fetch to different data; the hasDetail guard means a second
      // call short-circuits and does not overwrite the merged value.
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond([{ MISSION: 'Second' }]));
      await satDetailService.fetchSatDetail(sat);
      expect(sat.mission).toBe('First');
    });

    it('does not merge when the response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond({}, false, 500));
      const sat = satWith('50013');

      await satDetailService.fetchSatDetail(sat);

      expect(sat.mission).toBe('');
    });

    it('ignores empty/undefined field values', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond([{ MISSION: '', PURPOSE: 'KeepThis' }]));
      const sat = satWith('50014');

      await satDetailService.fetchSatDetail(sat);

      expect(sat.mission).toBe('');
      expect(sat.purpose).toBe('KeepThis');
    });
  });
});

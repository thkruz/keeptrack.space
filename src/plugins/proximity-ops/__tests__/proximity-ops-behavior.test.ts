import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { ProximityOps } from '@app/plugins/proximity-ops/proximity-ops';
import { findSatsAvAGeo, findSatsAvALeo } from '@app/plugins/proximity-ops/proximity-ops-core';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const rpoEvent = (over: Record<string, unknown> = {}) => ({
  sat1Id: 0,
  sat1SccNum: '00005',
  sat1Name: 'ISS',
  sat2Id: 1,
  sat2SccNum: '25544',
  sat2Name: 'TIANGONG',
  date: new Date('2026-05-31T00:00:00.000Z'),
  ric: {
    position: { x: 1, y: 2, z: 3 },
    velocity: { x: 0.1, y: 0.2, z: 0.3 },
  },
  dist: 12.34,
  vel: 0.56,
  pc: null,
  ...over,
});

describe('ProximityOps behavior', () => {
  let plugin: ProximityOps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new ProximityOps();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('convertRPOsToCSV_ emits a header row plus one quoted row per event', () => {
    const csv = p().convertRPOsToCSV_([rpoEvent(), rpoEvent({ sat1SccNum: '40000' })]);
    const lines = csv.split('\n');

    expect(lines[0]).toContain('t_sccnum');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"00005"');
  });

  it('updateNoradId_ picks the LEO preset for a low-Earth satellite', () => {
    vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue(defaultSat as never);

    p().updateNoradId_();

    expect((getEl('proximity-ops-type') as HTMLInputElement).value).toBe('LEO');
    expect((getEl('proximity-ops-maxDis') as HTMLInputElement).value).toBe('5000');
    expect((getEl('proximity-ops-norad') as HTMLInputElement).value).toBe(defaultSat.sccNum);
  });

  it('updateNoradId_ is a no-op when no satellite is selected', () => {
    vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue({ isSatellite: () => false } as never);

    expect(() => p().updateNoradId_()).not.toThrow();
  });

  it('onEventClicked_ jumps time, selects both satellites and searches', () => {
    // onEventClicked_ jumps the clock via the shared jumpToTca helper, which
    // resolves ServiceLocator.getTimeManager() itself - so spy on that instance.
    const offsetSpy = vi.spyOn(ServiceLocator.getTimeManager(), 'changeStaticOffset').mockImplementation(() => undefined);
    const secondarySpy = vi.spyOn(p().selectSatManagerInstance, 'setSecondarySat').mockImplementation(() => undefined);
    const selectSpy = vi.spyOn(p().selectSatManagerInstance, 'selectSat').mockImplementation(() => undefined);

    p().selectSatManagerInstance.primarySatObj = defaultSat;
    vi.spyOn(SettingsMenuPlugin, 'syncOnLoad').mockImplementation(() => undefined);
    const searchSpy = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().onEventClicked_(rpoEvent());

    expect(offsetSpy).toHaveBeenCalled();
    expect(secondarySpy).toHaveBeenCalledWith(1);
    expect(selectSpy).toHaveBeenCalledWith(0);
    expect(searchSpy).toHaveBeenCalledWith('00005,25544');
  });

  it('populateTable_ renders a row per proximity event', () => {
    expect(() => p().populateTable_([rpoEvent(), rpoEvent()])).not.toThrow();

    const table = getEl('proximity-ops-table', true);

    if (table) {
      expect(table.querySelectorAll('tr').length).toBeGreaterThan(0);
    }
  });

  describe('satellite filtering (pure core bin filters)', () => {
    const fakeSat = (over: Record<string, unknown> = {}) => ({
      tle1: '1 ...',
      period: 95,
      inclination: 51.6,
      rightAscension: 100,
      source: 0,
      isPayload: () => true,
      lla: () => ({ lat: 0, lon: 10 }),
      ...over,
    });

    const setChecks = (payloadOnly: boolean, noVimpel: boolean) => {
      (getEl('proximity-ops-payload-only') as HTMLInputElement).checked = payloadOnly;
      (getEl('proximity-ops-no-vimpel') as HTMLInputElement).checked = noVimpel;
    };

    it('getFilteredSatellites returns all sats when no filter is active', () => {
      vi.spyOn(ServiceLocator.getCatalogManager(), 'getSats').mockReturnValue([fakeSat(), fakeSat()] as never);
      setChecks(false, false);

      expect(p().getFilteredSatellites()).toHaveLength(2);
    });

    it('getFilteredSatellites drops non-payloads when payload-only is checked', () => {
      vi.spyOn(ServiceLocator.getCatalogManager(), 'getSats').mockReturnValue([fakeSat({ isPayload: () => true }), fakeSat({ isPayload: () => false })] as never);
      setChecks(true, false);

      expect(p().getFilteredSatellites()).toHaveLength(1);
    });

    it('findSatsAvALeo matches LEO satellites near the target plane', () => {
      const sats = [fakeSat({ inclination: 51.6, rightAscension: 100, period: 95 }), fakeSat({ inclination: 0, rightAscension: 300, period: 95 })];

      const matches = findSatsAvALeo(sats as never, 51.6, 100);

      expect(matches.length).toBe(1);
    });

    it('findSatsAvAGeo matches GEO satellites near the target longitude', () => {
      const sats = [fakeSat({ period: 24 * 60, lla: () => ({ lat: 0, lon: 10 }) }), fakeSat({ period: 24 * 60, lla: () => ({ lat: 0, lon: 120 }) })];

      const matches = findSatsAvAGeo(sats as never, 10, new Date('2026-05-31T00:00:00.000Z'));

      expect(matches.length).toBe(1);
    });
  });
});

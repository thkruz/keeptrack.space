import { CatalogLoader, KeepTrackTLEFile } from '@app/app/data/catalog-loader';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { getHostLabel, getModulesOfHost, getStationModule, isStationModule, resolveStationHost, STATION_MODULES } from '@app/app/data/station-modules';
import { BaseObject, TleLine1, TleLine2 } from '@app/engine/ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('station module alias map (#459)', () => {
  it('flags attached ISS and Tiangong modules, not the hosts or free-flying objects', () => {
    for (const scc of ['25575', '26400', '26700', '49044', '36086', '53239', '54216']) {
      expect(isStationModule(scc)).toBe(true);
    }
    for (const scc of ['25544', '48274', '69796', '69797', '12345']) {
      expect(isStationModule(scc)).toBe(false);
    }
  });

  it('is tolerant of numbers and leading zeros', () => {
    expect(isStationModule(25575)).toBe(true);
    expect(isStationModule('025575')).toBe(true);
    expect(isStationModule(null)).toBe(false);
  });

  it('resolves a module to its host and leaves other ids alone', () => {
    expect(resolveStationHost('26400')).toBe('25544');
    expect(resolveStationHost('54216')).toBe('48274');
    expect(resolveStationHost('25544')).toBe('25544');
    expect(resolveStationHost('69796')).toBe('69796');
  });

  it('lists modules per host with names and labels', () => {
    expect(getModulesOfHost('25544').map((m) => m.name)).toEqual(['Unity', 'Zvezda', 'Destiny', 'Poisk', 'Nauka']);
    expect(getModulesOfHost('48274').map((m) => m.name)).toEqual(['Wentian', 'Mengtian']);
    expect(getModulesOfHost('99999')).toEqual([]);
    expect(getStationModule('49044')?.name).toBe('Nauka');
    expect(getHostLabel('25544')).toBe('ISS');
    expect(getHostLabel('48274')).toBe('Tiangong');
  });

  it('never maps a module to itself or to another module', () => {
    for (const m of STATION_MODULES) {
      expect(isStationModule(m.host)).toBe(false);
      expect(m.host).not.toBe(m.sccNum);
    }
  });

  it('CatalogManager.sccNum2Id redirects a module number (?sat=25575) to the ISS', () => {
    const catalog = new CatalogManager();

    catalog.objectCache = [];
    catalog.sccIndex = { 25544: 7 };

    expect(catalog.sccNum2Id('25575')).toBe(7);
    expect(catalog.sccNum2Id('26400', false)).toBe(7);
    expect(catalog.sccNum2Id('25544')).toBe(7);
  });

  it('the catalog loader skips module rows but keeps the host and free-flying objects', () => {
    setupStandardEnvironment();
    const catalog = new CatalogManager();

    catalog.objectCache = [];
    catalog.sccIndex = {};
    catalog.cosparIndex = {};
    const loader = CatalogLoader as unknown as {
      processAllSats_: (resp: KeepTrackTLEFile[], i: number, c: CatalogManager, t: BaseObject[], n: number) => void;
    };
    const tle1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9002' as TleLine1;
    const tle2 = '2 25544  51.6400 208.9163 0006703 300.3030  59.7403 15.49560830434827' as TleLine2;
    const rows = ['25544', '25575', '26400', '49044', '69796'].map((sccNum) => ({ name: `OBJ ${sccNum}`, sccNum, tle1, tle2 }) as KeepTrackTLEFile);
    const tempObjData: BaseObject[] = [];

    rows.forEach((_, i) => loader.processAllSats_(rows, i, catalog, tempObjData, 0));

    expect(tempObjData.map((o) => (o as { sccNum: string }).sccNum)).toEqual(['25544', '69796']);
  });
});

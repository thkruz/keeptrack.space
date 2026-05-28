import { vi } from 'vitest';
import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { CatalogSearch } from '@app/app/data/catalog-search';
import { GetSatType } from '@app/engine/core/interfaces';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { BaseObject, Degrees, Satellite, Kilometers, Minutes, SpaceObjectType } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

vi.mock('@app/engine/utils/saveVariable', () => ({
  saveXlsx: vi.fn(),
  saveCsv: vi.fn(),
  saveVariable: vi.fn(),
  copyTsvToClipboard: vi.fn(),
  getCircularReplacer: vi.fn(),
}));

// Test calcSatrec function
describe('calcSatrec', () => {
  let catalogManagerInstance: CatalogManager;

  beforeEach(() => {
    catalogManagerInstance = new CatalogManager();
  });

  // should return a satrec object
  it('return_satrec_object', () => {
    const newSat = defaultSat;

    catalogManagerInstance.objectCache = [newSat];
    const satrec = newSat.satrec;

    expect(satrec).toStrictEqual(defaultSat.satrec);
  });

  // should return a satrec object
  it('return_satrec_object2', () => {
    const newSat = defaultSat;

    catalogManagerInstance.objectCache = [];
    const satrec = catalogManagerInstance.calcSatrec(newSat);

    expect(satrec).toStrictEqual(defaultSat.satrec);
  });

  // should convert an id array into a satnum array
  it('convert_id_to_satnum', () => {
    const idList = [0];
    const newSat = defaultSat;

    catalogManagerInstance.objectCache = [newSat];
    const satnumList = catalogManagerInstance.id2satnum(idList);

    expect(satnumList).toStrictEqual(['00005']);
  });

  // should search for objects in similar orbits
  it('search_for_similar_orbits', () => {
    const selectSataManagerInstance = new SelectSatManager();

    selectSataManagerInstance.init();

    const matchSat = defaultSat.clone();

    matchSat.id = 1;
    matchSat.period = 99 as Minutes;
    const nonmatchSat = defaultSat.clone();

    nonmatchSat.id = 2;
    nonmatchSat.period = 200 as Minutes;
    const nonmatchSat2 = defaultSat.clone();

    nonmatchSat2.id = 3;
    nonmatchSat2.inclination = 90 as Degrees;
    const nonmatchSat3 = defaultSat.clone();

    nonmatchSat3.id = 4;
    nonmatchSat3.rightAscension = 200 as Degrees;
    const nonmatchSat4 = defaultSat.clone();

    nonmatchSat4.id = 5;
    nonmatchSat4.isStatic = () => true;

    selectSataManagerInstance.selectedSat = defaultSat.id;
    catalogManagerInstance.objectCache = [defaultSat, matchSat, nonmatchSat, nonmatchSat2, nonmatchSat3, nonmatchSat4];

    // mock new Date() with new Date(2021, 6, 22, 12);
    const mockDate = new Date(2021, 6, 22, 12);

    vi.spyOn(global, 'Date').mockImplementation(function() {
      return mockDate;
    } as any);

    const satData = CatalogSearch.findObjsByOrbit(catalogManagerInstance.objectCache as Satellite[], defaultSat);

    expect(satData).toStrictEqual([0, 1]);
  });

  // should find reentries
  it('find_reentries', () => {
    Object.defineProperty(defaultSat, 'period', { value: 100 as Minutes, configurable: true });
    const matchSat = defaultSat.clone();

    // ootk clone() doesn't preserve type, so we must set it explicitly
    matchSat.type = SpaceObjectType.PAYLOAD;
    // perigee is a computed getter in ootk, so we need to override it with defineProperty
    Object.defineProperty(matchSat, 'perigee', { value: 200 as Kilometers, configurable: true });
    matchSat.sccNum = '00001';
    const nonmatchSat = defaultSat.clone();

    nonmatchSat.type = SpaceObjectType.PAYLOAD;
    Object.defineProperty(nonmatchSat, 'perigee', { value: 0 as Kilometers, configurable: true });
    nonmatchSat.sccNum = '00002';
    const nonmatchSat2 = defaultSat.clone();

    nonmatchSat2.type = SpaceObjectType.LAUNCH_AGENCY;
    nonmatchSat2.sccNum = '00002';
    const nonmatchSat3 = defaultSat.clone();

    nonmatchSat3.type = SpaceObjectType.PAYLOAD;
    Object.defineProperty(nonmatchSat3, 'perigee', { value: 300 as Kilometers, configurable: true });
    nonmatchSat3.sccNum = '00002';

    catalogManagerInstance.objectCache = [];
    catalogManagerInstance.objectCache.push(nonmatchSat, nonmatchSat2, nonmatchSat3);
    const correctResult = [] as string[];

    for (let i = 0; i < 100; i++) {
      catalogManagerInstance.objectCache.push(matchSat);
      correctResult.push(matchSat.sccNum);
    }

    const satData = CatalogSearch.findReentry(catalogManagerInstance.objectCache as Satellite[]);

    expect(satData).toStrictEqual(correctResult);
  });

  // should process exportTle2Csv
  it('process_export_tle_csv', () => {
    catalogManagerInstance.objectCache = [];
    CatalogExporter.exportTle2Csv(catalogManagerInstance.objectCache as BaseObject[]);

    catalogManagerInstance.objectCache = [defaultSat];
    CatalogExporter.exportTle2Csv(catalogManagerInstance.objectCache as BaseObject[]);
  });

  // should process exportTle2Txt
  it('process_export_tle_txt', () => {
    catalogManagerInstance.objectCache = [];
    CatalogExporter.exportTle2Txt(catalogManagerInstance.objectCache as BaseObject[]);

    catalogManagerInstance.objectCache = [defaultSat];
    CatalogExporter.exportTle2Txt(catalogManagerInstance.objectCache as BaseObject[]);
  });

  // should process getIdFromIntlDes
  it('process_get_id_from_intl_des', () => {
    catalogManagerInstance.cosparIndex = [] as unknown as { [key: string]: number };
    catalogManagerInstance.cosparIndex[defaultSat.intlDes] = 0;
    const result = catalogManagerInstance.intlDes2id(defaultSat.intlDes);

    expect(result).toStrictEqual(0);
  });

  // should process getSatPosOnly
  it('process_get_sat_pos_only', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    dotsManagerInstance.positionData = new Float32Array(3);
    const result = catalogManagerInstance.getSat(0, GetSatType.POSITION_ONLY);

    expect(result).toStrictEqual(defaultSat);
  });

  // Should allow set secondary
  it('process_set_secondary', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    expect(() => PluginRegistry.getPlugin(SelectSatManager)?.setSecondarySat(0)).not.toThrow();
  });

  // Should allow switch primary
  it('process_switch_primary', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    expect(() => PluginRegistry.getPlugin(SelectSatManager)?.switchPrimarySecondary()).not.toThrow();
    expect(() => PluginRegistry.getPlugin(SelectSatManager)?.switchPrimarySecondary()).not.toThrow();
  });

  // Should addAnalystSat
  it('process_insert_new_analyst_satellite', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    catalogManagerInstance.satCruncherThread = {
      postMessage: vi.fn(),
      sendSatEdit: vi.fn(),
    } as any;
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 0)).not.toThrow();
  });

  // Should error on bad addAnalystSat
  it('process_insert_new_analyst_satellite_bad', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    catalogManagerInstance.satCruncherThread = {
      postMessage: vi.fn(),
      sendSatEdit: vi.fn(),
    } as any;
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1.slice(0, 68), defaultSat.tle2, 0)).toThrow();
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1, `${defaultSat.tle2}0`, 0)).toThrow();
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 1)).not.toThrow();
  });

  // getSats must filter OemSatellite — its isSatellite() returns true but it
  // lacks tle1/tle2/apogee/perigee, which downstream consumers (orbit-cruncher,
  // RPO finder, etc.) assume exist on every returned object.
  it('getSats excludes OemSatellite while keeping true Satellites', () => {
    const fakeOem = Object.assign(Object.create(OemSatellite.prototype) as OemSatellite, {
      id: 1,
      sccNum: '',
    });

    catalogManagerInstance.objectCache = [defaultSat, fakeOem as unknown as BaseObject];
    catalogManagerInstance.numSatellites = 2;

    const result = catalogManagerInstance.getSats();

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(defaultSat);
  });

  // addAnalystSat is the construction path used by breakup, orbit-references,
  // and the analyst-slot system. Extended (9-digit) sccNums can only be
  // preserved by passing the explicit `sccNum` parameter — the fallback only
  // reads the trailing 5 chars from the TLE column.
  describe('addAnalystSat sccNum handling', () => {
    beforeEach(() => {
      catalogManagerInstance.objectCache = [defaultSat];
      catalogManagerInstance.satCruncherThread = {
        postMessage: vi.fn(),
        sendSatEdit: vi.fn(),
      } as any;
    });

    it('falls back to the 5-char TLE satnum when no explicit sccNum is passed', () => {
      const sat = catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 1);

      expect(sat).not.toBeNull();
      // defaultSat's TLE has '25544' in cols 3-7.
      expect(sat!.sccNum).toBe('25544');
    });

    it('preserves an explicit alpha-5 sccNum parameter', () => {
      const sat = catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 1, 'T0001');

      expect(sat).not.toBeNull();
      expect(sat!.sccNum).toBe('T0001');
      expect(sat!.sccNum5).toBe('T0001');
    });

    it('preserves an explicit 9-digit extended sccNum parameter', () => {
      const sat = catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 1, '799500766');

      expect(sat).not.toBeNull();
      expect(sat!.sccNum).toBe('799500766');
      // sccNum5/6 are null for extended.
      expect(sat!.sccNum5).toBeNull();
      expect(sat!.sccNum6).toBeNull();
    });

    it('preserves an explicit 6-digit numeric sccNum (A5-capable range)', () => {
      const sat = catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 1, '270001');

      expect(sat).not.toBeNull();
      expect(sat!.sccNum).toBe('270001');
      // 6-digit numeric in alpha-5 range has both forms populated.
      expect(sat!.sccNum5).toBe('T0001');
      expect(sat!.sccNum6).toBe('270001');
    });
  });
});

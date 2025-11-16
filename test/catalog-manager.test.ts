import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { CatalogSearch } from '@app/app/data/catalog-search';
import { GetSatType } from '@app/engine/core/interfaces';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { BaseObject, Degrees, DetailedSatellite, Kilometers, Minutes, SpaceObjectType } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

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

    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const satData = CatalogSearch.findObjsByOrbit(catalogManagerInstance.objectCache as DetailedSatellite[], defaultSat);

    expect(satData).toStrictEqual([0, 1]);
  });

  // should find reentries
  it('find_reentries', () => {
    defaultSat.period = 100 as Minutes;
    const matchSat = defaultSat.clone();

    matchSat.perigee = 200 as Kilometers;
    matchSat.sccNum = '00001';
    const nonmatchSat = defaultSat.clone();

    nonmatchSat.perigee = 0 as Kilometers;
    nonmatchSat.sccNum = '00002';
    const nonmatchSat2 = defaultSat.clone();

    nonmatchSat2.type = SpaceObjectType.LAUNCH_AGENCY;
    nonmatchSat2.sccNum = '00002';
    const nonmatchSat3 = defaultSat.clone();

    nonmatchSat3.perigee = 300 as Kilometers;
    nonmatchSat3.sccNum = '00002';

    catalogManagerInstance.objectCache = [];
    catalogManagerInstance.objectCache.push(nonmatchSat, nonmatchSat2, nonmatchSat3);
    const correctResult = [] as string[];

    for (let i = 0; i < 100; i++) {
      catalogManagerInstance.objectCache.push(matchSat);
      correctResult.push(matchSat.sccNum);
    }

    const satData = CatalogSearch.findReentry(catalogManagerInstance.objectCache as DetailedSatellite[]);

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
    catalogManagerInstance.satCruncher = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    } as unknown as Worker;
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 0)).not.toThrow();
  });

  // Should error on bad addAnalystSat
  it('process_insert_new_analyst_satellite_bad', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    catalogManagerInstance.satCruncher = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    } as unknown as Worker;
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1.slice(0, 68), defaultSat.tle2, 0)).toThrow();
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1, `${defaultSat.tle2}0`, 0)).toThrow();
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.tle1, defaultSat.tle2, 1)).not.toThrow();
  });
});

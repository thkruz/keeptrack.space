import { GetSatType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CatalogExporter } from '@app/static/catalog-exporter';
import { CatalogSearch } from '@app/static/catalog-search';
import { DEG2RAD, DetailedSatellite, SpaceObjectType } from 'ootk';
import { CatalogManager } from './../src/singletons/catalog-manager';
import { defaultSat } from './environment/apiMocks';

// Test calcSatrec function
describe('calcSatrec', () => {
  let catalogManagerInstance: CatalogManager;
  beforeEach(() => {
    catalogManagerInstance = new CatalogManager();
  });

  // should return a satrec object
  it('return_satrec_object', () => {
    const newSat = { ...defaultSat, id: 0, satrec: null };
    catalogManagerInstance.objectCache = [newSat];
    const satrec = catalogManagerInstance.calcSatrec(newSat);
    expect(satrec).toStrictEqual(defaultSat.satrec);
  });

  // should return a satrec object
  it('return_satrec_object2', () => {
    const newSat = { ...defaultSat, id: 0, satrec: null };
    catalogManagerInstance.objectCache = [];
    const satrec = catalogManagerInstance.calcSatrec(newSat);
    expect(satrec).toStrictEqual(defaultSat.satrec);
  });

  // should convert an id array into a satnum array
  it('convert_id_to_satnum', () => {
    const idList = [0];
    const newSat = { ...defaultSat, id: 0, satrec: null };
    catalogManagerInstance.objectCache = [newSat];
    const satnumList = catalogManagerInstance.id2satnum(idList);
    expect(satnumList).toStrictEqual(['00005']);
  });

  // should search for objects in similar orbits
  it('search_for_similar_orbits', () => {
    const selectSataManagerInstance = new SelectSatManager();
    selectSataManagerInstance.init();

    defaultSat.period = 100;
    const matchSat = { ...defaultSat, id: 1, period: 99 };
    const nonmatchSat = { ...defaultSat, id: 2, period: 200 };
    const nonmatchSat2 = { ...defaultSat, id: 3, inclination: 90 * DEG2RAD };
    const nonmatchSat3 = { ...defaultSat, id: 4, raan: 200 * DEG2RAD };
    const nonmatchSat4 = { ...defaultSat, id: 5, static: true };

    selectSataManagerInstance.selectedSat = defaultSat.id;
    catalogManagerInstance.objectCache = [defaultSat, matchSat, nonmatchSat, nonmatchSat2, nonmatchSat3, nonmatchSat4];
    const satData = CatalogSearch.findObjsByOrbit(catalogManagerInstance.objectCache as DetailedSatellite[], defaultSat);
    expect(satData).toStrictEqual([0, 1]);
  });

  // should find reentries
  it('find_reentries', () => {
    defaultSat.period = 100;
    const matchSat = { ...defaultSat, perigee: 200, sccNum: '00001' };
    const nonmatchSat = { ...defaultSat, perigee: 0, sccNum: '00002' };
    const nonmatchSat2 = { ...defaultSat, type: SpaceObjectType.LAUNCH_AGENCY, sccNum: '00002' };
    const nonmatchSat3 = { ...defaultSat, perigee: 300, sccNum: '00002' };

    catalogManagerInstance.objectCache = [];
    catalogManagerInstance.objectCache.push(nonmatchSat, nonmatchSat2, nonmatchSat3);
    const correctResult = [];
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
    CatalogExporter.exportTle2Csv(catalogManagerInstance.objectCache as any);

    catalogManagerInstance.objectCache = [defaultSat];
    CatalogExporter.exportTle2Csv(catalogManagerInstance.objectCache as any);
  });

  // should process exportTle2Txt
  it('process_export_tle_csv', () => {
    catalogManagerInstance.objectCache = [];
    CatalogExporter.exportTle2Txt(catalogManagerInstance.objectCache as any);

    catalogManagerInstance.objectCache = [defaultSat];
    CatalogExporter.exportTle2Txt(catalogManagerInstance.objectCache as any);
  });

  // should process getIdFromIntlDes
  it('process_get_id_from_intl_des', () => {
    catalogManagerInstance.cosparIndex = [] as any;
    catalogManagerInstance.cosparIndex[defaultSat.intlDes] = 0;
    const result = catalogManagerInstance.intlDes2id(defaultSat.intlDes);
    expect(result).toStrictEqual(0);
  });

  // should process getSatPosOnly
  it('process_get_sat_pos_only', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    dotsManagerInstance.positionData = new Float32Array(3);
    const result = catalogManagerInstance.getSat(0, GetSatType.POSITION_ONLY);
    expect(result).toStrictEqual(defaultSat);
  });

  // Should allow set secondary
  it('process_set_secondary', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    expect(() => keepTrackApi.getPlugin(SelectSatManager).setSecondarySat(0)).not.toThrow();
  });

  // Should allow switch primary
  it('process_switch_primary', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    expect(() => keepTrackApi.getPlugin(SelectSatManager).switchPrimarySecondary()).not.toThrow();
    expect(() => keepTrackApi.getPlugin(SelectSatManager).switchPrimarySecondary()).not.toThrow();
  });

  // Should addAnalystSat
  it('process_insert_new_analyst_satellite', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    catalogManagerInstance.satCruncher = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    } as any;
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.TLE1, defaultSat.TLE2, 0)).not.toThrow();
  });

  // Should error on bad addAnalystSat
  it('process_insert_new_analyst_satellite_bad', () => {
    catalogManagerInstance.objectCache = [defaultSat];
    catalogManagerInstance.satCruncher = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    } as any;
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.TLE1.slice(0, 68), defaultSat.TLE2, 0)).toThrow();
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.TLE1, `${defaultSat.TLE2}0`, 0)).toThrow();
    expect(() => catalogManagerInstance.addAnalystSat(defaultSat.TLE1, defaultSat.TLE2, 1)).toThrow();
  });
});

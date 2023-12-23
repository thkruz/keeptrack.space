import { CatalogManager, GetSatType, SatCruncherMessageData, SatObject } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { DEG2RAD } from '@app/lib/constants';
import { SpaceObjectType } from '@app/lib/space-object-type';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { StandardCatalogManager } from '@app/singletons/catalog-manager';
import { CatalogExporter } from '@app/static/catalog-exporter';
import { CatalogSearch } from '@app/static/catalog-search';
import { defaultSat } from './environment/apiMocks';

// Test calcSatrec function
describe('calcSatrec', () => {
  let catalogManagerInstance: CatalogManager;
  beforeEach(() => {
    catalogManagerInstance = new StandardCatalogManager();
  });

  // should return a satrec object
  it('return_satrec_object', () => {
    const newSat = { ...defaultSat, id: 0, satrec: null };
    catalogManagerInstance.satData = [newSat];
    const satrec = catalogManagerInstance.calcSatrec(newSat);
    expect(satrec).toStrictEqual(defaultSat.satrec);
  });

  // should return a satrec object
  it('return_satrec_object2', () => {
    const newSat = { ...defaultSat, id: 0, satrec: null };
    catalogManagerInstance.satData = [];
    const satrec = catalogManagerInstance.calcSatrec(newSat);
    expect(satrec).toStrictEqual(defaultSat.satrec);
  });

  // should convert an id array into a satnum array
  it('convert_id_to_satnum', () => {
    const idList = [0];
    const newSat = { ...defaultSat, id: 0, satrec: null };
    catalogManagerInstance.satData = [newSat];
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
    catalogManagerInstance.satData = [defaultSat, matchSat, nonmatchSat, nonmatchSat2, nonmatchSat3, nonmatchSat4];
    const satData = CatalogSearch.findObjsByOrbit(<SatObject[]>(<unknown>catalogManagerInstance.satData), defaultSat);
    expect(satData).toStrictEqual([0, 1]);
  });

  // should find reentries
  it('find_reentries', () => {
    defaultSat.period = 100;
    const matchSat = <SatObject>{ ...defaultSat, perigee: 200, sccNum: '00001' };
    const nonmatchSat = <SatObject>{ ...defaultSat, perigee: 0, sccNum: '00002' };
    const nonmatchSat2 = <SatObject>{ ...defaultSat, type: SpaceObjectType.LAUNCH_AGENCY, sccNum: '00002' };
    const nonmatchSat3 = <SatObject>{ ...defaultSat, perigee: 300, sccNum: '00002' };

    catalogManagerInstance.satData = [];
    catalogManagerInstance.satData.push(nonmatchSat, nonmatchSat2, nonmatchSat3);
    const correctResult = [];
    for (let i = 0; i < 100; i++) {
      catalogManagerInstance.satData.push(matchSat);
      correctResult.push(matchSat.sccNum);
    }

    const satData = CatalogSearch.findReentry(catalogManagerInstance.satData as SatObject[]);
    expect(satData).toStrictEqual(correctResult);
  });

  // should process cruncherExtraData
  it('process_cruncher_extra_data', () => {
    catalogManagerInstance.satData = [defaultSat];
    catalogManagerInstance.numSats = 1;

    catalogManagerInstance.cruncherExtraData(<SatCruncherMessageData>{ extraData: JSON.stringify([defaultSat]) });
  });

  // should process cruncherExtraUpdate
  it('process_cruncher_extra_update', () => {
    const newSat = { ...defaultSat, satId: 0 };
    catalogManagerInstance.satData = [newSat];
    catalogManagerInstance.numSats = 1;

    catalogManagerInstance.cruncherExtraUpdate(<SatCruncherMessageData>{ extraUpdate: true, extraData: JSON.stringify([newSat]), satId: 0 });
  });

  // should process exportTle2Csv
  it('process_export_tle_csv', () => {
    catalogManagerInstance.satData = [];
    CatalogExporter.exportTle2Csv(catalogManagerInstance.satData as any);

    catalogManagerInstance.satData = [defaultSat];
    CatalogExporter.exportTle2Csv(catalogManagerInstance.satData as any);
  });

  // should process exportTle2Txt
  it('process_export_tle_csv', () => {
    catalogManagerInstance.satData = [];
    CatalogExporter.exportTle2Txt(catalogManagerInstance.satData as any);

    catalogManagerInstance.satData = [defaultSat];
    CatalogExporter.exportTle2Txt(catalogManagerInstance.satData as any);
  });

  // should process getIdFromIntlDes
  it('process_get_id_from_intl_des', () => {
    catalogManagerInstance.cosparIndex = [] as any;
    catalogManagerInstance.cosparIndex[defaultSat.intlDes] = 0;
    const result = catalogManagerInstance.getIdFromIntlDes(defaultSat.intlDes);
    expect(result).toStrictEqual(0);
  });

  // should process getIdFromStarName
  it('process_get_id_from_star_name', () => {
    catalogManagerInstance.satData = [{ ...defaultSat, type: SpaceObjectType.STAR, name: 'test' }];

    const result = catalogManagerInstance.getIdFromStarName('test', 0, 1);
    expect(result).toStrictEqual(0);
  });

  // should process getSatPosOnly
  it('process_get_sat_pos_only', () => {
    catalogManagerInstance.satData = [defaultSat];
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    dotsManagerInstance.positionData = new Float32Array(3);
    const result = catalogManagerInstance.getSat(0, GetSatType.POSITION_ONLY);
    expect(result).toStrictEqual(defaultSat);
  });

  // Should allow setSat
  it('process_set_sat', () => {
    catalogManagerInstance.satData = [defaultSat];
    expect(() => catalogManagerInstance.setSat(0, defaultSat)).not.toThrow();
  });

  // Should allow set secondary
  it('process_set_secondary', () => {
    catalogManagerInstance.satData = [defaultSat];
    expect(() => keepTrackApi.getPlugin(SelectSatManager).setSecondarySat(0)).not.toThrow();
  });

  // Should allow switch primary
  it('process_switch_primary', () => {
    catalogManagerInstance.satData = [defaultSat];
    expect(() => keepTrackApi.getPlugin(SelectSatManager).switchPrimarySecondary()).not.toThrow();
    expect(() => keepTrackApi.getPlugin(SelectSatManager).switchPrimarySecondary()).not.toThrow();
  });

  // Should insertNewAnalystSatellite
  it('process_insert_new_analyst_satellite', () => {
    catalogManagerInstance.satData = [defaultSat];
    catalogManagerInstance.satCruncher = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    } as any;
    expect(() => catalogManagerInstance.insertNewAnalystSatellite(defaultSat.TLE1, defaultSat.TLE2, 0)).not.toThrow();
  });

  // Should error on bad insertNewAnalystSatellite
  it('process_insert_new_analyst_satellite_bad', () => {
    catalogManagerInstance.satData = [defaultSat];
    catalogManagerInstance.satCruncher = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    } as any;
    expect(() => catalogManagerInstance.insertNewAnalystSatellite(defaultSat.TLE1.slice(0, 68), defaultSat.TLE2, 0)).toThrow();
    expect(() => catalogManagerInstance.insertNewAnalystSatellite(defaultSat.TLE1, `${defaultSat.TLE2}0`, 0)).toThrow();
    expect(() => catalogManagerInstance.insertNewAnalystSatellite(defaultSat.TLE1, defaultSat.TLE2, 1)).toThrow();
  });
});

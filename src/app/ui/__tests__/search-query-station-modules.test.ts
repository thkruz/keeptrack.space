import { CatalogManager } from '@app/app/data/catalog-manager';
import { SearchResultType } from '@app/app/ui/search-manager';
import { runNumOnlySearch, runRegularSearch } from '@app/app/ui/search-query';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { settingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('search folds station modules into the host row (#459)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    // The loader skips module entries, so the catalog only holds the host and the free-flying objects.
    const objectCache = [
      new Satellite({ ...defaultSat, id: 0, name: 'ISS (ZARYA)', sccNum: '25544' }),
      new Satellite({ ...defaultSat, id: 1, name: 'ISS OBJECT YM', sccNum: '69796' }),
      new Satellite({ ...defaultSat, id: 2, name: 'CSS (TIANHE)', sccNum: '48274' }),
    ];

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      objectCache,
      numSatellites: 3,
      oemSatelliteIds: new Set<number>(),
      getObject: (id: number) => objectCache[id],
    } as unknown as CatalogManager);
    settingsManager.minimumSearchCharacters = 0;
    settingsManager.searchLimit = 100;
    settingsManager.isShowDecayedInSearch = true;
    settingsManager.searchableFields = { name: true, altName: true, bus: true, noradId: true, intlDes: true, launchVehicle: true };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('"ISS" lists the station once plus the free-flying ISS OBJECT', () => {
    const ids = runRegularSearch('ISS').results.map((r) => r.id);

    expect(ids).toEqual([0, 1]);
  });

  it('a module name finds the host row with a module hint', () => {
    const { results } = runRegularSearch('ZVEZDA');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 0, searchType: SearchResultType.MODULE, moduleName: 'Zvezda', moduleScc: '26400' });
  });

  it('a Tiangong module name finds Tianhe', () => {
    const { results } = runRegularSearch('MENGTIAN');

    expect(results[0]).toMatchObject({ id: 2, searchType: SearchResultType.MODULE, moduleName: 'Mengtian' });
  });

  it('a module NORAD number finds the host row', () => {
    const { results } = runNumOnlySearch('25575');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 0, searchType: SearchResultType.MODULE, moduleName: 'Unity', moduleScc: '25575' });
  });

  it('does not add module rows for unrelated queries', () => {
    expect(runRegularSearch('NAUKAX').results).toHaveLength(0);
    expect(runNumOnlySearch('12345').results).toHaveLength(0);
  });
});

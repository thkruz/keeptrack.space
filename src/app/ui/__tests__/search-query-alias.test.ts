import { CatalogManager } from '@app/app/data/catalog-manager';
import { SearchResultType } from '@app/app/ui/search-manager';
import { getSearchAlias, registerSearchAliasSource, runRegularSearch } from '@app/app/ui/search-query';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { settingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('search by watchlist alias', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    const objectCache = [new Satellite({ ...defaultSat, id: 0, name: 'COSMOS 1234', sccNum: '11111' }), new Satellite({ ...defaultSat, id: 1, name: 'ISS', sccNum: '25544' })];

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      objectCache,
      numSatellites: 2,
      oemSatelliteIds: new Set<number>(),
      getObject: (id: number) => objectCache[id],
    } as unknown as CatalogManager);
    settingsManager.minimumSearchCharacters = 0;
    settingsManager.searchLimit = 100;
    settingsManager.isShowDecayedInSearch = true;
    settingsManager.searchableFields = { name: true, altName: true, bus: true, noradId: true, intlDes: true, launchVehicle: true };
  });

  afterEach(() => {
    registerSearchAliasSource(null);
    vi.restoreAllMocks();
  });

  it('lists an object whose alias matches, tagged as an alias hit', () => {
    registerSearchAliasSource(() => new Map([[0, 'Candidate Zulu']]));
    const { results } = runRegularSearch('ZULU');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 0, searchType: SearchResultType.ALIAS, strIndex: 10, patlen: 4 });
    expect(getSearchAlias(0)).toBe('Candidate Zulu');
  });

  it('prefers a name match over the alias and lists the object once', () => {
    registerSearchAliasSource(() => new Map([[1, 'ISS twin']]));
    const { results } = runRegularSearch('ISS');

    expect(results).toHaveLength(1);
    expect(results[0].searchType).toBe(SearchResultType.OBJECT_NAME);
  });

  it('finds nothing by alias when no source is registered', () => {
    expect(runRegularSearch('ZULU').results).toHaveLength(0);
  });
});

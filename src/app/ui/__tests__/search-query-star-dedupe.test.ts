import { CatalogManager } from '@app/app/data/catalog-manager';
import { SearchResultType } from '@app/app/ui/search-manager';
import { runRegularSearch } from '@app/app/ui/search-query';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { settingsManager } from '@app/settings/settings';
import { Satellite, SpaceObjectType, Star } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('search lists each star once (#462)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    const makeStar = (id: number, name: string) => new Star({ id, name, type: SpaceObjectType.STAR, ra: 1, dec: 1, vmag: 3 } as ConstructorParameters<typeof Star>[0]);
    // The built-in star list and the HR catalog both carry Meissa.
    const objectCache = [new Satellite({ ...defaultSat, id: 0, name: 'ISS (ZARYA)', sccNum: '25544' }), makeStar(1, 'Meissa'), makeStar(2, 'Meissa'), makeStar(3, 'Betelgeuse')];

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      objectCache,
      numSatellites: objectCache.length,
      oemSatelliteIds: new Set<number>(),
      getObject: (id: number) => objectCache[id],
    } as unknown as CatalogManager);
    settingsManager.minimumSearchCharacters = 0;
    settingsManager.searchLimit = 100;
    settingsManager.isShowDecayedInSearch = true;
    settingsManager.searchableTypes = { ...settingsManager.searchableTypes, satellite: true, star: true };
    settingsManager.searchableFields = { name: true, altName: true, bus: true, noradId: true, intlDes: true, launchVehicle: true };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('"ISS" shows Meissa once', () => {
    const { results, totalFound } = runRegularSearch('ISS');
    const stars = results.filter((r) => r.searchType === SearchResultType.STAR);

    expect(stars).toHaveLength(1);
    expect(totalFound).toBe(results.length);
  });

  it('a different star is still listed', () => {
    const { results } = runRegularSearch('BETEL');

    expect(results.filter((r) => r.searchType === SearchResultType.STAR)).toHaveLength(1);
  });
});

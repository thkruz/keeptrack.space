import { CatalogManager } from '@app/app/data/catalog-manager';
import { runRegularSearch } from '@app/app/ui/search-query';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { settingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('search ranking', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    const objectCache = [
      new Satellite({ ...defaultSat, id: 0, name: 'UME (ISS)', sccNum: '1000' }),
      new Satellite({ ...defaultSat, id: 1, name: 'ISS DEB', sccNum: '1001' }),
      new Satellite({ ...defaultSat, id: 2, name: 'ISS (ZARYA)', sccNum: '25544' }),
      new Satellite({ ...defaultSat, id: 3, name: 'ISS', sccNum: '1002' }),
    ];

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      objectCache,
      numSatellites: objectCache.length,
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

  it('ranks the common-name object first, then exact names, then word prefixes, then substrings', () => {
    const { results, totalFound } = runRegularSearch('ISS');

    expect(totalFound).toBe(4);
    expect(results.map((r) => r.id)).toEqual([2, 3, 1, 0]);
  });

  it('keeps the boosted object when the result limit cuts the list', () => {
    settingsManager.searchLimit = 1;
    const { results } = runRegularSearch('ISS');

    expect(results.map((r) => r.id)).toEqual([2]);
  });

  it('finds the station from a multi-word common name that is not in the catalog name', () => {
    const { results } = runRegularSearch('INTERNATIONAL SPACE STATION');

    expect(results.map((r) => r.id)).toEqual([2]);
  });
});

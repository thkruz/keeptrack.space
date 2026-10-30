import { CatalogManager } from '@app/app/data/catalog-manager';
import { OemSatellite, ParsedOem } from '@app/app/objects/oem-satellite';
import { getOemNoradIds, isNeverDecayed, isReplacedByOemObject, runNumOnlySearch, runRegularSearch } from '@app/app/ui/search-query';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { DotsManager } from '@app/engine/rendering/dots-manager';
import { settingsManager } from '@app/settings/settings';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Satellite, Seconds, Vector3D } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const makeLucyOem = (): ParsedOem => {
  const startSec = Date.UTC(2026, 0, 1) / 1000;
  const sv = (t: number) =>
    new J2000(
      EpochUTC.fromDateTime(new Date((startSec + t) * 1000)),
      new Vector3D(7000 as Kilometers, 0 as Kilometers, 0 as Kilometers),
      new Vector3D(0 as KilometersPerSecond, 7.5 as KilometersPerSecond, 0 as KilometersPerSecond)
    );

  return {
    header: {
      START_TIME: new Date(startSec * 1000),
      STOP_TIME: new Date((startSec + 60) * 1000),
      CCSDS_OEM_VERS: '2.0',
      CREATION_DATE: '2026-01-01T00:00:00',
      ORIGINATOR: 'KeepTrack',
    },
    dataBlocks: [
      {
        metadata: {
          OBJECT_NAME: 'Lucy',
          OBJECT_ID: 'Lucy',
          CENTER_NAME: 'EARTH',
          REF_FRAME: 'EME2000',
          TIME_SYSTEM: 'UTC',
          START_TIME: '2026-01-01T00:00:00',
          STOP_TIME: '2026-01-01T00:01:00',
        },
        ephemeris: [sv(0), sv(30), sv(60)],
      },
    ],
  };
};

describe('search with a loaded OEM object that carries a catalog NORAD id', () => {
  let catalogLucy: Satellite;
  let oemLucy: OemSatellite;
  let positions: Float32Array;

  beforeEach(() => {
    setupStandardEnvironment();
    catalogLucy = new Satellite({ ...defaultSat, id: 0, name: 'LUCY', sccNum: '49328' });
    const other = new Satellite({ ...defaultSat, id: 1, name: 'LUCY DEBRIS', sccNum: '49329' });

    oemLucy = new OemSatellite(makeLucyOem());
    oemLucy.id = 2;

    const objectCache = [catalogLucy, other, oemLucy];

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({
      objectCache,
      numSatellites: 2,
      oemSatelliteIds: new Set([2]),
      getObject: (id: number) => objectCache[id],
    } as unknown as CatalogManager);

    // The catalog objects have a position; the OEM slot reads (0, 0, 0), as between a cruncher message and the next frame.
    positions = new Float32Array([7000, 0, 0, 7100, 0, 0, 0, 0, 0]);
    vi.spyOn(ServiceLocator, 'getDotsManager').mockReturnValue({
      positionData: positions,
      getCurrentPosition: (i: number) => ({ x: positions[i * 3], y: positions[i * 3 + 1], z: positions[i * 3 + 2] }),
    } as unknown as DotsManager);

    settingsManager.minimumSearchCharacters = 0;
    settingsManager.searchLimit = 100;
    settingsManager.isShowDecayedInSearch = false;
    settingsManager.searchableFields = { name: true, altName: true, bus: true, noradId: true, intlDes: true, launchVehicle: true };
  });

  afterEach(() => {
    settingsManager.isShowDecayedInSearch = true;
    vi.restoreAllMocks();
  });

  it('lists both Lucy rows while the OEM object has no NORAD id, and one Lucy row once it carries 49328', () => {
    const ids = () =>
      runRegularSearch('LUCY')
        .results.map((r) => r.id)
        .sort((a, b) => a - b);

    // Before the mission identity is applied both rows match "LUCY" (the old two-row behavior).
    expect(ids()).toEqual([0, 1, 2]);

    oemLucy.assignNoradId('49328');

    // The OEM entry wins: the catalog LUCY row is hidden, the unrelated 49329 row stays.
    expect(ids()).toEqual([1, 2]);
    expect(runNumOnlySearch('49328').results.map((r) => r.id)).toEqual([2]);
  });

  it('never drops an OEM object as decayed because its slot briefly reads (0, 0, 0)', () => {
    oemLucy.assignNoradId('49328');

    expect(runRegularSearch('LUCY').results.map((r) => r.id)).toContain(2);
    expect(isNeverDecayed(oemLucy)).toBe(true);
    expect(isNeverDecayed(catalogLucy)).toBe(false);
  });

  it('collects the NORAD ids of loaded OEM objects and only replaces non-OEM rows', () => {
    expect(getOemNoradIds().size).toBe(0);
    oemLucy.assignNoradId('49328');

    const ids = getOemNoradIds();

    expect([...ids]).toEqual(['49328']);
    expect(isReplacedByOemObject(catalogLucy, ids)).toBe(true);
    expect(isReplacedByOemObject(oemLucy, ids)).toBe(false);
    expect(isReplacedByOemObject(catalogLucy, new Set())).toBe(false);
  });

  it('keeps the catalog row once the mission is unloaded (slot freed)', () => {
    oemLucy.assignNoradId('49328');
    (ServiceLocator.getCatalogManager().oemSatelliteIds as Set<number>).delete(2);

    expect(runRegularSearch('LUCY').results.map((r) => r.id)).toContain(0);
  });
});

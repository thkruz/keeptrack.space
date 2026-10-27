import { CatalogLoader, JsSat, KeepTrackTLEFile } from '@app/app/data/catalog-loader';
import { isSyntheticVimpel } from '@app/app/data/synthetic-vimpel';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { BaseObject, Satellite, TleLine1, TleLine2 } from '@app/engine/ootk/src/main';
import { CatalogManagementPlugin } from '@app/plugins/catalog-management/catalog-management';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/*
 * "Only Import New Satellites" used to drop every JSC Vimpel object without a NORAD number (~4,600 of
 * them on the live catalog). These tests reproduce the cause through the real loader pipeline and
 * prove the fix: the existing catalog is split so those objects take the Vimpel path, as at boot.
 */

const ISS_TLE1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9002' as TleLine1;
const ISS_TLE2 = '2 25544  51.6400 208.9163 0006703 300.3030  59.7403 15.49560830434827' as TleLine2;

function checksum(body: string): number {
  let sum = 0;

  for (const ch of body.substring(0, 68)) {
    if (ch >= '0' && ch <= '9') {
      sum += Number(ch);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return sum % 10;
}

/** A JSC Vimpel line 1 without a NORAD number: catalog number 00000, 'V' class, Vimpel id in the designator field. */
const vimpelLine1 = (vimpelId: string): TleLine1 => {
  const body = `1 00000V ${vimpelId}    24001.50000000 +.00000000 +00000+0 +00000-0 0  999`;

  return `${body}${checksum(body)}` as TleLine1;
};

const VIMPEL: JsSat[] = ['26100', '26101', '26102'].map((id) => ({ TLE1: vimpelLine1(id), TLE2: ISS_TLE2 }));
const ISS_ROW = (): KeepTrackTLEFile => ({ tle1: ISS_TLE1, tle2: ISS_TLE2, name: 'ISS (ZARYA)', country: 'ISS' });

const satellites = (): Satellite[] => ServiceLocator.getCatalogManager().objectCache.filter((obj: BaseObject) => obj.isSatellite()) as Satellite[];

/** Load the catalog the way boot does: NORAD rows through keepTrackTle, Vimpel rows through the Vimpel path. */
const bootCatalog = (): void => {
  CatalogLoader.filterTLEDatabase(
    [ISS_ROW()],
    null,
    null,
    VIMPEL.map((row) => ({ ...row }))
  );
};

describe('CatalogManagementPlugin keeps JSC Vimpel objects on a new-only import', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('the boot catalog holds the ISS and three Vimpel objects without a NORAD number', () => {
    bootCatalog();

    expect(satellites()).toHaveLength(4);
    expect(satellites().filter((sat) => isSyntheticVimpel(sat))).toHaveLength(3);
  });

  it('cause: Vimpel objects fed back through keepTrackTle collapse onto one catalog number 00000 slot', () => {
    bootCatalog();
    // The pre-fix snapshot: every satellite became a keepTrackTle row (no source, catalog number 00000).
    const oldMerged: KeepTrackTLEFile[] = satellites().map((sat) => ({ tle1: sat.tle1, tle2: sat.tle2, name: sat.name }));

    CatalogLoader.filterTLEDatabase(oldMerged, null, null, null);

    // Two of the three Vimpel objects are dropped as duplicates of the first.
    expect(satellites()).toHaveLength(2);
    expect(satellites().filter((sat) => sat.tle1[7] === 'V')).toHaveLength(1);
  });

  it('snapshotCatalog sends Vimpel objects to the Vimpel path and keeps NORAD metadata', () => {
    bootCatalog();
    const { merged, vimpelCatalog } = CatalogManagementPlugin.snapshotCatalog(ServiceLocator.getCatalogManager().objectCache);

    expect(merged.map((row) => row.name)).toEqual(['ISS (ZARYA)']);
    expect(merged[0].country).toBe('ISS');
    expect(vimpelCatalog.map((row) => row.TLE1.substring(9, 14))).toEqual(['26100', '26101', '26102']);
  });

  it('snapshotCatalog leaves out the analyst slot block and keeps each source', () => {
    bootCatalog();
    const withScc = (line: string): string => {
      const body = `${line.substring(0, 2)}90005${line.substring(7, 68)}`;

      return `${body}${checksum(body)}`;
    };
    const analystSlot = new Satellite({
      id: 99,
      name: 'Analyst Sat 5',
      sccNum: '90005',
      country: 'ANALSAT',
      tle1: withScc(ISS_TLE1) as TleLine1,
      tle2: withScc(ISS_TLE2) as TleLine2,
    });
    // A real catalog object can carry a number inside the analyst block.
    const realInRange = new Satellite({ id: 100, name: 'REAL 90005', sccNum: '90005', country: 'US', tle1: analystSlot.tle1, tle2: analystSlot.tle2 });
    const iss = satellites().find((sat) => sat.sccNum === '25544') as Satellite;

    iss.source = 'spacetrack';
    const { merged } = CatalogManagementPlugin.snapshotCatalog([iss, analystSlot, realInRange]);

    // Every catalog load rebuilds the analyst slots, so a copy would add each one twice.
    expect(merged.map((row) => row.name)).toEqual(['ISS (ZARYA)', 'REAL 90005']);
    expect(merged[0].source).toBe('spacetrack');
  });

  it('fix: reloading the snapshot keeps every object with its Vimpel id and source', () => {
    bootCatalog();
    const before = satellites().map((sat) => sat.name);
    const { merged, vimpelCatalog } = CatalogManagementPlugin.snapshotCatalog(ServiceLocator.getCatalogManager().objectCache);

    CatalogLoader.filterTLEDatabase(merged, null, null, vimpelCatalog);

    expect(satellites().map((sat) => sat.name)).toEqual(before);
    expect(
      satellites()
        .filter((sat) => isSyntheticVimpel(sat))
        .map((sat) => sat.altId)
    ).toEqual(['26100', '26101', '26102']);
  });

  it('importNewSatsOnly_ passes the Vimpel objects to the reload next to the merged rows', async () => {
    const plugin = new CatalogManagementPlugin();

    websiteInit(plugin);
    bootCatalog();
    const reload = vi.spyOn(CatalogLoader, 'reloadCatalogFromData').mockResolvedValue();
    const newSat = [
      'E2E-One',
      '1 88881U 26001A   24001.50000000  .00016717  00000-0  10270-3 0  9002',
      '2 88881  51.6400 208.9163 0006703 300.3030  59.7403 15.49560830434827',
    ].join('\n');

    const added = await (plugin as unknown as { importNewSatsOnly_(content: string): Promise<number> }).importNewSatsOnly_(newSat);

    expect(added).toBe(1);
    expect(reload).toHaveBeenCalledTimes(1);
    const [merged, vimpelCatalog] = reload.mock.calls[0];

    expect(merged.map((row) => row.name)).toEqual(['ISS (ZARYA)', 'E2E-One']);
    expect(vimpelCatalog).toHaveLength(3);
  });
});

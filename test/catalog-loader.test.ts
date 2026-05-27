import { vi } from 'vitest';
import { CatalogLoader } from '@app/app/data/catalog-loader';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { AsciiTleSat } from '@app/app/data/catalog-loader';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite } from '@app/engine/ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { readFileSync } from 'fs';

describe('Catalog Loader', () => {
  beforeAll(() => {
    setupStandardEnvironment();
  });

  beforeEach(() => {
    const tle = readFileSync('./test/environment/TLE2.json');
    const json = JSON.parse(tle.toString());

    // Mock fetch for this test
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve(json),
        text: () => Promise.resolve(''),
        ok: true,
        status: 200,
      } as Response),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.getInstance().unregisterAllEvents();
    settingsManager.isStarlinkOnly = false;
  });

  it('should load the catalog', async () => {
    settingsManager.isDisableAsciiCatalog = true;
    await CatalogLoader.load();
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('does not throw when a keepTrackTle entry is missing name (regression: #1349)', async () => {
    settingsManager.isStarlinkOnly = true;

    const nameless = [
      {
        tle1: '1 25544U 98067A   24001.00000000  .00000000  00000-0  00000-0 0  0000',
        tle2: '2 25544  51.6400 000.0000 0000000   0.0000   0.0000 15.50000000000000',
      },
    ];

    await expect(CatalogLoader.parse({ keepTrackTle: nameless as never })).resolves.not.toThrow();
  });

  it('preserves a 9-digit ID end-to-end via externalCatalog', async () => {
    // Mirror what parseAsciiCsv_ builds for a CelesTrak supplemental row.
    const sat = Satellite.fromOmm({
      OBJECT_NAME: 'STARLINK-37402',
      OBJECT_ID: '2026-114A',
      EPOCH: '2026-05-26T00:00:00.000000',
      MEAN_MOTION: 15.5,
      ECCENTRICITY: 0.0001137,
      INCLINATION: 53.16,
      RA_OF_ASC_NODE: 100,
      ARG_OF_PERICENTER: 0,
      MEAN_ANOMALY: 0,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: '799500766',
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    });
    const externalCatalog: AsciiTleSat[] = [{
      SCC: sat.sccNum,
      ON: 'STARLINK-37402',
      TLE1: sat.tle1,
      TLE2: sat.tle2,
    }];

    await CatalogLoader.parse({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(externalCatalog),
    });

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const id = catalogManagerInstance.sccIndex['799500766'];

    expect(id).toBeDefined();
    const loaded = catalogManagerInstance.objectCache[id];

    expect((loaded as Satellite).sccNum).toBe('799500766');
    expect((loaded as Satellite).sccNum5).toBeNull();
    // TLE column 3-7 carries the last-5-digit tail.
    expect((loaded as Satellite).tle1.substring(2, 7)).toBe('00766');
  });

  it('awaits beforeFilterTLEDatabase listeners before filterTLEDatabase runs', async () => {
    const callOrder: string[] = [];

    EventBus.getInstance().on(EventBusEvent.beforeFilterTLEDatabase, async () => {
      // Two microtask hops — proves emitAsync awaits the listener fully
      // before filterTLEDatabase runs (would push 'filterTLEDatabase' first
      // if the event were not awaited).
      await Promise.resolve();
      await Promise.resolve();
      callOrder.push('listener');
    });

    const filterSpy = vi.spyOn(CatalogLoader, 'filterTLEDatabase').mockImplementation(() => {
      callOrder.push('filterTLEDatabase');
    });

    await CatalogLoader.parse({ keepTrackTle: [] });

    expect(filterSpy).toHaveBeenCalled();
    expect(callOrder).toEqual(['listener', 'filterTLEDatabase']);
  });
});

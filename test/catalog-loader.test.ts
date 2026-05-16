import { vi } from 'vitest';
import { CatalogLoader } from '@app/app/data/catalog-loader';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
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

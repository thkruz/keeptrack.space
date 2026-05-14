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
  });

  it('should load the catalog', async () => {
    settingsManager.isDisableAsciiCatalog = true;
    await CatalogLoader.load();
    expect(globalThis.fetch).toHaveBeenCalled();
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

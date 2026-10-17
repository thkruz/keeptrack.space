import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * Restore ordering: a link with both search= and sat=/intldes= must run the search first and
 * apply the selection after it, because doSearch hides the info box.
 */
const setLocation = (q: string) => window.history.replaceState(null, '', q);

describe('UrlManager restore order (search + sat/intldes)', () => {
  let calls: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Url = UrlManager as any;

  beforeEach(() => {
    setupStandardEnvironment();
    calls = [];
    settingsManager.disableUI = false;
    ServiceLocator.getUiManager().doSearch = vi.fn(() => {
      calls.push('search');
    }) as never;
    ServiceLocator.getCatalogManager().satCruncherThread = null as never;
    vi.spyOn(Url, 'handleSatParam_').mockImplementation(() => {
      calls.push('sat');
    });
    vi.spyOn(Url, 'handleIntldesParam_').mockImplementation(() => {
      calls.push('intldes');
    });
    settingsManager.lastSearchResults = [{ id: 1 }] as never;
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('runs the search before sat when both are present', () => {
    setLocation('?sat=60397&search=2024-140');
    UrlManager.parseGetVariables(settingsManager);
    EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);

    expect(calls.filter((c) => c === 'search' || c === 'sat').slice(-2)).toStrictEqual(['search', 'sat']);
  });

  it('runs the search before intldes when both are present', () => {
    setLocation('?intldes=2024-140A&search=2024-140');
    UrlManager.parseGetVariables(settingsManager);
    EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);

    expect(calls.filter((c) => c === 'search' || c === 'intldes').slice(-2)).toStrictEqual(['search', 'intldes']);
  });

  it('still selects immediately for a sat-only link', () => {
    setLocation('?sat=60397');
    UrlManager.parseGetVariables(settingsManager);
    calls.length = 0;
    EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady);

    expect(calls).toContain('sat');
    expect(calls).not.toContain('search');
  });
});

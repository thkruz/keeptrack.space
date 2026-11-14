import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { hasBottomIcon, hasHelp, hasSideMenu } from '@app/engine/plugins/core/plugin-capabilities';
import { getEl } from '@app/engine/utils/get-el';
import { formatListAge, MOST_TRACKED_RETRY_MS, MostTracked } from '@app/plugins/most-tracked/most-tracked';
import { MOST_TRACKED_MAX_ROWS, parseMostTrackedList, parseMostTrackedResponse, relativePopularity } from '@app/plugins/most-tracked/most-tracked-data';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

// The standard test catalog holds a single object, NORAD 00005 at index 0.
const KNOWN_NORAD = '00005';
const MISSING_NORAD = '99999';

// Same shape as GET https://api.keeptrack.space/v4/stats/most-tracked (#1463).
const payload = {
  generated_at: '2026-11-14T12:00:00Z',
  window_hours: 24,
  top: [
    { rank: 1, norad_cat_id: KNOWN_NORAD, count: 400 },
    { rank: 2, norad_cat_id: MISSING_NORAD, count: 100 },
  ],
  trending: [{ rank: 1, norad_cat_id: KNOWN_NORAD, count: 50 }],
};

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internals = (plugin: MostTracked) => plugin as any;

describe('MostTracked_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSuite(MostTracked, 'MostTracked');
  standardPluginMenuButtonTests(MostTracked, 'MostTracked');
});

describe('MostTracked_capabilities', () => {
  let plugin: MostTracked;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new MostTracked();
  });

  it('has a bottom icon, a side menu and help', () => {
    expect(hasBottomIcon(plugin)).toBe(true);
    expect(hasSideMenu(plugin)).toBe(true);
    expect(hasHelp(plugin)).toBe(true);
    expect(plugin.getSideMenuConfig().elementName).toBe('most-tracked-menu');
  });

  it('builds both tabs and the refresh button in the side menu', () => {
    const menuHtml = plugin.getSideMenuConfig().html;

    expect(menuHtml).toContain('most-tracked-top-tab');
    expect(menuHtml).toContain('most-tracked-trending-tab');
    expect(menuHtml).toContain('most-tracked-refresh-btn');
  });

  it('uses the base plugin offline handling', () => {
    expect(plugin.requiresInternet).toBe(true);
  });
});

describe('MostTracked data parsing', () => {
  it('parses a valid payload', () => {
    const data = parseMostTrackedResponse(payload);

    expect(data?.windowHours).toBe(24);
    expect(data?.generatedAt?.toISOString()).toBe('2026-11-14T12:00:00.000Z');
    expect(data?.top.map((e) => e.norad)).toEqual([KNOWN_NORAD, MISSING_NORAD]);
    expect(data?.trending).toHaveLength(1);
  });

  it('rejects payloads without either list', () => {
    expect(parseMostTrackedResponse(null)).toBeNull();
    expect(parseMostTrackedResponse([])).toBeNull();
    expect(parseMostTrackedResponse({ foo: 1 })).toBeNull();
  });

  it('accepts a payload with only one list', () => {
    const data = parseMostTrackedResponse({ top: [{ norad_cat_id: '25544', count: 3 }] });

    expect(data?.top).toEqual([{ rank: 1, norad: '25544', count: 3 }]);
    expect(data?.trending).toEqual([]);
    expect(data?.generatedAt).toBeNull();
    expect(data?.windowHours).toBeNull();
  });

  it('ignores an unparseable generated_at and a non-positive window_hours', () => {
    const data = parseMostTrackedResponse({ ...payload, generated_at: 'not a date', window_hours: 0 });

    expect(data?.generatedAt).toBeNull();
    expect(data?.windowHours).toBeNull();
  });

  it('drops bad rows, keeps the best rank of duplicates and renumbers', () => {
    const list = parseMostTrackedList([
      { rank: 3, norad_cat_id: '1', count: 5 },
      { rank: 1, norad_cat_id: '', count: 9 },
      { rank: 2, norad_cat_id: '2', count: -1 },
      { rank: 4, norad_cat_id: '1', count: 7 },
      { rank: 5, norad_cat_id: '3', count: Number.NaN },
      'junk',
      { rank: 6, norad_cat_id: '4', count: 2 },
    ]);

    expect(list).toEqual([
      { rank: 1, norad: '1', count: 5 },
      { rank: 2, norad: '4', count: 2 },
    ]);
  });

  it('keeps NORAD ids as strings, including 6-digit ids', () => {
    expect(parseMostTrackedList([{ rank: 1, norad_cat_id: '100855', count: 2 }])[0].norad).toBe('100855');
  });

  it('gives tied counts the same rank', () => {
    // The live endpoint currently returns mostly count 1 (low traffic).
    const list = parseMostTrackedList([
      { rank: 1, norad_cat_id: '25544', count: 3 },
      { rank: 2, norad_cat_id: '57770', count: 2 },
      { rank: 3, norad_cat_id: '7213', count: 2 },
      { rank: 4, norad_cat_id: '100533', count: 1 },
      { rank: 5, norad_cat_id: '100855', count: 1 },
    ]);

    expect(list.map((e) => e.rank)).toEqual([1, 2, 2, 4, 4]);
  });

  it('falls back to array order when rank is missing', () => {
    expect(
      parseMostTrackedList([
        { norad_cat_id: 'B', count: 1 },
        { norad_cat_id: 'A', count: 2 },
      ]).map((e) => e.norad)
    ).toEqual(['B', 'A']);
  });

  it('caps each list at the maximum row count', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ rank: i + 1, norad_cat_id: String(i + 1), count: 40 - i }));

    expect(parseMostTrackedList(rows)).toHaveLength(MOST_TRACKED_MAX_ROWS);
  });

  it('formats the list age relative to now', () => {
    const now = Date.parse('2026-11-14T12:00:00Z');

    expect(formatListAge(new Date(now - 5 * 60_000), now, 'en')).toBe('5 minutes ago');
    expect(formatListAge(new Date(now - 2 * 3_600_000), now, 'en')).toBe('2 hours ago');
    expect(formatListAge(new Date(now - 10_000), now, 'en')).toBe('this minute');
    // A server clock slightly ahead never yields "in 1 minute".
    expect(formatListAge(new Date(now + 30_000), now, 'en')).toBe('this minute');
  });

  it('computes relative popularity as a whole percent', () => {
    expect(relativePopularity(50, 100)).toBe(50);
    expect(relativePopularity(100, 100)).toBe(100);
    expect(relativePopularity(1, 1000)).toBe(1);
    expect(relativePopularity(0, 100)).toBe(0);
    expect(relativePopularity(5, 0)).toBe(0);
  });
});

describe('MostTracked fetching and rendering', () => {
  let plugin: MostTracked;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new MostTracked();
    websiteInit(plugin);
    // The app indexes catalog numbers in canonical form (no leading zeros); the shared fixture still uses '00005'.
    ServiceLocator.getCatalogManager().sccIndex = { 5: 0 };
    settingsManager.isEmbedMode = false;
    settingsManager.offlineMode = false;
    fetchMock = vi.fn().mockResolvedValue(okResponse(payload));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders both lists and a ready status after a fetch', async () => {
    await internals(plugin).fetchData_();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getEl('most-tracked-top-list')?.querySelectorAll('.most-tracked-row')).toHaveLength(2);
    expect(getEl('most-tracked-trending-list')?.querySelectorAll('.most-tracked-row')).toHaveLength(1);
    expect(getEl('most-tracked-status')?.dataset.status).toBe('ready');
    expect(getEl('most-tracked-top-empty')?.hidden).toBe(true);
  });

  it('greys out rows for objects that are not in the loaded catalog', async () => {
    await internals(plugin).fetchData_();

    const rows = getEl('most-tracked-top-list')?.querySelectorAll<HTMLButtonElement>('button.most-tracked-row') ?? [];

    expect(rows[0].disabled).toBe(false);
    expect(rows[1].disabled).toBe(true);
    expect(rows[1].closest('li')?.getAttribute('kt-tooltip')).toBeTruthy();
  });

  it('writes catalog text with textContent, never as HTML', async () => {
    const catalogManager = ServiceLocator.getCatalogManager();
    const original = catalogManager.getObject.bind(catalogManager);

    vi.spyOn(catalogManager, 'getObject').mockImplementation((id) => {
      const obj = original(id);

      return obj ? ({ ...obj, name: '<img src=x onerror=alert(1)>' } as typeof obj) : obj;
    });

    await internals(plugin).fetchData_();

    const list = getEl('most-tracked-top-list');

    expect(list?.querySelector('img')).toBeNull();
    expect(list?.querySelector('.most-tracked-name')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('selects the object when a row is clicked, and ignores missing rows', async () => {
    const selectSat = vi.fn();

    await internals(plugin).fetchData_();
    // Mock after rendering so the tooltip lookup during render gets the real registry.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat } as any);

    const rows = getEl('most-tracked-top-list')?.querySelectorAll<HTMLButtonElement>('button.most-tracked-row') ?? [];

    // A disabled button never fires click; dispatch directly to prove the handler also ignores it.
    rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(selectSat).not.toHaveBeenCalled();

    rows[0].click();
    expect(selectSat).toHaveBeenCalledWith(0);
  });

  it('fetches the documented endpoint with a plain request (no API key header)', async () => {
    await internals(plugin).fetchData_();

    expect(fetchMock).toHaveBeenCalledWith('https://api.keeptrack.space/v4/stats/most-tracked');
  });

  it('makes the menu unavailable without a toast on 503, then recovers', async () => {
    vi.useFakeTimers();
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    fetchMock.mockResolvedValue({ ok: false, status: 503, json: () => Promise.resolve({ error: 'Usage data unavailable' }) });
    await internals(plugin).fetchData_();

    expect(plugin.isIconDisabled).toBe(true);
    expect(plugin.getDisabledReason()).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();

    // While unavailable, opening again does not hammer the endpoint.
    await internals(plugin).fetchData_();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(MOST_TRACKED_RETRY_MS);
    expect(plugin.isIconDisabled).toBe(false);
    expect(plugin.getDisabledReason()).toBeNull();
    vi.useRealTimers();
  });

  it('treats an unreachable endpoint as unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await internals(plugin).fetchData_();

    expect(plugin.isIconDisabled).toBe(true);
  });

  it('treats an unexpected payload as unavailable', async () => {
    fetchMock.mockResolvedValue(okResponse({ unexpected: true }));
    await internals(plugin).fetchData_();

    expect(plugin.isIconDisabled).toBe(true);
  });

  it('shows the empty state when a list comes back empty', async () => {
    fetchMock.mockResolvedValue(okResponse({ top: [], trending: [] }));
    await internals(plugin).fetchData_();

    expect(getEl('most-tracked-top-empty')?.hidden).toBe(false);
    expect(getEl('most-tracked-trending-empty')?.hidden).toBe(false);
  });

  it('does not fetch in embed mode', async () => {
    settingsManager.isEmbedMode = true;
    await internals(plugin).fetchData_();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('disables Refresh while a fetch is in flight', async () => {
    let resolveFetch: (value: Response) => void = () => undefined;

    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const pending = internals(plugin).fetchData_();
    const refreshBtn = getEl('most-tracked-refresh-btn') as HTMLButtonElement;

    expect(refreshBtn.disabled).toBe(true);
    expect(refreshBtn.getAttribute('aria-busy')).toBe('true');

    resolveFetch(okResponse(payload));
    await pending;

    expect(refreshBtn.disabled).toBe(false);
  });

  it('shows the last lists immediately on reopen and refetches', async () => {
    await internals(plugin).fetchData_();
    getEl('most-tracked-top-list')?.replaceChildren();

    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();

    expect(getEl('most-tracked-top-list')?.querySelectorAll('button.most-tracked-row')).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

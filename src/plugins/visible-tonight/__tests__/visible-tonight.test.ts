import { SensorMath } from '@app/app/sensors/sensor-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { hasBottomIcon, hasHelp, hasSideMenu } from '@app/engine/plugins/core/plugin-capabilities';
import { getEl } from '@app/engine/utils/get-el';
import { findPassesForSat } from '@app/plugins/best-pass/best-pass-calculator';
import { dayLabel, formatCoords, parseCoordinate, VisibleTonight } from '@app/plugins/visible-tonight/visible-tonight';
import { VisiblePass } from '@app/plugins/visible-tonight/visible-tonight-calc';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { saveAs } from 'file-saver';
import { vi } from 'vitest';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
// The pass search itself is covered by best-pass-calculator's tests; here only its output matters.
vi.mock('@app/plugins/best-pass/best-pass-calculator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@app/plugins/best-pass/best-pass-calculator')>()),
  findPassesForSat: vi.fn(() => ({ passes: [], truncated: false })),
}));

// The standard test catalog holds a single object, NORAD 00005 at index 0.
const KNOWN_NORAD = '00005';
const START = Date.UTC(2026, 10, 16, 23, 42, 0);

const pass = (overrides: Partial<VisiblePass> = {}): VisiblePass => ({
  norad: KNOWN_NORAD,
  name: 'ISS (ZARYA)',
  startMs: START,
  peakMs: START + 3 * 60_000,
  endMs: START + 6 * 60_000,
  startAz: 225,
  endAz: 45,
  peakEl: 68,
  mag: -2.1,
  level: 'veryBright',
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internals = (plugin: VisibleTonight) => plugin as any;

const showPasses = (plugin: VisibleTonight, passes: VisiblePass[]) => {
  internals(plugin).observer_ = { lat: 40, lon: -75, altKm: 0 };
  internals(plugin).passes_ = passes;
  internals(plugin).setStatus_('ready');
};

describe('VisibleTonight_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSuite(VisibleTonight, 'VisibleTonight');
  standardPluginMenuButtonTests(VisibleTonight, 'VisibleTonight');
});

describe('VisibleTonight_capabilities', () => {
  let plugin: VisibleTonight;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new VisibleTonight();
  });

  it('has a bottom icon, a side menu and help', () => {
    expect(hasBottomIcon(plugin)).toBe(true);
    expect(hasSideMenu(plugin)).toBe(true);
    expect(hasHelp(plugin)).toBe(true);
    expect(plugin.getSideMenuConfig().elementName).toBe('visible-tonight-menu');
  });

  it('follows the v13 menu checklist: resizable, Data Actions and Results cards, kt-note', () => {
    const container = document.createElement('div');

    container.innerHTML = plugin.getSideMenuConfig().html;
    const labels = [...container.querySelectorAll('.kt-section-label')].map((el) => el.textContent);

    expect(plugin.getSideMenuConfig().dragOptions).toEqual({ isDraggable: true, minWidth: 400, maxWidth: 550 });
    expect(labels).toEqual(['Data Actions', 'Results']);
    expect(container.querySelector('#visible-tonight-locate-btn')?.closest('section')?.querySelector('#visible-tonight-status')).not.toBeNull();
    expect(container.querySelector('p.kt-note')).not.toBeNull();
    expect(container.querySelector('sub, h5')).toBeNull();
  });

  it('works offline: everything is computed in the browser', () => {
    expect(plugin.requiresInternet).toBe(false);
  });

  it('has no settings: the only inputs are the optional latitude and longitude', () => {
    const container = document.createElement('div');

    container.innerHTML = plugin.getSideMenuConfig().html;

    expect(container.querySelector('#visible-tonight-locate-btn')).not.toBeNull();
    expect(container.querySelector('select')).toBeNull();
    expect([...container.querySelectorAll('input')].map((el) => el.id)).toEqual(['visible-tonight-lat', 'visible-tonight-lon']);
  });
});

describe('VisibleTonight_flow', () => {
  let plugin: VisibleTonight;
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new VisibleTonight();
    websiteInit(plugin);
    ServiceLocator.getCatalogManager().sccIndex = { 5: 0 };
    vi.mocked(saveAs).mockClear();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { value: originalGeolocation, configurable: true });
    vi.restoreAllMocks();
  });

  const mockGeolocation = (impl: (ok: PositionCallback, fail: PositionErrorCallback) => void) => {
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: vi.fn(impl) }, configurable: true });
  };

  it('starts by offering the location button', () => {
    expect(getEl('visible-tonight-status')?.dataset.status).toBe('needLocation');
    expect((getEl('visible-tonight-locate-btn') as HTMLButtonElement).hidden).toBe(false);
  });

  it('only asks for the location when the button is pressed', () => {
    mockGeolocation(() => undefined);
    plugin.onBottomIconClick();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();

    getEl('visible-tonight-locate-btn')?.click();
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getEl('visible-tonight-status')?.dataset.status).toBe('locating');
  });

  it('explains a refused location and keeps the button', () => {
    mockGeolocation((_ok, fail) => fail({ code: 1, message: 'denied' } as GeolocationPositionError));
    getEl('visible-tonight-locate-btn')?.click();

    expect(getEl('visible-tonight-status')?.dataset.status).toBe('denied');
    expect((getEl('visible-tonight-locate-btn') as HTMLButtonElement).hidden).toBe(false);
  });

  it('searches once the location arrives', () => {
    const search = vi.spyOn(internals(plugin), 'search_').mockImplementation(() => Promise.resolve());

    mockGeolocation((ok) => ok({ coords: { latitude: 51.5, longitude: -0.1, altitude: null } } as GeolocationPosition));
    getEl('visible-tonight-locate-btn')?.click();

    expect(search).toHaveBeenCalledTimes(1);
    expect(internals(plugin).observer_).toEqual({ lat: 51.5, lon: -0.1, altKm: 0 });
  });

  it('says so when no searchable objects are loaded', async () => {
    internals(plugin).observer_ = { lat: 40, lon: -75, altKm: 0 };
    await internals(plugin).search_();

    expect(getEl('visible-tonight-status')?.dataset.status).toBe('noCatalog');
  });

  it('renders passes in plain language with textContent only', () => {
    showPasses(plugin, [pass({ name: '<img src=x onerror=alert(1)>' })]);

    const list = getEl('visible-tonight-list') as HTMLOListElement;

    expect(list.children).toHaveLength(1);
    expect(list.querySelector('img')).toBeNull();
    expect(list.querySelector('.visible-tonight-name')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(list.querySelector('.visible-tonight-path')?.textContent).toContain('SW');
    expect(list.querySelector('.visible-tonight-path')?.textContent).toContain('NE');
    expect(list.querySelector('.visible-tonight-meta--veryBright')).not.toBeNull();
    expect(getEl('visible-tonight-results')?.hidden).toBe(false);
    // With a known location the action becomes Refresh (Reentries' shared key).
    expect(getEl('visible-tonight-locate-label')?.textContent).toBe('Refresh');
  });

  it('Refresh searches again without asking for the location again', () => {
    const search = vi.spyOn(internals(plugin), 'search_').mockImplementation(() => Promise.resolve());

    mockGeolocation(() => undefined);
    showPasses(plugin, [pass()]);
    getEl('visible-tonight-locate-btn')?.click();

    expect(search).toHaveBeenCalledTimes(1);
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('shows a friendly empty state', () => {
    showPasses(plugin, []);

    expect(getEl('visible-tonight-status')?.dataset.status).toBe('ready');
    expect(getEl('visible-tonight-list')?.children).toHaveLength(0);
    // No empty Results card: the status line explains it.
    expect(getEl('visible-tonight-results')?.hidden).toBe(true);
    expect(getEl('visible-tonight-status')?.textContent).not.toBe('');
  });

  it('tapping a pass selects the object and jumps the clock to its peak', () => {
    const selectSat = vi.fn();
    const changeSimulationTime = vi.spyOn(ServiceLocator.getTimeManager(), 'changeSimulationTime').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat } as any);
    showPasses(plugin, [pass()]);
    const button = document.querySelector<HTMLButtonElement>('#visible-tonight-list .visible-tonight-row');

    expect(button).not.toBeNull();
    button?.click();

    expect(changeSimulationTime).toHaveBeenCalledWith(START + 3 * 60_000);
    expect(selectSat).toHaveBeenCalledWith(0);
  });

  it('Add to calendar downloads a one-event .ics without selecting anything', () => {
    const selectSat = vi.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectSat } as any);
    showPasses(plugin, [pass()]);
    const button = document.querySelector<HTMLButtonElement>('#visible-tonight-list .visible-tonight-calendar');

    expect(button).not.toBeNull();
    button?.click();

    expect(saveAs).toHaveBeenCalledTimes(1);
    const [blob, fileName] = vi.mocked(saveAs).mock.calls[0] as [Blob, string];

    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(fileName).toBe('iss-2026-11-16-2342.ics');
    expect(selectSat).not.toHaveBeenCalled();
  });

  it('reopening with a known location searches again so "tonight" stays current', () => {
    const search = vi.spyOn(internals(plugin), 'search_').mockImplementation(() => Promise.resolve());

    internals(plugin).observer_ = { lat: 40, lon: -75, altKm: 0 };
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();

    expect(search).toHaveBeenCalledTimes(1);
  });
});

describe('VisibleTonight dayLabel', () => {
  const at = (h: number, dayOffset = 0) => {
    const d = new Date(2026, 10, 16 + dayOffset, h, 30);

    return d.getTime();
  };
  const now = at(12);

  it('uses Tonight for this evening and Today for earlier', () => {
    expect(dayLabel(at(19), now)).toBe('Tonight');
    expect(dayLabel(at(13), now)).toBe('Today');
  });

  it('uses Tomorrow, then the weekday', () => {
    expect(dayLabel(at(5, 1), now)).toBe('Tomorrow');
    expect(dayLabel(at(19, 2), now)).toBe('Wednesday');
  });
});

describe('VisibleTonight location editing (#1468)', () => {
  let plugin: VisibleTonight;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new VisibleTonight();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const input = (id: string) => getEl(id) as HTMLInputElement;
  const submit = () => getEl('visible-tonight-location-form')?.dispatchEvent(new Event('submit', { cancelable: true }));

  it('offers to type a location before any is known', () => {
    expect(getEl('visible-tonight-edit-btn')?.textContent).toBe('Enter a location instead');
    expect(getEl('visible-tonight-location-form')?.hidden).toBe(true);
  });

  it('shows the detected location with Change, and the form starts filled with it', () => {
    internals(plugin).observer_ = { lat: 40.7128, lon: -74.006, altKm: 0 };
    internals(plugin).render_();

    expect(getEl('visible-tonight-location-text')?.textContent).toBe('Location: 40.71° N, 74.01° W');
    expect(getEl('visible-tonight-edit-btn')?.textContent).toBe('Change');

    getEl('visible-tonight-edit-btn')?.click();

    expect(getEl('visible-tonight-location-form')?.hidden).toBe(false);
    expect((getEl('visible-tonight-locate-btn') as HTMLButtonElement).hidden).toBe(true);
    expect(input('visible-tonight-lat').value).toBe('40.7128');
    expect(input('visible-tonight-lon').value).toBe('-74.0060');
  });

  it('rejects an out-of-range location and keeps the form open', () => {
    const search = vi.spyOn(internals(plugin), 'search_').mockImplementation(() => Promise.resolve());

    getEl('visible-tonight-edit-btn')?.click();
    input('visible-tonight-lat').value = '91';
    input('visible-tonight-lon').value = '10';
    submit();

    expect(search).not.toHaveBeenCalled();
    expect(getEl('visible-tonight-location-error')?.textContent).toContain('-90 and 90');
    expect(getEl('visible-tonight-location-form')?.hidden).toBe(false);
  });

  it('uses a typed location, so people can plan for somewhere else', () => {
    const search = vi.spyOn(internals(plugin), 'search_').mockImplementation(() => Promise.resolve());

    getEl('visible-tonight-edit-btn')?.click();
    input('visible-tonight-lat').value = '-33.8688';
    input('visible-tonight-lon').value = '151,2093';
    submit();

    expect(internals(plugin).observer_).toEqual({ lat: -33.8688, lon: 151.2093, altKm: 0 });
    expect(search).toHaveBeenCalledTimes(1);
    expect(getEl('visible-tonight-location-form')?.hidden).toBe(true);
  });

  it('Cancel closes the form without changing anything', () => {
    internals(plugin).observer_ = { lat: 1, lon: 2, altKm: 0 };
    getEl('visible-tonight-edit-btn')?.click();
    input('visible-tonight-lat').value = '50';
    getEl('visible-tonight-cancel-btn')?.click();

    expect(getEl('visible-tonight-location-form')?.hidden).toBe(true);
    expect(internals(plugin).observer_).toEqual({ lat: 1, lon: 2, altKm: 0 });
  });
});

describe('VisibleTonight coordinate helpers', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('formats hemispheres with compass letters', () => {
    expect(formatCoords(-33.8688, 151.2093)).toBe('33.87° S, 151.21° E');
  });

  it('parses typed coordinates, including a decimal comma, within range only', () => {
    expect(parseCoordinate(' 40.7128 ', 90)).toBe(40.7128);
    expect(parseCoordinate('-74,006', 180)).toBe(-74.006);
    expect(parseCoordinate('90.0001', 90)).toBeNull();
    expect(parseCoordinate('', 90)).toBeNull();
    expect(parseCoordinate('12abc', 90)).toBeNull();
    expect(parseCoordinate('1e2', 180)).toBeNull();
  });
});

describe('VisibleTonight shared rules (#1468)', () => {
  const DAY = 86_400_000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statics = VisibleTonight as any;

  /** A fake ISS whose element set epoch is `ageDays` before now. */
  const satWithEpochAge = (ageDays: number) => {
    const epochMs = Date.now() - ageDays * DAY;
    const year = new Date(epochMs).getUTCFullYear();

    return {
      sccNum: '25544',
      name: 'ISS (ZARYA)',
      type: 1,
      satrec: {},
      epochYear: year % 100,
      epochDay: (epochMs - Date.UTC(year, 0, 1)) / DAY + 1,
    };
  };
  const row = (startMs: number) => ({ START_DTG: startMs, TIME_IN_COVERAGE_SECONDS: 300 });

  beforeEach(() => {
    setupStandardEnvironment();
    vi.mocked(findPassesForSat).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drops passes whose element set is stale at the pass start (gp-age, 72 h by default)', () => {
    const now = Date.now();
    const onStale = vi.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(findPassesForSat).mockReturnValue({ passes: [row(now + 10 * 3_600_000), row(now + 2.5 * DAY)] as any, truncated: false });
    const sensor = statics.observerSensor_({ lat: 40, lon: -74, altKm: 0 });
    const passes = statics.target_(satWithEpochAge(2), sensor, 72, onStale).passes(now, now + 3 * DAY);

    // Pass 1 is 58 h after the epoch (kept); pass 2 is 108 h after it (stale, dropped).
    expect(passes).toEqual([{ riseMs: now + 10 * 3_600_000, setMs: now + 10 * 3_600_000 + 300_000 }]);
    expect(onStale).toHaveBeenCalledTimes(1);
    expect(onStale).toHaveBeenCalledWith('pass');
  });

  it('does not even search an object that is already stale (e.g. the offline catalog)', () => {
    const now = Date.now();
    const onStale = vi.fn();
    const sensor = statics.observerSensor_({ lat: 40, lon: -74, altKm: 0 });

    expect(statics.target_(satWithEpochAge(200), sensor, 72, onStale).passes(now, now + 3 * DAY)).toEqual([]);
    expect(findPassesForSat).not.toHaveBeenCalled();
    expect(onStale).toHaveBeenCalledWith('object');
  });

  it('says the data is too old when staleness is the only reason the list is empty', async () => {
    const plugin = new VisibleTonight();

    websiteInit(plugin);
    vi.spyOn(statics, 'candidates_').mockReturnValue([satWithEpochAge(200)]);
    internals(plugin).observer_ = { lat: 40, lon: -74, altKm: 0 };
    const searching = internals(plugin).search_();

    // The search yields to the renderer between objects; tests run on fake timers.
    await vi.runAllTimersAsync();
    await searching;

    expect(getEl('visible-tonight-status')?.dataset.status).toBe('staleCatalog');
  });

  it('still says "no bright passes" when only some late passes were dropped as stale (live data)', async () => {
    const plugin = new VisibleTonight();
    const now = Date.now();

    websiteInit(plugin);
    // A fresh object whose only pass is late enough to be stale: routine with live data, not "data too old".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(findPassesForSat).mockReturnValue({ passes: [row(now + 2.9 * DAY)] as any, truncated: false });
    vi.spyOn(statics, 'candidates_').mockReturnValue([satWithEpochAge(0.5)]);
    internals(plugin).observer_ = { lat: 40, lon: -74, altKm: 0 };
    const searching = internals(plugin).search_();

    await vi.runAllTimersAsync();
    await searching;

    expect(getEl('visible-tonight-status')?.dataset.status).toBe('ready');
    expect(internals(plugin).passes_).toEqual([]);
  });

  it('uses the app-wide lighting rule: sunlit and a dark site (SensorMath.getLightingState, -12 deg)', () => {
    const sensor = statics.observerSensor_({ lat: 40, lon: -74, altKm: 0 });
    const target = statics.target_(satWithEpochAge(0.5), sensor, 72, vi.fn());
    const lighting = vi.spyOn(SensorMath, 'getLightingState');

    lighting.mockReturnValue({ sunlit: true, siteDark: false, sunElDeg: -8 });
    expect(target.isVisible(Date.now())).toBe(false);

    lighting.mockReturnValue({ sunlit: true, siteDark: true, sunElDeg: -13 });
    expect(target.isVisible(Date.now())).toBe(true);

    lighting.mockReturnValue({ sunlit: null, siteDark: true, sunElDeg: -13 });
    expect(target.isVisible(Date.now())).toBe(false);
    expect(SensorMath.SITE_DARK_SUN_EL_DEG).toBe(-12);
  });
});

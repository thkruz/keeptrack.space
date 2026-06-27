/* eslint-disable camelcase */
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { LaunchInfoObject, TheSpaceDevLaunchCalendarPlugin } from '@app/plugins/thespacedev-launch-calendar/thespacedev-launch-calendar';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/**
 * One launch result shaped exactly like a The Space Devs
 * /launch/upcoming/?mode=detailed payload entry (see test/environment/lldev.json).
 */
const launchResult = (over: Record<string, unknown> = {}) => ({
  name: 'Soyuz 2.1a | Progress MS-24 (85P)',
  window_start: '2023-08-23T01:08:00Z',
  window_end: '2023-08-23T01:18:00Z',
  last_updated: '2023-08-22T12:00:00Z',
  pad: {
    location: { name: 'Baikonur Cosmodrome, Republic of Kazakhstan' },
    wiki_url: 'https://en.wikipedia.org/wiki/Baikonur_Cosmodrome_Site_31',
  },
  launch_service_provider: {
    name: 'Russian Federal Space Agency (ROSCOSMOS)',
    country_code: 'RUS',
    wiki_url: 'http://en.wikipedia.org/wiki/Russian_Federal_Space_Agency',
  },
  mission: {
    name: 'Progress MS-24 (85P)',
    type: 'Resupply',
    description: 'Progress resupply mission to the ISS.',
    wiki_url: 'https://en.wikipedia.org/wiki/Progress_MS-24',
  },
  rocket: {
    configuration: {
      full_name: 'Soyuz 2.1a',
      name: 'Soyuz 2.1a',
      family: 'Soyuz',
      wiki_url: 'https://en.wikipedia.org/wiki/Soyuz-2#Soyuz-2.1a',
    },
  },
  ...over,
});

/** A FUTURE launch so initTable renders a formatted date rather than the TBD string. */
const futureLaunch = (over: Record<string, unknown> = {}): LaunchInfoObject => ({
  name: 'Future Launch',
  updated: new Date('2099-01-01T00:00:00Z'),
  windowStart: new Date('2099-06-01T12:00:00Z'),
  windowEnd: new Date('2099-06-01T12:30:00Z'),
  location: 'Cape Canaveral',
  locationURL: 'https://example.com/loc',
  agency: 'SpaceX',
  agencyURL: 'https://example.com/agency',
  country: 'USA,FRA',
  mission: 'Mission description',
  missionName: 'A Very Long Mission Name That Truncates',
  missionType: 'Test',
  missionURL: 'https://example.com/mission',
  rocket: 'Falcon 9',
  rocketConfig: 'Block 5',
  rocketFamily: 'Falcon',
  rocketURL: 'https://example.com/rocket',
  ...over,
} as LaunchInfoObject);

describe('TheSpaceDevLaunchCalendarPlugin behavior', () => {
  let plugin: TheSpaceDevLaunchCalendarPlugin;
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new TheSpaceDevLaunchCalendarPlugin();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('processData', () => {
    it('maps a full detailed result into the flattened LaunchInfoObject shape', () => {
      plugin.processData({ results: [launchResult()] as any });

      const info = plugin.launchList[0];

      expect(info.name).toBe('Soyuz 2.1a | Progress MS-24 (85P)');
      expect(info.windowStart).toBeInstanceOf(Date);
      expect(info.updated).toBeInstanceOf(Date);
      // Location name is split on the first comma.
      expect(info.location).toBe('Baikonur Cosmodrome');
      expect(info.agency).toBe('Russian Federal Space Agency (ROSCOSMOS)');
      expect(info.country).toBe('RUS');
      expect(info.missionName).toBe('Progress MS-24 (85P)');
      expect(info.missionType).toBe('Resupply');
      expect(info.rocket).toBe('Soyuz 2.1a');
      expect(info.rocketFamily).toBe('Soyuz');
      expect(info.rocketURL).toContain('wikipedia');
    });

    it('falls back to UNK / unknown when the provider, mission and rocket are missing', () => {
      plugin.processData({
        results: [
          {
            name: 'Bare Launch',
            window_start: '2030-01-01T00:00:00Z',
            window_end: '2030-01-01T00:00:00Z',
          } as any,
        ],
      });

      const info = plugin.launchList[0];

      expect(info.country).toBe('UNK');
      // No mission/rocket objects -> these stay empty strings.
      expect(info.mission).toBe('');
      expect(info.rocket).toBe('');
      expect(info.agencyURL).toBe('');
      // No last_updated -> updated stays the null placeholder.
      expect(info.updated).toBeNull();
    });

    it('processes every entry in the results array', () => {
      plugin.processData({ results: [launchResult(), launchResult({ name: 'Second' })] as any });

      expect(plugin.launchList).toHaveLength(2);
      expect(plugin.launchList[1].name).toBe('Second');
    });
  });

  describe('static table builders', () => {
    it('makeTableHeaders inserts a single header row with five cells', () => {
      const tbl = document.createElement('table');

      TheSpaceDevLaunchCalendarPlugin.makeTableHeaders(tbl);

      expect(tbl.rows).toHaveLength(1);
      expect(tbl.rows[0].cells).toHaveLength(5);
    });

    it('initTable renders a header plus one row per launch with a wrapped country cell', () => {
      const tbl = document.createElement('table');

      TheSpaceDevLaunchCalendarPlugin.initTable(tbl, [futureLaunch()]);

      // header + 1 data row
      expect(tbl.rows).toHaveLength(2);
      // Comma-separated country list gets a space after each comma for wrapping.
      const countryCell = tbl.querySelector('.launch-calendar-country-cell');

      expect(countryCell?.textContent).toBe('USA, FRA');
      // Mission and rocket render as iframe links when URLs are present.
      expect(tbl.querySelectorAll('a.iframe').length).toBeGreaterThan(0);
    });

    it('renders the TBD placeholder for a launch window more than a day in the past', () => {
      const tbl = document.createElement('table');

      TheSpaceDevLaunchCalendarPlugin.initTable(tbl, [futureLaunch({ windowStart: new Date('2000-01-01T00:00:00Z') })]);

      // The first data-row's first cell is the time text.
      const timeText = tbl.rows[1].cells[0].textContent ?? '';

      expect(timeText).not.toContain('UTC');
    });

    it('renders plain text (no anchor) for fields without URLs', () => {
      const tbl = document.createElement('table');

      TheSpaceDevLaunchCalendarPlugin.initTable(tbl, [futureLaunch({ missionURL: '', locationURL: '', agencyURL: '', rocketURL: '' })]);

      expect(tbl.querySelectorAll('a.iframe')).toHaveLength(0);
    });
  });

  describe('fetchLaunchData_', () => {
    // Lets the fetch().then().then().catch().finally() chain fully settle.
    // The env may run with fake timers, so flush microtasks rather than using setTimeout.
    const flush = async () => {
      for (let i = 0; i < 12; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
      }
    };

    const stubFetch = (results: unknown[]) => {
      // eslint-disable-next-line require-await
      global.fetch = vi.fn().mockImplementation(async () => ({
        json: () => ({ results }),
      })) as never;
    };

    it('fetches, parses, and renders the launch table', async () => {
      stubFetch([launchResult()]);

      p().fetchLaunchData_();
      await flush();

      expect(global.fetch).toHaveBeenCalled();
      expect(plugin.launchList.length).toBeGreaterThan(0);

      const tbl = getEl('launch-calendar-table') as HTMLTableElement;

      expect(tbl.rows.length).toBeGreaterThan(0);
      // Refresh button should now be visible, fetch button hidden.
      expect((getEl('launch-calendar-refresh-btn') as HTMLElement).style.display).not.toBe('none');
    });

    it('warns and re-shows the fetch button when the request fails', async () => {
      const warn = vi.spyOn((await import('@app/engine/utils/errorManager')).errorManagerInstance, 'warn');

      // eslint-disable-next-line require-await
      global.fetch = vi.fn().mockImplementation(async () => {
        throw new Error('network down');
      }) as never;

      p().fetchLaunchData_();
      await flush();

      expect(warn).toHaveBeenCalled();
      expect(plugin.launchList).toHaveLength(0);
    });

    it('is a no-op while a fetch is already in flight', () => {
      p().isFetching_ = true;
      global.fetch = vi.fn() as never;

      p().fetchLaunchData_();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('onBottomIconClick', () => {
    it('does nothing when the menu button is not active', () => {
      p().isMenuButtonActive = false;
      const spy = vi.spyOn(p(), 'fetchLaunchData_');

      plugin.onBottomIconClick();

      expect(spy).not.toHaveBeenCalled();
    });

    it('auto-fetches the first time the menu opens (empty list)', () => {
      p().isMenuButtonActive = true;
      plugin.launchList = [];
      const spy = vi.spyOn(p(), 'fetchLaunchData_').mockImplementation(() => undefined);

      plugin.onBottomIconClick();

      expect(spy).toHaveBeenCalled();
    });

    it('reuses loaded data and refreshes the toolbar on subsequent opens', () => {
      p().isMenuButtonActive = true;
      plugin.launchList = [futureLaunch()];
      const fetchSpy = vi.spyOn(p(), 'fetchLaunchData_');
      const toolbarSpy = vi.spyOn(p(), 'updateToolbarForLoginState_');

      plugin.onBottomIconClick();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(toolbarSpy).toHaveBeenCalled();
    });
  });

  describe('login state toolbar', () => {
    it('onUserLogin_ marks logged-in and updates the toolbar when the menu is active', () => {
      p().isMenuButtonActive = true;
      plugin.launchList = [futureLaunch()];
      const toolbarSpy = vi.spyOn(p(), 'updateToolbarForLoginState_');

      p().onUserLogin_();

      expect(p().isLoggedIn_).toBe(true);
      expect(toolbarSpy).toHaveBeenCalled();
    });

    it('onUserLogin_ triggers a fetch when logged in with an empty list', () => {
      p().isMenuButtonActive = true;
      plugin.launchList = [];
      const fetchSpy = vi.spyOn(p(), 'fetchLaunchData_').mockImplementation(() => undefined);

      p().onUserLogin_();

      expect(fetchSpy).toHaveBeenCalled();
    });

    it('onUserLogout_ clears the logged-in flag', () => {
      p().isMenuButtonActive = true;
      p().isLoggedIn_ = true;

      p().onUserLogout_();

      expect(p().isLoggedIn_).toBe(false);
    });

    it('updateToolbarForLoginState_ (logged in) hides fetch and shows refresh', () => {
      p().isLoggedIn_ = true;

      p().updateToolbarForLoginState_();

      expect((getEl('launch-calendar-fetch-btn') as HTMLElement).style.display).toBe('none');
      expect((getEl('launch-calendar-refresh-btn') as HTMLElement).style.display).not.toBe('none');
    });

    it('updateToolbarForLoginState_ (logged out, no data) shows the fetch button', () => {
      p().isLoggedIn_ = false;
      plugin.launchList = [];

      p().updateToolbarForLoginState_();

      expect((getEl('launch-calendar-fetch-btn') as HTMLElement).style.display).not.toBe('none');
    });

    it('updateToolbarForLoginState_ (logged out, with data) shows refresh and hides fetch', () => {
      p().isLoggedIn_ = false;
      plugin.launchList = [futureLaunch()];

      p().updateToolbarForLoginState_();

      expect((getEl('launch-calendar-fetch-btn') as HTMLElement).style.display).toBe('none');
      expect((getEl('launch-calendar-refresh-btn') as HTMLElement).style.display).not.toBe('none');
    });
  });

  describe('toolbar button wiring (addJs)', () => {
    it('the fetch button click triggers a data fetch', () => {
      const spy = vi.spyOn(p(), 'fetchLaunchData_').mockImplementation(() => undefined);

      getEl('launch-calendar-fetch-btn')!.dispatchEvent(new MouseEvent('click'));

      expect(spy).toHaveBeenCalled();
    });

    it('the refresh button click clears the list and re-fetches', () => {
      plugin.launchList = [futureLaunch()];
      const spy = vi.spyOn(p(), 'fetchLaunchData_').mockImplementation(() => undefined);

      getEl('launch-calendar-refresh-btn')!.dispatchEvent(new MouseEvent('click'));

      expect(plugin.launchList).toHaveLength(0);
      expect(spy).toHaveBeenCalled();
    });

    it('the export button plays a sound and saves the launch list', async () => {
      const saveVariable = await import('@app/engine/utils/saveVariable');
      const saveSpy = vi.spyOn(saveVariable, 'saveXlsx').mockImplementation(() => undefined);
      const soundSpy = vi.spyOn(ServiceLocator.getSoundManager()!, 'play').mockImplementation(() => undefined as never);

      plugin.launchList = [futureLaunch()];

      getEl('export-launch-info')!.dispatchEvent(new MouseEvent('click'));

      expect(soundSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith(expect.any(Array), 'launchList');
    });
  });
});

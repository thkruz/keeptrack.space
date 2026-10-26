/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { LaunchInfoObject, TheSpaceDevLaunchCalendarPlugin } from '@app/plugins/thespacedev-launch-calendar/thespacedev-launch-calendar';
import * as XLSXMock from '@e965/xlsx';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

// test/vitest-setup.ts mocks @e965/xlsx globally (no files on disk); the sheet builder is checked against the real one.
const XLSX = await vi.importActual<typeof import('@e965/xlsx')>('@e965/xlsx');

const k = (key: string): string => t7e(`plugins.TheSpaceDevLaunchCalendarPlugin.${key}` as Parameters<typeof t7e>[0]);

/** A detailed /launch/upcoming/ result, shaped like test/environment/lldev.json entries. */
const launchResult = (over: Record<string, unknown> = {}) => ({
  name: 'Falcon 9 Block 5 | Starlink Group 10-1',
  window_start: '2099-06-01T12:00:00Z',
  window_end: '2099-06-01T13:00:00Z',
  last_updated: '2099-05-30T10:00:00Z',
  pad: {
    location: { name: 'Cape Canaveral SFS, FL, USA' },
    wiki_url: 'https://en.wikipedia.org/wiki/Cape_Canaveral_Space_Launch_Complex_40',
  },
  launch_service_provider: {
    name: 'SpaceX',
    country_code: 'USA',
    wiki_url: 'https://en.wikipedia.org/wiki/SpaceX',
  },
  mission: {
    name: 'Starlink Group 10-1',
    type: 'Communications',
    description: 'A batch of Starlink satellites.',
    wiki_url: 'https://en.wikipedia.org/wiki/Starlink',
  },
  rocket: {
    configuration: {
      full_name: 'Falcon 9 Block 5',
      name: 'Falcon 9',
      family: 'Falcon',
      wiki_url: 'https://en.wikipedia.org/wiki/Falcon_9_Full_Thrust',
    },
  },
  ...over,
});

const HOSTILE_IMG = '<img src=x onerror="window.__ktPwned=1">';
const HOSTILE_SCRIPT = '<script>window.__ktPwned=1</script>';
const ATTR_BREAKOUT = 'https://en.wikipedia.org/wiki/X" onmouseover="window.__ktPwned=1';

/** Settles the fetch().then().then().catch().finally() chain (the env may use fake timers). */
const flush = async () => {
  for (let i = 0; i < 16; i++) {
    // biome-ignore lint/performance/noAwaitInLoops: microtask flushes must run sequentially
    await Promise.resolve();
  }
};

/** A fetch Response stand-in with the fields the plugin reads (ok, status, json). */
const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => (typeof body === 'string' ? Promise.reject(new SyntaxError('Unexpected token')) : Promise.resolve(body)),
});

describe('TheSpaceDevLaunchCalendarPlugin hardening', () => {
  let plugin: TheSpaceDevLaunchCalendarPlugin;
  const p = () => plugin as any;
  const tbl = () => getEl('launch-calendar-table') as HTMLTableElement;
  const isShown = (id: string) => (getEl(id) as HTMLElement).style.display !== 'none';

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new TheSpaceDevLaunchCalendarPlugin();
    websiteInit(plugin);
    delete (window as any).__ktPwned;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('feed strings never become markup', () => {
    it('renders hostile names as literal text in every cell', () => {
      plugin.processData({
        results: [
          launchResult({
            mission: { name: HOSTILE_IMG, type: 'x', description: 'x' },
            rocket: { configuration: { full_name: HOSTILE_SCRIPT, name: 'x', family: 'x' } },
            pad: { location: { name: '<b>Pad</b>' } },
            launch_service_provider: { name: '<s>Agency</s>', country_code: '<i>USA</i>' },
          }),
        ] as any,
      });
      const table = document.createElement('table');

      TheSpaceDevLaunchCalendarPlugin.initTable(table, plugin.launchList);

      expect(table.querySelectorAll('img, script, b, s, i')).toHaveLength(0);
      const cells = table.rows[1].cells;

      // The mission name is truncated to 15 characters, but as text.
      expect(cells[1].textContent?.startsWith('<img src=x oner')).toBe(true);
      expect(cells[1].textContent).toContain(HOSTILE_SCRIPT);
      expect(cells[2].textContent).toBe('<b>Pad</b>');
      expect(cells[3].textContent).toBe('<s>Agency</s>');
      expect(cells[4].textContent).toBe('<i>USA</i>');
      expect((window as any).__ktPwned).toBeUndefined();
    });

    it('keeps a quote-laden URL inside the href and adds no attributes', () => {
      const table = document.createElement('table');

      TheSpaceDevLaunchCalendarPlugin.initTable(table, [
        {
          name: 'n',
          updated: new Date('2099-01-01T00:00:00Z'),
          windowStart: new Date('2099-06-01T12:00:00Z'),
          windowEnd: new Date('2099-06-01T13:00:00Z'),
          location: 'Pad',
          locationURL: ATTR_BREAKOUT,
          agency: 'Agency',
          agencyURL: '',
          country: 'USA',
          mission: '',
          missionName: 'Mission',
          missionType: '',
          missionURL: '',
          rocket: 'Rocket',
          rocketConfig: '',
          rocketFamily: '',
          rocketURL: '',
        } as LaunchInfoObject,
      ]);

      const anchors = table.querySelectorAll('a');

      expect(anchors).toHaveLength(1);
      expect(anchors[0].getAttributeNames().sort()).toEqual(['class', 'href']);
      expect(anchors[0].getAttribute('onmouseover')).toBeNull();
      expect(anchors[0].href.startsWith('https://en.wikipedia.org/wiki/X')).toBe(true);
    });

    it('drops non-http(s) links: javascript:, data: and relative URLs render as plain text', () => {
      expect(TheSpaceDevLaunchCalendarPlugin.safeUrl('javascript:alert(1)')).toBeNull();
      expect(TheSpaceDevLaunchCalendarPlugin.safeUrl(' JaVaScRiPt:alert(1)')).toBeNull();
      expect(TheSpaceDevLaunchCalendarPlugin.safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(TheSpaceDevLaunchCalendarPlugin.safeUrl('/relative/path')).toBeNull();
      expect(TheSpaceDevLaunchCalendarPlugin.safeUrl('')).toBeNull();
      expect(TheSpaceDevLaunchCalendarPlugin.safeUrl(undefined)).toBeNull();
      expect(TheSpaceDevLaunchCalendarPlugin.safeUrl('http://en.wikipedia.org/wiki/SpaceX')).toBe('http://en.wikipedia.org/wiki/SpaceX');

      const cell = document.createElement('td');

      TheSpaceDevLaunchCalendarPlugin.appendFeedText(cell, 'Evil', 'javascript:alert(1)');

      expect(cell.querySelector('a')).toBeNull();
      expect(cell.textContent).toBe('Evil');
    });

    it('ignores non-string feed values instead of rendering them', () => {
      plugin.processData({
        results: [launchResult({ name: { toString: () => HOSTILE_IMG }, mission: { name: 42, type: null, description: [] } })] as any,
      });

      expect(plugin.launchList[0].name).toBe(k('msgs.unknown'));
      expect(plugin.launchList[0].missionName).toBe('');
      expect(plugin.launchList[0].missionType).toBe('');
    });
  });

  describe('defensive dates and records', () => {
    it('formatWindow shows TBD for an invalid, null or stale date and UTC text otherwise', () => {
      expect(TheSpaceDevLaunchCalendarPlugin.formatWindow(new Date('not-a-date'))).toBe(k('msgs.tbd'));
      expect(TheSpaceDevLaunchCalendarPlugin.formatWindow(null)).toBe(k('msgs.tbd'));
      expect(TheSpaceDevLaunchCalendarPlugin.formatWindow(new Date('2000-01-01T00:00:00Z'))).toBe(k('msgs.tbd'));
      expect(TheSpaceDevLaunchCalendarPlugin.formatWindow(new Date('2099-06-01T12:00:00Z'))).toBe('2099-06-01 12:00:00 UTC');
    });

    it('one record with an unparseable window renders TBD and the rest of the table still renders', () => {
      plugin.processData({ results: [launchResult(), launchResult({ window_start: 'not-a-date', window_end: 'not-a-date' }), launchResult({ name: 'Third' })] as any });
      const table = document.createElement('table');

      expect(() => TheSpaceDevLaunchCalendarPlugin.initTable(table, plugin.launchList)).not.toThrow();
      expect(table.rows).toHaveLength(4);
      expect(table.rows[2].cells[0].textContent).toBe(k('msgs.tbd'));
      expect(table.rows[3].cells[0].textContent).toBe('2099-06-01 12:00:00 UTC');
    });

    it('a rocket without a configuration or a pad without a location does not throw', () => {
      expect(() => plugin.processData({ results: [launchResult({ rocket: {}, pad: { wiki_url: 'https://en.wikipedia.org/wiki/Pad' } })] as any })).not.toThrow();
      expect(plugin.launchList[0].rocket).toBe('');
      expect(plugin.launchList[0].location).toBe(k('msgs.unknown'));
    });
  });

  describe('fetch outcomes', () => {
    it('an invalid date in the feed keeps the table whole and the Refresh button usable', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(response(200, { results: [launchResult(), launchResult({ window_start: 'not-a-date' }), launchResult({ name: 'Third' })] })) as never;

      p().fetchLaunchData_();
      await flush();

      expect(tbl().rows).toHaveLength(4);
      expect(isShown('launch-calendar-refresh-btn')).toBe(true);
      expect(isShown('launch-calendar-fetch-btn')).toBe(false);
    });

    it('an empty feed shows the "no upcoming launches" row and offers Fetch Data', async () => {
      global.fetch = vi.fn().mockResolvedValue(response(200, { results: [] })) as never;

      p().fetchLaunchData_();
      await flush();

      expect(tbl().rows).toHaveLength(1);
      expect(tbl().rows[0].className).toBe('launch-calendar-empty-row');
      expect(tbl().rows[0].textContent).toBe(k('msgs.noLaunches'));
      expect(isShown('launch-calendar-fetch-btn')).toBe(true);
      expect(isShown('launch-calendar-refresh-btn')).toBe(false);
    });

    it('a failed Refresh keeps the rows on screen and shows the generic toast', async () => {
      const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

      global.fetch = vi.fn().mockResolvedValue(response(200, { results: [launchResult(), launchResult({ name: 'Second' })] })) as never;
      p().fetchLaunchData_();
      await flush();
      expect(tbl().rows).toHaveLength(3);

      global.fetch = vi.fn().mockResolvedValue(response(500, 'Server Error')) as never;
      getEl('launch-calendar-refresh-btn')!.dispatchEvent(new MouseEvent('click'));
      await flush();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(plugin.launchList).toHaveLength(2);
      expect(tbl().rows).toHaveLength(3);
      expect(isShown('launch-calendar-refresh-btn')).toBe(true);
      expect(isShown('launch-calendar-fetch-btn')).toBe(false);
      expect(warn).toHaveBeenCalledWith(k('msgs.apiUnavailable').replace('{url}', 'https://ll.thespacedevs.com/2.0.0/'));
    });

    it('a successful Refresh replaces the rows', async () => {
      global.fetch = vi.fn().mockResolvedValue(response(200, { results: [launchResult(), launchResult()] })) as never;
      p().fetchLaunchData_();
      await flush();

      global.fetch = vi.fn().mockResolvedValue(response(200, { results: [launchResult({ name: 'Only' })] })) as never;
      p().fetchLaunchData_();
      await flush();

      expect(tbl().rows).toHaveLength(2);
      expect(plugin.launchList.map((launch) => launch.name)).toEqual(['Only']);
    });

    it('HTTP 429 shows the rate-limit toast instead of the generic one', async () => {
      const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

      global.fetch = vi.fn().mockResolvedValue(response(429, { detail: 'Request was throttled. Expected available in 3300 seconds.' })) as never;
      p().fetchLaunchData_();
      await flush();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(k('msgs.rateLimited'));
      expect(isShown('launch-calendar-fetch-btn')).toBe(true);
    });

    it('a JSON error body with a non-2xx status is a failure, not an empty list', async () => {
      const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

      global.fetch = vi.fn().mockResolvedValue(response(503, { detail: 'Service unavailable' })) as never;
      p().fetchLaunchData_();
      await flush();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(tbl().rows).toHaveLength(0);
    });
  });

  describe('export sheet', () => {
    const exportLaunch = (over: Partial<LaunchInfoObject> = {}): LaunchInfoObject => ({
      name: 'E2E Launch One',
      updated: new Date('2026-10-25T10:00:00Z'),
      windowStart: new Date('2026-10-26T04:45:00Z'),
      windowEnd: new Date('2026-10-26T05:45:00Z'),
      location: 'Vandenberg SFB',
      locationURL: 'https://en.wikipedia.org/wiki/Pad',
      agency: 'Agency',
      agencyURL: '',
      country: 'USA',
      mission: 'Description',
      missionName: 'Mission',
      missionType: 'Test',
      missionURL: '',
      rocket: 'Falcon 9 Block 5',
      rocketConfig: 'Falcon 9',
      rocketFamily: 'Falcon',
      rocketURL: '',
      ...over,
    });
    const serial = (iso: string) => Date.parse(iso) / 86_400_000 + 25569;

    it('uses readable headers, keeps every field and writes dates as UTC spreadsheet dates', () => {
      const ws = TheSpaceDevLaunchCalendarPlugin.buildExportSheet(XLSX, [exportLaunch(), exportLaunch({ windowStart: new Date('not-a-date'), updated: null as unknown as Date })]);
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });

      expect(rows[0]).toEqual(
        [
          'name',
          'updated',
          'windowStart',
          'windowEnd',
          'location',
          'locationURL',
          'agency',
          'agencyURL',
          'country',
          'mission',
          'missionName',
          'missionType',
          'missionURL',
          'rocket',
          'rocketConfig',
          'rocketFamily',
          'rocketURL',
        ].map((field) => k(`export.${field}`))
      );
      expect(rows[0]).toHaveLength(17);
      expect(ws.C2.t).toBe('n');
      expect(ws.C2.v as number).toBeCloseTo(serial('2026-10-26T04:45:00Z'), 6);
      expect(ws.B2.v as number).toBeCloseTo(serial('2026-10-25T10:00:00Z'), 6);
      expect(ws.C2.z).toBe('yyyy-mm-dd hh:mm:ss');
      // Invalid or missing dates are blank, not "Invalid Date" or 1970.
      expect(rows[2][1]).toBe('');
      expect(rows[2][2]).toBe('');
      expect(rows[1][4]).toBe('Vandenberg SFB');
    });

    it('a hostile string is exported as plain text', () => {
      const ws = TheSpaceDevLaunchCalendarPlugin.buildExportSheet(XLSX, [exportLaunch({ name: '=HYPERLINK("http://x")' })]);

      expect(ws.A2.t).toBe('s');
      expect(ws.A2.f).toBeUndefined();
    });

    it('the export routine writes launchList.xlsx and plays the export sound', async () => {
      const soundSpy = vi.spyOn(ServiceLocator.getSoundManager()!, 'play').mockImplementation(() => undefined as never);
      const errorSpy = vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);
      const writeFile = vi.mocked(XLSXMock.writeFile);

      writeFile.mockClear();
      plugin.launchList = [exportLaunch()];
      await p().exportLaunchList_();

      expect(soundSpy).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith(expect.anything(), 'launchList.xlsx');
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});

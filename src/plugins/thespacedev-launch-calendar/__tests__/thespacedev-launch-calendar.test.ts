import { KeepTrack } from '@app/keeptrack';
import { TheSpaceDevLaunchCalendarPlugin } from '@app/plugins/thespacedev-launch-calendar/thespacedev-launch-calendar';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { readFileSync } from 'fs';
import { vi } from 'vitest';

describe('TheSpaceDevLaunchCalendarPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs without throwing', () => {
    expect(() => new TheSpaceDevLaunchCalendarPlugin()).not.toThrow();
  });

  standardPluginSuite(TheSpaceDevLaunchCalendarPlugin, 'TheSpaceDevLaunchCalendarPlugin');
  standardPluginMenuButtonTests(TheSpaceDevLaunchCalendarPlugin, 'TheSpaceDevLaunchCalendarPlugin');
  standardClickTests(TheSpaceDevLaunchCalendarPlugin);
  standardChangeTests(TheSpaceDevLaunchCalendarPlugin);
});

describe('TheSpaceDevLaunchCalendar_class', () => {
  beforeAll(() => {
    const url = 'https://Keeptrack.space';

    vi.stubGlobal('location', {
      href: url,
      search: '',
      hash: '',
      ancestorOrigins: [],
      assign: vi.fn(),
      reload: vi.fn(),
      replace: vi.fn(),
    });

    if (window.history) {
      vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
        // Do nothing
      });
    }
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();

    // eslint-disable-next-line require-await
    global.fetch = vi.fn().mockImplementation(async () => ({
      json: () => ({
        results: JSON.parse(readFileSync('./test/environment/lldev.json', 'utf8')),
      }),
    }));
  });

  standardPluginSuite(TheSpaceDevLaunchCalendarPlugin);
  standardPluginMenuButtonTests(TheSpaceDevLaunchCalendarPlugin);
});

import { KeepTrack } from '@app/keeptrack';
import { NextLaunchesPlugin } from '@app/plugins/next-launches/next-launches';
import { readFileSync } from 'fs';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('NextLaunchesPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(NextLaunchesPlugin, 'NextLaunchesPlugin');
  standardPluginMenuButtonTests(NextLaunchesPlugin, 'NextLaunchesPlugin');
  standardClickTests(NextLaunchesPlugin);
  standardChangeTests(NextLaunchesPlugin);
});

describe('NextLaunches_class', () => {
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

  standardPluginSuite(NextLaunchesPlugin);
  standardPluginMenuButtonTests(NextLaunchesPlugin);
});

import { NextLaunchesPlugin } from '@app/plugins/next-launches/next-launches';
import { readFileSync } from 'fs';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';
import { KeepTrack } from '@app/keeptrack';

describe('NextLaunches_class', () => {
  beforeAll(() => {
    global.window = Object.create(window);
    const url = 'https://Keeptrack.space';

    Object.defineProperty(window, 'location', {
      value: {
        href: url,
        search: '',
      },
      writable: true, // possibility to override
    });

    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {
      // Do nothing
    });
  });
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment();

    // eslint-disable-next-line require-await
    global.fetch = jest.fn().mockImplementation(async () => ({
      json: () => ({
        results: JSON.parse(readFileSync('./test/environment/lldev.json', 'utf8')),
      }),
    }));
  });

  standardPluginSuite(NextLaunchesPlugin);
  standardPluginMenuButtonTests(NextLaunchesPlugin);
});

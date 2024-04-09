import { keepTrackApi } from '@app/keepTrackApi';
import { NextLaunchesPlugin } from '@app/plugins/next-launches/next-launches';
import { readFileSync } from 'fs';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

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

    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });
  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    setupStandardEnvironment();

    // eslint-disable-next-line require-await
    global.fetch = jest.fn().mockImplementation(async () => ({
      json: () => ({
        results: readFileSync('./test/environment/lldev.json', 'utf8'),
      }),
    }));
  });

  standardPluginSuite(NextLaunchesPlugin);
  standardPluginMenuButtonTests(NextLaunchesPlugin);
});

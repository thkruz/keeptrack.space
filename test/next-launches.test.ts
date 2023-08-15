import { NextLaunchesPlugin } from '@app/js/plugins/next-launches/next-launches';
import { readFileSync } from 'fs';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('NextLaunches_class', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setupStandardEnvironment();
    window.location.hostname = 'keeptrack.space';
    global.fetch = jest.fn().mockImplementation(async () => ({
      json: () => ({
        results: readFileSync('./test/environment/lldev.json', 'utf8'),
      }),
    }));
  });

  standardPluginSuite(NextLaunchesPlugin);
  standardPluginMenuButtonTests(NextLaunchesPlugin);
});

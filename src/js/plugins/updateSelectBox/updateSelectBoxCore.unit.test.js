/*globals
  global
  test
  expect
  jest
*/

import 'jsdom-worker';

import { keepTrackApi } from '@app/js/api/externalApi';
import { missileManager } from '@app/js/plugins/missile/missileManager';
import { orbitManager } from '@app/js/orbitManager/orbitManager';
import { satellite } from '@app/js/lib/lookangles';
import { timeManager } from '@app/js/timeManager/timeManager';

keepTrackApi.programs.missileManager = missileManager;
keepTrackApi.programs.satellite = satellite;
keepTrackApi.programs.orbitManager = orbitManager;
keepTrackApi.programs.timeManager = timeManager;
keepTrackApi.programs.settingsManager = {
  plugins: {
    datetime: {},
  },
};

test(`updateSelectBoxCore Unit Testing`, () => {
  const sat = {
    missile: true,
  };

  import('@app/js/plugins/updateSelectBox/updateSelectBoxCore').then((mod) => mod.init());
  timeManager.init();
  orbitManager.orbitWorker = {
    onmessage: jest.fn(),
  };
  satellite.setTEARR = jest.fn();
  satellite.currentTEARR = {
    lat: 0,
    lon: 0,
    alt: 0,
  };
  missileManager.getMissileTEARR = jest.fn();
});

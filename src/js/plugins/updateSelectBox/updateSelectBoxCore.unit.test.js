/*globals
  global
  test
  expect
  jest
*/

import 'jsdom-worker';

import { keepTrackApi } from '@app/js/api/externalApi';
import { missileManager } from '@app/js/missileManager/missileManager';
import { orbitManager } from '@app/js/orbitManager/orbitManager';
import { satellite } from '@app/js/lib/lookangles';
import { timeManager } from '@app/js/timeManager/timeManager';
import { updateSelectBoxCore } from '@app/js/plugins/updateSelectBox/updateSelectBoxCore';

keepTrackApi.programs.missileManager = missileManager;
keepTrackApi.programs.satellite = satellite;
keepTrackApi.programs.orbitManager = orbitManager;
keepTrackApi.programs.timeManager = timeManager;

test(`updateSelectBoxCore Unit Testing`, () => {
  const sat = {
    missile: true,
  };

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
  updateSelectBoxCore.sensorInfo.cb(sat);
});

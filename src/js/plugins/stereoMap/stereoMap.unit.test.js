/* eslint-disable no-undefined */
/*globals
  test
  jest
  expect
*/

import * as stereoMap from '@app/js/plugins/stereoMap/stereoMap';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

test(`mapManager Unit Tests`, () => {
  stereoMap.init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('NOT-menu-map');
  keepTrackApi.methods.bottomMenuClick('menu-map');
  keepTrackApi.methods.onCruncherMessage();
  keepTrackApi.programs.settingsManager.lastMapUpdateTime = 0;
  keepTrackApi.methods.onCruncherMessage();
  keepTrackApi.methods.bottomMenuClick('menu-map');
  keepTrackApi.methods.onCruncherMessage();
  keepTrackApi.methods.hideSideMenus();

  const mapManager = keepTrackApi.programs.mapManager;

  mapManager.braun(
    {
      lat: 41,
      lon: -71,
    },
    { meridian: 0 }
  );

  mapManager.braun(
    {
      point: {
        x: 0.5,
        y: 0.5,
      },
      lat: 41,
      lon: -71,
    },
    { meridian: 0, latLimit: 50 }
  );

  mapManager.braun(
    {
      x: 0.5,
      y: 0.5,
    },
    { meridian: 0, latLimit: 50 }
  );

  mapManager.braun(
    {
      x: 0.5,
      y: 0.5,
    },
    { meridian: 10, latLimit: 50 }
  );

  mapManager.options();

  expect(() => mapManager.braun({}, { meridian: 0, latLimit: 50 })).toThrow('Invalid input point.');

  stereoMap.resize2DMap(true);
});

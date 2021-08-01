/* eslint-disable no-undefined */
/*globals
  test
  jest
  expect
*/

import { init } from '@app/js/plugins/stereoMap/stereoMap';
import { keepTrackApi } from '@app/js/api/externalApi';

test(`mapManager Unit Tests`, () => {
  keepTrackApi.programs = {
    objectManager: {},
    satSet: {
      getSat: () => ({
        getTEARR: jest.fn(),
      }),
      getSatExtraOnly: () => ({
        SCC_NUM: '25544',
      }),
    },
    satellite: {
      currentTEARR: {
        lat: 0,
        lon: 0,
      },
      degreesLat: () => 0,
      degreesLong: () => 0,
      map: () => ({
        lat: 0,
        lon: 0,
      }),
    },
    sensorManager: {
      currentSensor: {
        lat: 0,
        lon: 0,
      },
      checkSensorSelected: () => true,
    },
    settingsManager: {},
    uiManager: {
      hideSideMenus: jest.fn(),
    },
  };

  init();
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
});

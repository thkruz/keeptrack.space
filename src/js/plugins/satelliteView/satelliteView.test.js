/*globals
  test
  jest
*/

import 'jsdom-worker';
import '@app/js/settingsManager/settingsManager.js';

import { keepTrackApi } from '@app/js/api/externalApi';

keepTrackApi.programs.settingsManager = {
  plugins: {
    datetime: {},
  },
};
keepTrackApi.programs = {
  uiManager: {
    hideSideMenus: jest.fn(),
    toast: jest.fn(),
  },
  cameraManager: {
    cameraType: {
      current: 1,
      satellite: 1,
      fixedToSat: 2,
    },
  },
  objectManager: {
    selectedSat: -1,
  },
  adviceManager: {
    adviceList: {
      satViewDisabled: jest.fn(),
    },
  },
};

test(`satelliteView Unit Testing`, () => {
  import('@app/js/plugins/satelliteView/satelliteView')
    .then((mod) => {
      mod.init();
      keepTrackApi.methods.uiManagerInit();
      keepTrackApi.methods.bottomMenuClick('menu-fake');
      keepTrackApi.methods.bottomMenuClick('menu-satview');
      keepTrackApi.methods.bottomMenuClick('menu-satview');

      keepTrackApi.programs.objectManager.selectedSat = 0;
      keepTrackApi.methods.bottomMenuClick('menu-satview');

      keepTrackApi.settingsManager.plugins.topMenu = true;
      keepTrackApi.methods.bottomMenuClick('menu-satview');
    })
    .catch((err) => {
      console.error(err);
    });
});

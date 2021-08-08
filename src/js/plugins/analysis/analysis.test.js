/* globals test jest */

import { init } from './analysis';
import { keepTrackApi } from '@app/js/api/externalApi';

test('Load Analysis Plugin', () => {
  window.keepTrackApi.programs = {
    satSet: {
      getSat: () => ({ SCC_NUM: 25544 }),
    },
    uiManager: {
      hideSideMenus: jest.fn(),
    },
    objectManager: {
        selectedSat: 25544,
    },
    sensorManager: {
        checkSensorSelected: () => true,
    }
  };
  window.M = {
      FormSelect: {
          init: () => true,
      },
  };

  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  keepTrackApi.methods.selectSatData();
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  window.keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  keepTrackApi.methods.bottomMenuClick('NOTmenu-analysis');
  keepTrackApi.methods.hideSideMenus();
  keepTrackApi.methods.selectSatData();
});

/* globals it jest describe */

import '@app/js/settingsManager/settingsManager.js';
import { init } from './sensorSurv';
import { keepTrackApi } from '@app/js/api/externalApi';

describe('sensorSurv', () => {
  it('should be initialized', () => {
    keepTrackApi.programs = {
      uiManager: {
        menuController: jest.fn(),
        toast: jest.fn(),
      },
      sensorManager: {
        checkSensorSelected: jest.fn(),
      },
      adviceManager: {
        adviceList: {
          survFenceDisabled: jest.fn(),
        },
      },
      satSet: {
        satCruncher: {
          postMessage: jest.fn(),
        },
      },
    };
    init();
  });

  it('should add stuff to the ui', () => {
    keepTrackApi.methods.uiManagerInit();
  });

  it('should respond to bottom menu clicks', () => {
    keepTrackApi.methods.bottomMenuClick('menu-fake');
    keepTrackApi.methods.bottomMenuClick('menu-surveillance');
    keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
    settingsManager.isShowSurvFence = true;
    keepTrackApi.methods.bottomMenuClick('menu-surveillance');
    keepTrackApi.methods.bottomMenuClick('menu-surveillance');
  });

});
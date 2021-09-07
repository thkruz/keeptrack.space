import '@app/js/settingsManager/settingsManager.js';

import * as timeMachine from './timeMachine';

import { expect } from '@jest/globals';
import { keepTrackApi } from '../../api/externalApi';

// Setup globals
keepTrackApi.programs = {
  settingsManager: (<any>window).settingsManager,
  orbitManager: {
    historyOfSatellitesPlay: jest.fn(),
  },
  groupsManager: {
    clearSelect: jest.fn(),
  },
  satSet: {
    setColorScheme: jest.fn(),
  },
  ColorScheme: {
    default: '',
  },
  sensorManager: {
    checkSensorSelected: jest.fn(),
  },
};

// @ponicode
describe('timeMachine.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.init();
      keepTrackApi.methods.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('bottomMenuClick', () => {  
  timeMachine.init();

  test('0', () => {
    let callFunction: any = () => {
      keepTrackApi.methods.bottomMenuClick('menu-fake');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      keepTrackApi.methods.bottomMenuClick('menu-time-machine');
      keepTrackApi.methods.bottomMenuClick('menu-time-machine');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('orbitManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.init();
      keepTrackApi.methods.orbitManagerInit();
      keepTrackApi.programs.orbitManager.playNextSatellite();
      keepTrackApi.programs.orbitManager.historyOfSatellitesPlay();
      keepTrackApi.programs.orbitManager.isTimeMachineVisible = true;
      keepTrackApi.programs.orbitManager.playNextSatellite();
    };

    expect(callFunction).not.toThrow();
  });
});

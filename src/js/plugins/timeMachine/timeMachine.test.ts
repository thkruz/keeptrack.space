import * as timeMachine from './timeMachine';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

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

describe('timeMachine.bottomMenuClick', () => {    
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.bottomMenuClick('menu-fake');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      timeMachine.bottomMenuClick('menu-time-machine');
      timeMachine.bottomMenuClick('menu-time-machine');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('orbitManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.orbitManagerInit();
      keepTrackApi.programs.orbitManager.playNextSatellite(1,59);
      keepTrackApi.programs.orbitManager.historyOfSatellitesPlay();
      keepTrackApi.programs.orbitManager.isTimeMachineVisible = true;
      keepTrackApi.programs.orbitManager.playNextSatellite(1,59);
      keepTrackApi.programs.orbitManager.playNextSatellite(1,20);
      keepTrackApi.programs.orbitManager.playNextSatellite(1,parseInt(new Date().getUTCFullYear().toString().slice(2, 4)));
      keepTrackApi.programs.orbitManager.playNextSatellite(5,10);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('timeMachine.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('timeMachine.timeMachineIconClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.timeMachineIconClick();
    };

    expect(callFunction).not.toThrow();
  });
});


describe('timeMachine.timeMachineRemoveSatellite', () => {
  const { orbitManager, satSet, ColorScheme, groupsManager } = keepTrackApi.programs;
  test('0', () => {
    let callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(1, orbitManager, groupsManager, satSet, ColorScheme);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(100, orbitManager, groupsManager, satSet, ColorScheme);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      orbitManager.isTimeMachineVisible = false;
      timeMachine.timeMachineRemoveSatellite(100, orbitManager, groupsManager, satSet, ColorScheme);
    };

    expect(callFunction).not.toThrow();
  });
});

import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as timeMachine from './time-machine';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('timeMachine.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.init();
      keepTrackApi.methods.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('timeMachine.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('menu-fake');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('menu-time-machine');
      timeMachine.bottomMenuClick('menu-time-machine');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('orbitManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.orbitManagerInit();
      keepTrackApi.programs.orbitManager.playNextSatellite(1, 59);
      keepTrackApi.programs.orbitManager.historyOfSatellitesPlay();
      keepTrackApi.programs.orbitManager.isTimeMachineVisible = true;
      keepTrackApi.programs.orbitManager.playNextSatellite(1, 59);
      keepTrackApi.programs.orbitManager.playNextSatellite(1, 20);
      keepTrackApi.programs.orbitManager.playNextSatellite(1, parseInt(new Date().getUTCFullYear().toString().slice(2, 4)));
      keepTrackApi.programs.orbitManager.playNextSatellite(5, 10);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('timeMachine.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('timeMachine.timeMachineIconClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineIconClick();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('timeMachine.timeMachineRemoveSatellite', () => {
  const { orbitManager, satSet, colorSchemeManager, groupsManager } = keepTrackApi.programs;
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(1, orbitManager, groupsManager, satSet, colorSchemeManager);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(100, orbitManager, groupsManager, satSet, colorSchemeManager);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      orbitManager.isTimeMachineVisible = false;
      timeMachine.timeMachineRemoveSatellite(100, orbitManager, groupsManager, satSet, colorSchemeManager);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('timeMachine.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('timeMachine.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('menu-time-machine');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      timeMachine.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('timeMachine.orbitManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.orbitManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('timeMachine.timeMachineIconClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineIconClick();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('timeMachine.timeMachineRemoveSatellite', () => {
  test('0', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(
        100,
        keepTrackApi.programs.orbitManager,
        keepTrackApi.programs.groupsManager,
        keepTrackApi.programs.satSet,
        keepTrackApi.programs.colorSchemeManager
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(
        1,
        keepTrackApi.programs.orbitManager,
        keepTrackApi.programs.groupsManager,
        keepTrackApi.programs.satSet,
        keepTrackApi.programs.colorSchemeManager
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(
        0,
        keepTrackApi.programs.orbitManager,
        keepTrackApi.programs.groupsManager,
        keepTrackApi.programs.satSet,
        keepTrackApi.programs.colorSchemeManager
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(
        -5.48,
        keepTrackApi.programs.orbitManager,
        keepTrackApi.programs.groupsManager,
        keepTrackApi.programs.satSet,
        keepTrackApi.programs.colorSchemeManager
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(
        100,
        keepTrackApi.programs.orbitManager,
        keepTrackApi.programs.groupsManager,
        keepTrackApi.programs.satSet,
        keepTrackApi.programs.colorSchemeManager
      );
    };

    expect(callFunction).not.toThrow();
  });
});

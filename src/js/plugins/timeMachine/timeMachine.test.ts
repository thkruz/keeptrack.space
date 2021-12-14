import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as timeMachine from './timeMachine';

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
      timeMachine.timeMachineRemoveSatellite(100, 'Face to face', 'Customer Metrics Consultant', false, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(1, 'Customizable', 'Principal Implementation Strategist', false, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(0, true, 'Product Accountability Executive', '1.0.0', { default: 'v1.2.4' });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(-5.48, true, 'Customer Metrics Consultant', '^5.0.0', 'and Sons');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(100, false, 'Product Accountability Executive', '^5.0.0', { default: '^5.0.0' });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      timeMachine.timeMachineRemoveSatellite(NaN, { tempTransColor: '', historyOfSatellitesRunCount: '', isTimeMachineRunning: '', isTimeMachineVisible: NaN }, '', '', NaN);
    };

    expect(callFunction).not.toThrow();
  });
});

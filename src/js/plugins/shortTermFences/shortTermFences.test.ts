import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as shortTermFences from '@app/js/plugins/shortTermFences/shortTermFences';
import { expect } from '@jest/globals';
/* eslint-disable no-undefined */

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('shortTermFences.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('shortTermFences.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('menu-stf');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      shortTermFences.bottomMenuClick('menu-stf');
      shortTermFences.bottomMenuClick('menu-stf');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.resetSensor', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.resetSensor();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.selectSatData', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.selectSatData(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      shortTermFences.selectSatData(false);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.setSensor', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor(false, 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor(null, null);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor('fakeData', 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor(NaN, NaN);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor('fakeDat', 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor(undefined, undefined);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor(false, undefined);
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor('fakeData', 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor(-5.48, 124515);
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    const callFunction: any = () => {
      shortTermFences.setSensor(false, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('shortTermFences.stfFormOnSubmit', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.stfFormOnSubmit({
        bubbles: false,
        cancelBubble: false,
        cancelable: true,
        composed: false,
        currentTarget: {},
        defaultPrevented: false,
        eventPhase: 'fakeData',
        isTrusted: false,
        returnValue: false,
        srcElement: {},
        target: {},
        timeStamp: 12345,
        type: 'number',
        AT_TARGET: 987650,
        BUBBLING_PHASE: 10.0,
        CAPTURING_PHASE: 10.0,
        NONE: 5,
        preventDefault: jest.fn(),
      } as any);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;

      shortTermFences.stfFormOnSubmit({
        bubbles: false,
        cancelBubble: true,
        cancelable: true,
        composed: false,
        currentTarget: {},
        defaultPrevented: false,
        eventPhase: 9876,
        isTrusted: false,
        returnValue: false,
        srcElement: {},
        target: {},
        timeStamp: '1234',
        type: 'object',
        AT_TARGET: 987650,
        BUBBLING_PHASE: -1.0,
        CAPTURING_PHASE: 0.0,
        NONE: 10,
        preventDefault: jest.fn(),
      } as any);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;

      shortTermFences.stfFormOnSubmit({
        bubbles: false,
        cancelBubble: true,
        cancelable: true,
        composed: false,
        currentTarget: {},
        defaultPrevented: false,
        eventPhase: 9876,
        isTrusted: false,
        returnValue: false,
        srcElement: {},
        target: {},
        timeStamp: '1234',
        type: 'object',
        AT_TARGET: 987650,
        BUBBLING_PHASE: -1.0,
        CAPTURING_PHASE: 0.0,
        NONE: 10,
        preventDefault: jest.fn(),
      } as any);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.stfOnObjectLinkClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.stfOnObjectLinkClick();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('menu-stf');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      shortTermFences.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

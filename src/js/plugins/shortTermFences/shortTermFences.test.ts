import * as shortTermFences from '@app/js/plugins/shortTermFences/shortTermFences';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = {...keepTrackApi.programs, ...keepTrackApiStubs.programs};

// @ponicode
describe('shortTermFences.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      shortTermFences.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      shortTermFences.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      shortTermFences.bottomMenuClick('menu-stf');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      shortTermFences.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
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
    let callFunction: any = () => {
      shortTermFences.resetSensor();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.hideSideMenus', () => {
  test('0', () => {
    let callFunction: any = () => {
      shortTermFences.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.selectSatData', () => {
  test('0', () => {
    let callFunction: any = () => {
      shortTermFences.selectSatData(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      shortTermFences.selectSatData(false);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.setSensor', () => {
  test('0', () => {
    let callFunction: any = () => {
      shortTermFences.setSensor(false, 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      shortTermFences.setSensor(null, null);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      shortTermFences.setSensor('c466a48309794261b64a4f02cfcc3d64', 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      shortTermFences.setSensor(NaN, NaN);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('shortTermFences.stfFormOnSubmit', () => {
  test('0', () => {
    let callFunction: any = () => {
      shortTermFences.stfFormOnSubmit({
        bubbles: false,
        cancelBubble: false,
        cancelable: true,
        composed: false,
        currentTarget: {},
        defaultPrevented: false,
        eventPhase: 'c466a48309794261b64a4f02cfcc3d64',
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
    let callFunction: any = () => {
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
        timeStamp: 'bc23a9d531064583ace8f67dad60f6bb',
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
    let callFunction: any = () => {
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
        timeStamp: 'bc23a9d531064583ace8f67dad60f6bb',
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
    let callFunction: any = () => {
      shortTermFences.stfOnObjectLinkClick();
    };

    expect(callFunction).not.toThrow();
  });
});

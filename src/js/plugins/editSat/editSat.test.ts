import '@app/js/settingsManager/settingsManager';

import * as editSat from '@app/js/plugins/editSat/editSat';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
keepTrackApi.programs.settingsManager = window.settingsManager;
// @ponicode
describe('editSat.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.bottomMenuClick('menu-editSat');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      editSat.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      keepTrackApi.programs.objectManager.selectedSat = 1;
      editSat.bottomMenuClick('menu-editSat');
      editSat.bottomMenuClick('menu-editSat');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.rmbMenuActions', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.rmbMenuActions('edit-sat-rmb', 56784);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      editSat.rmbMenuActions('edit-sat-rmb', '1.0.0');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      editSat.rmbMenuActions('Home Loan Account', 12345);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      editSat.rmbMenuActions('edit-sat-rmb', true);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      editSat.rmbMenuActions('edit-sat-rmb', '4.0.0-beta1\t');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      editSat.rmbMenuActions('', NaN);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.hideSideMenus', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.editSatNewTleClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.editSatNewTleClick();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.editSatNewTleClickFadeIn', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.editSatNewTleClickFadeIn();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.editSatSubmit', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.editSatSubmit({
        bubbles: true,
        cancelBubble: true,
        cancelable: true,
        composed: false,
        currentTarget: {} as any,
        defaultPrevented: true,
        eventPhase: 7588892,
        isTrusted: false,
        returnValue: true,
        srcElement: {} as any,
        target: {} as any,
        timeStamp: 123456,
        type: 'number',
        AT_TARGET: 56784,
        BUBBLING_PHASE: 1.0,
        CAPTURING_PHASE: 10.23,
        NONE: 1,
        preventDefault: () => {},
      } as any);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      editSat.editSatSubmit({
        bubbles: false,
        cancelBubble: true,
        cancelable: true,
        composed: false,
        currentTarget: {},
        defaultPrevented: false,
        eventPhase: NaN,
        isTrusted: false,
        returnValue: true,
        srcElement: null,
        target: {},
        timeStamp: NaN,
        type: '',
        AT_TARGET: NaN,
        BUBBLING_PHASE: NaN,
        CAPTURING_PHASE: NaN,
        NONE: NaN,
        preventDefault: () => {},
      } as any);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('editSat.editSatSaveClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      editSat.editSatSubmit({
        bubbles: true,
        cancelBubble: true,
        cancelable: true,
        composed: false,
        currentTarget: {} as any,
        defaultPrevented: true,
        eventPhase: 7588892,
        isTrusted: false,
        returnValue: true,
        srcElement: {} as any,
        target: {} as any,
        timeStamp: 123456,
        type: 'number',
        AT_TARGET: 56784,
        BUBBLING_PHASE: 1.0,
        CAPTURING_PHASE: 10.23,
        NONE: 1,
        preventDefault: () => {},
      } as any);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      editSat.editSatSubmit({
        bubbles: false,
        cancelBubble: true,
        cancelable: true,
        composed: false,
        currentTarget: {},
        defaultPrevented: false,
        eventPhase: NaN,
        isTrusted: false,
        returnValue: true,
        srcElement: null,
        target: {},
        timeStamp: NaN,
        type: '',
        AT_TARGET: NaN,
        BUBBLING_PHASE: NaN,
        CAPTURING_PHASE: NaN,
        NONE: NaN,
        preventDefault: () => {},
      } as any);
    };

    expect(callFunction).not.toThrow();
  });
});

import 'jquery-ui-bundle';
import '@app/js/lib/external/jquery-ui-timepicker.js';

import * as datetime from '@app/js/plugins/datetime/datetime';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('datetime.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      datetime.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('datetime.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `
            <div id="datetime-text"></div>
            <div id="datetime-input-tb"></div>
            <input id="datetime-input-form"></input>
            <div id="nav-wrapper"></div>
            `;
      datetime.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('datetime.updateDateTime', () => {
  test('0', () => {
    let param1: any = new Date('32-01-2020');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let param1: any = new Date('01-01-2020');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let param1: any = new Date('01-01-2030');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let param1: any = new Date('01-13-2020');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let param1: any = new Date('');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let param1: any = new Date('2016-02-29');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    let param1: any = new Date('01-01-2020)');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    let param1: any = new Date('2016-02-10');
    let callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('datetime.datetimeInputFormChange', () => {
    test('0', () => {
      let callFunction: any = () => {
        datetime.datetimeInputFormChange();
      };
  
      expect(callFunction).not.toThrow();
    });
  });

  describe('datetime.datetimeTextClick ', () => {
    test('0', () => {
      let callFunction: any = () => {
        datetime.datetimeTextClick ();
      };
  
      expect(callFunction).not.toThrow();
    });
  });

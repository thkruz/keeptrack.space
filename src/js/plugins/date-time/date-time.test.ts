// organize-imports-ignore
import 'jquery-ui-bundle';
import '@app/js/lib/external/jquery-ui-timepicker.js';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as datetime from './date-time';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('datetime.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      datetime.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('datetime.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
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
    const param1: any = new Date('32-01-2020');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const param1: any = new Date('01-01-2020');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const param1: any = new Date('01-01-2030');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const param1: any = new Date('01-13-2020');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const param1: any = new Date('');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const param1: any = new Date('2016-02-29');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const param1: any = new Date('01-01-2020)');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const param1: any = new Date('2016-02-10');
    const callFunction: any = () => {
      datetime.updateDateTime(param1);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('datetime.datetimeInputFormChange', () => {
  test('0', () => {
    const callFunction: any = () => {
      datetime.datetimeInputFormChange(new Date());
    };

    expect(callFunction).not.toThrow();
  });
});

describe('datetime.datetimeTextClick ', () => {
  test('0', () => {
    const callFunction: any = () => {
      datetime.datetimeTextClick();
    };

    expect(callFunction).not.toThrow();
  });
});

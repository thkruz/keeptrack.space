import * as main from './main.js';

import { expect } from '@jest/globals';
import { useMockWorkers } from '@app/js/api/apiMocks';

// @ponicode
describe('main.redirectHttpToHttps', () => {
  test('0', () => {
    let callFunction = () => {
      main.redirectHttpToHttps();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('main.showErrorCode', () => {
  test('0', () => {
    let callFunction = () => {
      main.showErrorCode({ message: 'No os dependencies found. ', lineNumber: -10, stack: 1 });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      main.showErrorCode({ message: 'Invalid Invitation Token.', lineNumber: -10, stack: 'Foo bar' });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      main.showErrorCode({ message: 1, lineNumber: '(960) 322-6791 x982', stack: 10 });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      main.showErrorCode({ message: 'Invalid [%s] value. %s', lineNumber: 'bar', stack: 'This is a Text' });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      main.showErrorCode({ message: 'bar', lineNumber: '(843) 825-0940 x26936', stack: -10 });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      main.showErrorCode(undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('main.initalizeKeepTrack', () => {
  test('0', async () => {
    useMockWorkers();
    await main.initalizeKeepTrack();
  });
});

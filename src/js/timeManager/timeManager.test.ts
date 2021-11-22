import * as timeManager from '@app/js/timeManager/timeManager';
import { expect } from '@jest/globals';
// @ponicode
describe('timeManager.getDayOfYear', () => {
  test('0', () => {
    const param1: any = new Date('01-13-2020');
    const callFunction: any = () => {
      timeManager.getDayOfYear(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const param1: any = new Date('32-01-2020');
    const callFunction: any = () => {
      timeManager.getDayOfYear(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const param1: any = new Date('01-01-2020');
    const callFunction: any = () => {
      timeManager.getDayOfYear(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const param1: any = new Date('01-01-2030');
    const callFunction: any = () => {
      timeManager.getDayOfYear(param1);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const param1: any = new Date('');
    const callFunction: any = () => {
      timeManager.getDayOfYear(param1);
    };

    expect(callFunction).not.toThrow();
  });
});

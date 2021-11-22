import * as aboutManager from '@app/js/plugins/aboutManager/aboutManager';
import { expect } from '@jest/globals';

// @ponicode
describe('aboutManager.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      aboutManager.init();
    };

    expect(callFunction).not.toThrow();
  });
});

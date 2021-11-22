import * as sounds from '@app/js/plugins/sounds/sounds';
import { expect } from '@jest/globals';
// @ponicode
describe('sounds.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      sounds.init();
    };

    expect(callFunction).not.toThrow();
  });
});

import * as nightToggle from '@app/js/plugins/night-toggle/night-toggle';
import { expect } from '@jest/globals';
// @ponicode
describe('nightToggle.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      nightToggle.init();
    };

    expect(callFunction).not.toThrow();
  });
});

import * as twitter from '@app/js/plugins/twitter/twitter';
import { expect } from '@jest/globals';

// @ponicode
describe('twitter.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      twitter.init();
    };

    expect(callFunction).not.toThrow();
  });
});

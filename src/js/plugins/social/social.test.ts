import * as social from '@app/js/plugins/social/social';
import { expect } from '@jest/globals';
// @ponicode
describe('social.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      social.init();
    };

    expect(callFunction).not.toThrow();
  });
});

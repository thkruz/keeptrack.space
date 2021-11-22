import * as topMenu from '@app/js/plugins/topMenu/topMenu';
import { expect } from '@jest/globals';
// @ponicode
describe('topMenu.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      topMenu.init();
    };

    expect(callFunction).not.toThrow();
  });
});

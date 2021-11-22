import * as satelliteView from '@app/js/plugins/satelliteView/satelliteView';
import { expect } from '@jest/globals';
// @ponicode
describe('satelliteView.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteView.init();
    };

    expect(callFunction).not.toThrow();
  });
});

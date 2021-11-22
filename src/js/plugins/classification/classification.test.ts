import * as classification from '@app/js/plugins/classification/classification';
import { expect } from '@jest/globals';
// @ponicode
describe('classification.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      classification.init();
    };

    expect(callFunction).not.toThrow();
  });
});

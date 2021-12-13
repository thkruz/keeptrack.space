import * as externalApi from '@app/js/api/keepTrackApi';
import { expect } from '@jest/globals';
// @ponicode
describe('externalApi.isThisJest', () => {
  test('0', () => {
    const callFunction: any = () => {
      externalApi.isThisJest();
    };

    expect(callFunction).not.toThrow();
  });
});

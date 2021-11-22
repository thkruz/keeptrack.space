import * as apiMocks from '@app/js/api/apiMocks';
import { expect } from '@jest/globals';
// @ponicode
describe('apiMocks.useMockWorkers', () => {
  test('0', () => {
    const callFunction: any = () => {
      apiMocks.useMockWorkers();
    };

    expect(callFunction).not.toThrow();
  });
});

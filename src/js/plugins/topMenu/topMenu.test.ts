import { expect } from '@jest/globals';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as topMenu from './topMenu';
import { init } from './topMenu';
// @ponicode
describe('topMenu.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      topMenu.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('topMenu', () => {
  it('should be initialized', () => {
    init();
  });

  it('should add the top menu', () => {
    keepTrackApi.methods.uiManagerInit();
  });
});

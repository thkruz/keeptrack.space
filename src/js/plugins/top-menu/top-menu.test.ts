import { expect } from '@jest/globals';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as topMenu from './top-menu';
import { init } from './top-menu';
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

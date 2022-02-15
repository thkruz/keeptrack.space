import { expect } from '@jest/globals';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as social from './social';
// @ponicode
describe('social.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      social.init();
    };

    expect(callFunction).not.toThrow();
  });

  it('should add social media icons', () => {
    keepTrackApi.methods.uiManagerFinal();
  });
});

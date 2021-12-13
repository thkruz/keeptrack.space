import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as satelliteView from './satelliteView';

keepTrackApi.programs = <any>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('satelliteView.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteView.init();
    };

    expect(callFunction).not.toThrow();
  });
});

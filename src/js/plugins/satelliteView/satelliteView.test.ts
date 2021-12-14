import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as satelliteView from './satelliteView';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satelliteView.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteView.init();
    };

    expect(callFunction).not.toThrow();
  });
});

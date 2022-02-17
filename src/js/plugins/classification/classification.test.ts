import '@app/js/settingsManager/settingsManager';
import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import { init, setClassificationBanner } from './classification';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
(<any>window).settingsManager = {
  classificationStr: '',
};

describe('classification', () => {
  it('should be initialized', () => {
    init();
    keepTrackApi.methods.uiManagerInit();
  });
  it('should ignore no classification', () => {
    (<any>window).settingsManager.classificationStr = '';
    setClassificationBanner();
  });
  it('should add unclassified classification to the top', () => {
    (<any>window).settingsManager.classificationStr = 'Unclassified';
    setClassificationBanner();
  });
  it('should add secret classification to the top', () => {
    (<any>window).settingsManager.classificationStr = 'Secret';
    setClassificationBanner();
  });
  it('should add top secret classification to the top', () => {
    (<any>window).settingsManager.classificationStr = 'Top Secret';
    setClassificationBanner();
  });
  it('should add sci classification to the top', () => {
    (<any>window).settingsManager.classificationStr = 'Top Secret//SCI LA';
    setClassificationBanner();
  });
});

// @ponicode
describe('classification.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      init();
    };

    expect(callFunction).not.toThrow();
  });
});

import '@app/js/settingsManager/settingsManager';
import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as classification from './classification';
import { init } from './classification';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
const settingsManager = {
  classificationStr: '',
};

describe('classification', () => {
  it('should be initialized', () => {
    init();
  });
  it('should ignore no classification', () => {
    settingsManager.classificationStr = '';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add unclassified classification to the top', () => {
    settingsManager.classificationStr = 'Unclassified';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add secret classification to the top', () => {
    settingsManager.classificationStr = 'Secret';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add top secret classification to the top', () => {
    settingsManager.classificationStr = 'Top Secret';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add sci classification to the top', () => {
    settingsManager.classificationStr = 'Top Secret//SCI LA';
    keepTrackApi.methods.uiManagerInit();
  });
});

// @ponicode
describe('classification.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      classification.init();
    };

    expect(callFunction).not.toThrow();
  });
});

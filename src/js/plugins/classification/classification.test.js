import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import '@app/js/settingsManager/settingsManager';
import { init } from './classification';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
settingsManager = {};

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

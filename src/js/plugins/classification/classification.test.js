/* globals it jest describe */

import { init } from './classification';
import { keepTrackApi } from '@app/js/api/externalApi';

describe('classification', () => {
  it('should be initialized', () => {
    init();
  });
  it('should ignore no classification', () => {
    keepTrackApi.programs.settingsManager.classificationStr = '';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add unclassified classification to the top', () => {
    keepTrackApi.programs.settingsManager.classificationStr = 'Unclassified';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add secret classification to the top', () => {
    keepTrackApi.programs.settingsManager.classificationStr = 'Secret';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add top secret classification to the top', () => {
    keepTrackApi.programs.settingsManager.classificationStr = 'Top Secret';
    keepTrackApi.methods.uiManagerInit();
  });
  it('should add sci classification to the top', () => {
    keepTrackApi.programs.settingsManager.classificationStr = 'Top Secret//SCI LA';
    keepTrackApi.methods.uiManagerInit();
  });
});

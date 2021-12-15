import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as analysis from '@app/js/plugins/analysis/analysis';
import '@app/js/settingsManager/settingsManager';
import { expect } from '@jest/globals';
/* eslint-disable no-undefined */

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
settingsManager = window.settingsManager;

// @ponicode
describe('analysis.analysisBptSumbit', () => {
  test('0', () => {
    const callFunction: any = () => {
      analysis.analysisBptSumbit();
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      analysis.analysisBptSumbit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('analysis.findCsoBtnClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      analysis.findCsoBtnClick();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('analysis.analysisFormSubmit', () => {
  test('0', () => {
    const callFunction: any = () => {
      analysis.analysisFormSubmit();
      keepTrackApi.programs.sensorManager.currentSensor[0].shortName = undefined;
      analysis.analysisFormSubmit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('analysis.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      analysis.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

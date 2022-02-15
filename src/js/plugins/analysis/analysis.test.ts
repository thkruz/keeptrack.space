import '@app/js/settingsManager/settingsManager';
import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as analysis from './analysis';
import { init } from './analysis';
/* eslint-disable no-undefined */

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
settingsManager = window.settingsManager;

test('Load Analysis Plugin', () => {
  window.M = {
    FormSelect: {
      init: () => true,
    },
  };

  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  keepTrackApi.methods.selectSatData();
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  window.keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  keepTrackApi.methods.bottomMenuClick('NOTmenu-analysis');
  keepTrackApi.methods.hideSideMenus();
  keepTrackApi.methods.selectSatData();
});

test('Load Analysis Plugin', () => {
  window.M = {
    FormSelect: {
      init: () => true,
    },
  };

  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  keepTrackApi.methods.selectSatData();
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  window.keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
  keepTrackApi.methods.bottomMenuClick('menu-analysis');
  keepTrackApi.methods.bottomMenuClick('NOTmenu-analysis');
  keepTrackApi.methods.hideSideMenus();
  keepTrackApi.methods.selectSatData();
});

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

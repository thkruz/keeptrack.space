import * as core from '@app/js/plugins/core';

// import { expect } from '@jest/globals';
import { keepTrackApi } from '../api/externalApi';

// @ponicode
describe('core.loadCorePlugins', () => {
  test('0', async () => {
    const plugins = {      
      satInfoboxCore: true,
      updateSelectBoxCore: true,
      aboutManager: true,
      collisions: true,
      dops: true,
      findSat: true,
      launchCalendar: true,
      newLaunch: true,
      nextLaunch: true,
      nightToggle: true,
      photoManager: true,
      recorderManager: true,
      satChanges: true,
      stereoMap: true,
      timeMachine: true,
      twitter: true,
      initialOrbit: true,
      missile: true,
      breakup: true,
      editSat: true,
      constellations: true,
      countries: true,
      colorsMenu: true,
      shortTermFences: true,
      externalSources: true,
      analysis: true,
      sensorFov: true,
      sensorSurv: true,
      satelliteView: true,
      satelliteFov: true,
      planetarium: true,
      astronomy: true,
      photo: true,
      watchlist: true,
      sensor: true,
      settingsMenu: true,
      datetime: true,
      social: true,
      topMenu: true,
      classification: true,
      soundManager: true,
    };
    keepTrackApi.programs.sceneManager = {
      registerAtmoshpere: jest.fn(),
    };
    await core.loadCorePlugins(keepTrackApi, plugins);
    keepTrackApi.methods.uiManagerFinal();
  });

  test('1', async () => {
    keepTrackApi.programs.sceneManager = {
      registerAtmoshpere: jest.fn(),
    };
    await core.loadCorePlugins(keepTrackApi, {});
    keepTrackApi.methods.uiManagerFinal();
  });
});

import { loadCorePlugins, uiManagerFinal } from '.';
import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

const testPluginsTrue = {
  debug: true,
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
  orbitReferences: true,
  externalSources: true,
  analysis: true,
  plotAnalysis: true,
  sensorFov: true,
  sensorSurv: true,
  satelliteFov: true,
  satelliteView: true,
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
  gamepad: true,
  scenarioCreator: true,
};

const testPluginsFalse = {
  debug: false,
  satInfoboxCore: false,
  updateSelectBoxCore: false,
  aboutManager: false,
  collisions: false,
  dops: false,
  findSat: false,
  launchCalendar: false,
  newLaunch: false,
  nextLaunch: false,
  nightToggle: false,
  photoManager: false,
  recorderManager: false,
  satChanges: false,
  stereoMap: false,
  timeMachine: false,
  twitter: false,
  initialOrbit: false,
  missile: false,
  breakup: false,
  editSat: false,
  constellations: false,
  countries: false,
  colorsMenu: false,
  shortTermFences: false,
  orbitReferences: false,
  externalSources: false,
  analysis: false,
  plotAnalysis: false,
  sensorFov: false,
  sensorSurv: false,
  satelliteFov: false,
  satelliteView: false,
  planetarium: false,
  astronomy: false,
  photo: false,
  watchlist: false,
  sensor: false,
  settingsMenu: false,
  datetime: false,
  social: false,
  topMenu: false,
  classification: false,
  soundManager: false,
  gamepad: false,
  scenarioCreator: false,
};

describe('plugins testing', () => {
  it('should load core plugins with all available', () => {
    const callFunction: any = () => {
      loadCorePlugins(keepTrackApi, testPluginsTrue);
    };

    expect(callFunction).not.toThrow();
  });

  it('should load core plugins with all unavailable', () => {
    const callFunction: any = () => {
      loadCorePlugins(keepTrackApi, testPluginsFalse);
    };

    expect(callFunction).not.toThrow();
  });

  it('should handle uiManagerFinal', () => {
    const callFunction: any = () => {
      uiManagerFinal(testPluginsTrue);
    };

    expect(callFunction).not.toThrow();
  });
});

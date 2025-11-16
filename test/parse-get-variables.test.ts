/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */

import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { GetVariables } from '@app/settings/getVariables';
import { parseGetVariables } from '@app/settings/parse-get-variables';
import { SettingsManager } from '@app/settings/settings';

describe('parseGetVariables', () => {
  let settingsManager: SettingsManager;
  let toastMock: jest.Mock;

  beforeEach(() => {
    toastMock = jest.fn();
    settingsManager = {
      plugins: {},
      disableAllPlugins: jest.fn(),
      dataSources: {} as any,
      colors: {} as any,
      satShader: {} as any,
    } as unknown as SettingsManager;
    // Mock ServiceLocator.getUiManager().toast
    jest.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(toastMock);
  });

  it('should handle bad presets', () => {
    const runFake = () => parseGetVariables(['preset=fakePreset'], settingsManager);

    expect(runFake).not.toThrow();
  });

  it('should load ops-center preset', () => {
    const loadPresetOpsCenter = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetOpsCenter');

    parseGetVariables(['preset=ops-center'], settingsManager);
    expect(loadPresetOpsCenter).toHaveBeenCalledWith(settingsManager);
  });

  it('should load education preset', () => {
    const loadPresetEducation = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetEducation');

    parseGetVariables(['preset=education'], settingsManager);
    expect(loadPresetEducation).toHaveBeenCalledWith(settingsManager);
  });

  it('should load outreach preset', () => {
    const loadPresetOutreach = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetOutreach');

    parseGetVariables(['preset=outreach'], settingsManager);
    expect(loadPresetOutreach).toHaveBeenCalledWith(settingsManager);
  });

  it('should load debris preset', () => {
    const loadPresetDebris = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetDebris');

    parseGetVariables(['preset=debris'], settingsManager);
    expect(loadPresetDebris).toHaveBeenCalledWith(settingsManager);
  });

  it('should call darkClouds', () => {
    const darkClouds = jest.spyOn(require('@app/settings/presets/darkClouds'), 'darkClouds');

    parseGetVariables(['preset=dark-clouds'], settingsManager);
    expect(darkClouds).toHaveBeenCalledWith(settingsManager);
  });

  it('should call starTalk', () => {
    const starTalk = jest.spyOn(require('@app/settings/presets/startalk'), 'starTalk');

    parseGetVariables(['preset=startalk'], settingsManager);
    expect(starTalk).toHaveBeenCalledWith(settingsManager);
  });

  it('should call stemEnvironment', () => {
    const stemEnvironment = jest.spyOn(require('@app/settings/presets/stem'), 'stemEnvironment');

    parseGetVariables(['preset=stem'], settingsManager);
    expect(stemEnvironment).toHaveBeenCalledWith(settingsManager);
  });

  it('should load million-year preset', () => {
    const loadPresetMillionYear = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetMillionYear');

    parseGetVariables(['preset=million-year'], settingsManager);
    expect(loadPresetMillionYear).toHaveBeenCalledWith(settingsManager);
  });

  it('should load million-year2 preset', () => {
    const loadPresetMillionYear2 = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetMillionYear2');

    parseGetVariables(['preset=million-year2'], settingsManager);
    expect(loadPresetMillionYear2).toHaveBeenCalledWith(settingsManager);
  });

  it('should load facsat2 preset', () => {
    const loadPresetFacSat2 = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetFacSat2');

    parseGetVariables(['preset=facsat2'], settingsManager);
    expect(loadPresetFacSat2).toHaveBeenCalledWith(settingsManager);
  });

  it('should load altitudes preset', () => {
    const loadPresetAltitudes_ = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetAltitudes_');

    parseGetVariables(['preset=altitudes'], settingsManager);
    expect(loadPresetAltitudes_).toHaveBeenCalledWith(settingsManager);
  });

  it('should load starlink preset', () => {
    const loadPresetStarlink = jest.spyOn(require('@app/settings/presets/presets').SettingsPresets, 'loadPresetStarlink');

    parseGetVariables(['preset=starlink'], settingsManager);
    expect(loadPresetStarlink).toHaveBeenCalledWith(settingsManager);
  });

  it('should enable JSC catalog', () => {
    parseGetVariables(['jsc=true'], settingsManager);
    expect(settingsManager.isEnableJscCatalog).toBe(true);
  });

  it('should enable DebugMenuPlugin', () => {
    parseGetVariables(['debug=anything'], settingsManager);
    expect(settingsManager.plugins.DebugMenuPlugin?.enabled).toBe(true);
  });

  it('should set maxFieldOfViewMarkers to 1 for nomarkers', () => {
    parseGetVariables(['nomarkers='], settingsManager);
    expect(settingsManager.maxFieldOfViewMarkers).toBe(1);
  });

  it('should disable orbits for noorbits', () => {
    parseGetVariables(['noorbits='], settingsManager);
    expect(settingsManager.isDrawOrbits).toBe(false);
  });

  it('should set searchLimit if valid', () => {
    parseGetVariables(['searchLimit=10'], settingsManager);
    expect(settingsManager.searchLimit).toBe(10);
  });

  it('should show toast if searchLimit is invalid', () => {
    parseGetVariables(['searchLimit=-1'], settingsManager);
    expect(toastMock).toHaveBeenCalledWith('Invalid search limit: -1', ToastMsgType.error);
  });

  it('should enable console', () => {
    parseGetVariables(['console='], settingsManager);
    expect(settingsManager.isEnableConsole).toBe(true);
  });

  it('should set godraysSamples', () => {
    const godraysMock = jest.spyOn(GetVariables, 'godrays').mockReturnValue(16);

    parseGetVariables(['godrays=abc'], settingsManager);
    expect(settingsManager.godraysSamples).toBe(16);
    godraysMock.mockRestore();
  });

  it('should set lowperf options', () => {
    parseGetVariables(['lowperf='], settingsManager);
    expect(settingsManager.isShowSplashScreen).toBe(false);
    expect(settingsManager.isDrawMilkyWay).toBe(false);
    expect(settingsManager.isDrawLess).toBe(true);
    expect(settingsManager.zFar).toBe(250000.0);
    expect(settingsManager.noMeshManager).toBe(true);
    expect(settingsManager.maxFieldOfViewMarkers).toBe(1);
  });

  it('should set hires options', () => {
    parseGetVariables(['hires='], settingsManager);
    expect(settingsManager.earthNumLatSegs).toBe(128);
    expect(settingsManager.earthNumLonSegs).toBe(128);
  });

  it('should disable stars and milky way for nostars', () => {
    parseGetVariables(['nostars='], settingsManager);
    expect(settingsManager.isDisableStars).toBe(true);
    expect(settingsManager.isDrawMilkyWay).toBe(false);
  });

  it('should set draw-less options', () => {
    parseGetVariables(['draw-less='], settingsManager);
    expect(settingsManager.isDrawMilkyWay).toBe(false);
    expect(settingsManager.isDrawLess).toBe(true);
    expect(settingsManager.zFar).toBe(250000.0);
    expect(settingsManager.noMeshManager).toBe(true);
  });

  it('should set draw-more options', () => {
    parseGetVariables(['draw-more='], settingsManager);
    expect(settingsManager.isDrawLess).toBe(false);
    expect(settingsManager.noMeshManager).toBe(false);
    expect(settingsManager.isDrawMilkyWay).toBe(true);
  });

  it('should enable hiresMilkWay', () => {
    parseGetVariables(['hires-milky-way='], settingsManager);
    expect(settingsManager.hiresMilkWay).toBe(true);
  });

  it('should set earthTextureStyle to FLAT for political', () => {
    parseGetVariables(['political='], settingsManager);
    expect(settingsManager.earthTextureStyle).toBe(EarthTextureStyle.FLAT);
  });

  it('should set offline mode and dataSources', () => {
    parseGetVariables(['offline='], settingsManager);
    expect(settingsManager.offlineMode).toBe(true);
    expect(settingsManager.dataSources.tle).toBe('/tle/tle.json');
    expect(settingsManager.dataSources.vimpel).toBe('/tle/vimpel.json');
  });

  it('should disable time machine toasts', () => {
    parseGetVariables(['notmtoast='], settingsManager);
    expect(settingsManager.isDisableTimeMachineToasts).toBe(true);
  });

  it('should enable copyright override', () => {
    parseGetVariables(['cpo='], settingsManager);
    expect(settingsManager.copyrightOveride).toBe(true);
  });

  it('should show primary logo', () => {
    parseGetVariables(['logo='], settingsManager);
    expect(settingsManager.isShowPrimaryLogo).toBe(true);
  });

  it('should always hide prop rate', () => {
    parseGetVariables(['noPropRate='], settingsManager);
    expect(settingsManager.isAlwaysHidePropRate).toBe(true);
  });

  it('should enable supplement external data', () => {
    parseGetVariables(['supplement-data='], settingsManager);
    expect(settingsManager.dataSources.isSupplementExternal).toBe(true);
  });

  it('should set latest-sats data source and disable JSC catalog', () => {
    parseGetVariables(['latest-sats=123'], settingsManager);
    expect(settingsManager.dataSources.tle).toBe('https://api.keeptrack.space/v3/sats/latest/123');
    expect(settingsManager.isEnableJscCatalog).toBe(false);
  });

  it('should set externalTLEs for CATNR', () => {
    parseGetVariables(['CATNR=456'], settingsManager);
    expect(settingsManager.dataSources.externalTLEs).toBe('https://celestrak.org/NORAD/elements/gp.php?CATNR=456&FORMAT=3LE');
    expect(settingsManager.dataSources.externalTLEsOnly).toBe(true);
  });

  it('should set externalTLEs for NAME', () => {
    parseGetVariables(['NAME=SATNAME'], settingsManager);
    expect(settingsManager.dataSources.externalTLEs).toBe('https://celestrak.org/NORAD/elements/gp.php?NAME=SATNAME&FORMAT=3LE');
    expect(settingsManager.dataSources.externalTLEsOnly).toBe(true);
  });

  it('should set externalTLEs for INTDES', () => {
    parseGetVariables(['INTDES=2022-001A'], settingsManager);
    expect(settingsManager.dataSources.externalTLEs).toBe('https://celestrak.org/NORAD/elements/gp.php?INTDES=2022-001A&FORMAT=3LE');
    expect(settingsManager.dataSources.externalTLEsOnly).toBe(true);
  });

  it('should set externalTLEs for GROUP', () => {
    parseGetVariables(['GROUP=STARLINK'], settingsManager);
    expect(settingsManager.dataSources.externalTLEs).toBe('https://celestrak.org/NORAD/elements/gp.php?GROUP=STARLINK&FORMAT=3LE');
    expect(settingsManager.dataSources.externalTLEsOnly).toBe(true);
  });

  it('should set externalTLEs for SPECIAL', () => {
    parseGetVariables(['SPECIAL=GEO'], settingsManager);
    expect(settingsManager.dataSources.externalTLEs).toBe('https://celestrak.org/NORAD/elements/gp.php?SPECIAL=GEO&FORMAT=3LE');
    expect(settingsManager.dataSources.externalTLEsOnly).toBe(true);
  });

  it('should ignore unknown keys', () => {
    expect(() => parseGetVariables(['unknownKey=foo'], settingsManager)).not.toThrow();
  });
});

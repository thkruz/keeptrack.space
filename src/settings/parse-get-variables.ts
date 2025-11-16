import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EarthDayTextureQuality, EarthNightTextureQuality, EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { GetVariables } from './getVariables';
import { darkClouds } from './presets/darkClouds';
import { SettingsPresets } from './presets/presets';
import { starTalk } from './presets/startalk';
import { stemEnvironment } from './presets/stem';
import type { SettingsManager } from './settings';

// eslint-disable-next-line complexity
export const parseGetVariables = (params: string[], settingsManager: SettingsManager): void => {
  for (const param of params) {
    const key = param.split('=')[0];
    const val = param.split('=')[1];

    switch (key) {
      case 'preset':
        switch (val) {
          case 'ops-center':
            SettingsPresets.loadPresetOpsCenter(settingsManager);
            break;
          case 'education':
            SettingsPresets.loadPresetEducation(settingsManager);
            break;
          case 'outreach':
            SettingsPresets.loadPresetOutreach(settingsManager);
            break;
          case 'debris':
            SettingsPresets.loadPresetDebris(settingsManager);
            break;
          case 'dark-clouds':
            darkClouds(settingsManager);
            break;
          case 'startalk':
            starTalk(settingsManager);
            break;
          case 'stem':
            stemEnvironment(settingsManager);
            break;
          case 'million-year':
            SettingsPresets.loadPresetMillionYear(settingsManager);
            break;
          case 'million-year2':
            SettingsPresets.loadPresetMillionYear2(settingsManager);
            break;
          case 'facsat2':
            SettingsPresets.loadPresetFacSat2(settingsManager);
            break;
          case 'altitudes':
            SettingsPresets.loadPresetAltitudes_(settingsManager);
            break;
          case 'starlink':
            SettingsPresets.loadPresetStarlink(settingsManager);
            break;
          default:
            break;
        }
        break;
      case 'jsc':
        settingsManager.isEnableJscCatalog = val === 'true';
        break;
      case 'debug':
        settingsManager.plugins.DebugMenuPlugin = { enabled: true };
        break;
      case 'nomarkers':
        settingsManager.maxFieldOfViewMarkers = 1;
        break;
      case 'noorbits':
        settingsManager.isDrawOrbits = false;
        break;
      case 'searchLimit':
        if (parseInt(val) > 0) {
          settingsManager.searchLimit = parseInt(val);
        } else {
          ServiceLocator.getUiManager().toast(`Invalid search limit: ${val}`, ToastMsgType.error);
        }
        break;
      case 'console':
        settingsManager.isEnableConsole = true;
        break;
      case 'godrays':
        settingsManager.godraysSamples = GetVariables.godrays(val);
        break;
      case 'lowperf':
        settingsManager.isShowSplashScreen = false;
        settingsManager.isDrawMilkyWay = false;
        settingsManager.isDrawLess = true;
        settingsManager.zFar = 250000.0;
        settingsManager.noMeshManager = true;
        settingsManager.maxFieldOfViewMarkers = 1;
        settingsManager.earthDayTextureQuality = '512' as EarthDayTextureQuality;
        settingsManager.earthNightTextureQuality = '512' as EarthNightTextureQuality;
        break;
      case 'hires':
        settingsManager.earthNumLatSegs = 128;
        settingsManager.earthNumLonSegs = 128;
        break;
      case 'nostars':
        settingsManager.isDisableStars = true;
        settingsManager.isDrawMilkyWay = false;
        break;
      case 'draw-less':
        settingsManager.isDrawMilkyWay = false;
        settingsManager.isDrawLess = true;
        settingsManager.zFar = 250000.0;
        settingsManager.noMeshManager = true;
        break;
      case 'draw-more':
        settingsManager.isDrawLess = false;
        settingsManager.noMeshManager = false;
        settingsManager.isDrawMilkyWay = true;
        break;
      case 'hires-milky-way':
        settingsManager.hiresMilkWay = true;
        break;
      case 'political':
        settingsManager.earthTextureStyle = EarthTextureStyle.FLAT;
        break;
      case 'offline':
        settingsManager.offlineMode = true;
        settingsManager.dataSources.tle = '/tle/tle.json';
        settingsManager.dataSources.vimpel = '/tle/vimpel.json';
        break;
      case 'notmtoast':
        settingsManager.isDisableTimeMachineToasts = true;
        break;
      case 'cpo':
        settingsManager.copyrightOveride = true;
        break;
      case 'logo':
        settingsManager.isShowPrimaryLogo = true;
        break;
      case 'noPropRate':
        settingsManager.isAlwaysHidePropRate = true;
        break;
      case 'supplement-data':
        settingsManager.dataSources.isSupplementExternal = true;
        break;
      case 'latest-sats':
        settingsManager.dataSources.tle = `https://api.keeptrack.space/v3/sats/latest/${val}`;
        settingsManager.isEnableJscCatalog = false;
        break;
      case 'CATNR':
        settingsManager.dataSources.externalTLEs = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${val}&FORMAT=3LE`;
        settingsManager.dataSources.externalTLEsOnly = true;
        break;
      case 'NAME':
        settingsManager.dataSources.externalTLEs = `https://celestrak.org/NORAD/elements/gp.php?NAME=${val}&FORMAT=3LE`;
        settingsManager.dataSources.externalTLEsOnly = true;
        break;
      case 'INTDES':
        settingsManager.dataSources.externalTLEs = `https://celestrak.org/NORAD/elements/gp.php?INTDES=${val}&FORMAT=3LE`;
        settingsManager.dataSources.externalTLEsOnly = true;
        break;
      case 'GROUP':
        settingsManager.dataSources.externalTLEs = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${val}&FORMAT=3LE`;
        settingsManager.dataSources.externalTLEsOnly = true;
        break;
      case 'SPECIAL':
        settingsManager.dataSources.externalTLEs = `https://celestrak.org/NORAD/elements/gp.php?SPECIAL=${val}&FORMAT=3LE`;
        settingsManager.dataSources.externalTLEsOnly = true;
        break;
      default:
    }
  }
};

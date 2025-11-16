import { ToastMsgType } from '@app/engine/core/interfaces';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager, settingsManager } from '@app/settings/settings';
import { DEG2RAD, Degrees, DetailedSatellite, RAD2DEG, Radians } from '@ootk/src/main';
import { PluginRegistry } from '../core/plugin-registry';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { AtmosphereSettings, EarthTextureStyle } from '../rendering/draw-manager/earth-quality-enums';
import { getEl } from '../utils/get-el';
import { OrbitCruncherMsgType } from '@app/webworker/orbit-cruncher-interfaces';

export abstract class UrlManager {
  private static selectedSat_: DetailedSatellite | null = null;
  private static searchString_: string = '';
  private static propRate_: number;
  private static readonly colorSchemeDefinitions_ = {
    'type': 'ObjectTypeColorScheme',
    'celestrak': 'CelestrakColorScheme',
    'country': 'CountryColorScheme',
    'rcs': 'RcsColorScheme',
    'mission': 'MissionColorScheme',
    'confidence': 'ConfidenceColorScheme',
    'orbitalplane': 'OrbitalPlaneDensityColorScheme',
    'spatial': 'SpatialDensityColorScheme',
    'sunlight': 'SunlightColorScheme',
    'gpage': 'GpAgeColorScheme',
    'source': 'SourceColorScheme',
    'velocity': 'VelocityColorScheme',
    'starlink': 'StarlinkColorScheme',
    'smallsat': 'SmallSatColorScheme',
  };
  static lastUpdateTime_: number;

  static {
    EventBus.getInstance().on(EventBusEvent.selectSatData, (sat) => {
      if (sat instanceof DetailedSatellite) {
        this.selectedSat_ = sat;
      } else {
        this.selectedSat_ = null;
      }
      this.updateURL();
    });

    EventBus.getInstance().on(EventBusEvent.propRateChanged, (propRate: number) => {
      this.propRate_ = propRate;
      this.updateURL();
    });

    EventBus.getInstance().on(EventBusEvent.searchUpdated, (searchString: string) => {
      this.searchString_ = searchString;
      this.updateURL();
    });

    EventBus.getInstance().on(EventBusEvent.updateDateTime, () => {
      this.updateURL();
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key) => {
      if (key === 'U') {
        this.updateURL(true);
      }
    });
  }

  static getParams(): string[] {
    let queryStr = window.location.search.substring(1);

    // if queryStr includes '#' it will break params, so we need to remove it and retry
    const hashIndex = window.location.hash?.indexOf('#') ?? -1;

    if (hashIndex !== -1) {
      queryStr = window.location.hash.split('#')[1]; // Get the part after the hash
      queryStr = queryStr.split('?')[1]; // Remove any query string after the hash
    }

    // URI Encode all %22 to ensure url is not broken
    const params = queryStr
      .split('%22')
      .map((item, index) => {
        if (index % 2 === 0) {
          return item;
        }

        return encodeURIComponent(item);

      })
      .join('')
      .split('&');

    return params;
  }

  static getKeyValuePairs(): Record<string, string> {
    const params = this.getParams();
    const keyValuePairs: Record<string, string> = {};

    params.forEach((param) => {
      const [key, val] = param.split('=');

      if (key && val) {
        keyValuePairs[key] = decodeURIComponent(val.replace(/\+/gu, ' '));
      }
    });

    return keyValuePairs;
  }

  static parseGetVariables(settingsManager: SettingsManager): boolean {
    let isUsingParsedVariables = false;
    const kv = this.getKeyValuePairs();

    if (Object.keys(kv).length === 0) {
      return false;
    }

    // Then Do Other Stuff
    Object.keys(kv).forEach((key) => {

      // Handle things that happen before loading (remember other components might not be ready yet)
      switch (key) {
        case 'date':
          this.handleDateParam_(kv[key]);
          break;
        case 'rate':
          this.handleRateParam_(kv[key]);
          break;
        case 'plugins':
          {
            const plugins = kv[key].split(',');

            // Disable all plugins first
            settingsManager.plugins = {};

            plugins.forEach((plugin) => {
              settingsManager.plugins[plugin] = { enabled: true };
            });
            isUsingParsedVariables = true;
          }
          break;
        case 'bottomMenu':
          settingsManager.isDisableBottomMenu = kv[key].toLowerCase() === 'false';
          isUsingParsedVariables = true;
          break;
        case 'canvas':
          settingsManager.isDisableCanvas = kv[key].toLowerCase() === 'false';
          break;
        case 'planets':
          settingsManager.isDisablePlanets = kv[key].toLowerCase() === 'false';
          isUsingParsedVariables = true;
          break;
        case 'vimpel':
          settingsManager.isEnableJscCatalog = kv[key].toLowerCase() === 'true';
          break;
        case 'external-only':
          settingsManager.dataSources.externalTLEsOnly = true;
          break;
        case 'gp':
          settingsManager.dataSources.tle = decodeURIComponent(kv[key]);
          break;
        case 'tle':
          // Decode from UTF-8
          settingsManager.dataSources.externalTLEs = decodeURIComponent(kv[key]);
          settingsManager.dataSources.isSupplementExternal = true;
          settingsManager.isMissionDataEnabled = false;
          break;
        case 'limitSats':
          settingsManager.limitSats = kv[key];
          break;
        case 'earth':
          this.handleEarthParam_(kv[key]);
          isUsingParsedVariables = true;
          break;
        case 'sun':
          this.handleSunParam_(kv[key]);
          isUsingParsedVariables = true;
          break;
        case 'sensors':
          settingsManager.isDisableSensors = kv[key].toLowerCase() === 'false';
          isUsingParsedVariables = true;
          break;
        case 'launchSites':
          settingsManager.isDisableLaunchSites = kv[key].toLowerCase() === 'false';
          isUsingParsedVariables = true;
          break;
        case 'dots':
          isUsingParsedVariables = this.handleDotsParam_(kv[key]) || isUsingParsedVariables;
          break;
        case 'ecf':
          {
            const ecfValue = parseInt(kv[key], 10);

            if (!isNaN(ecfValue) && ecfValue >= 0 && ecfValue <= 10) {
              settingsManager.isOrbitCruncherInEcf = !!ecfValue;
              settingsManager.numberOfEcfOrbitsToDraw = ecfValue;

              EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
                ServiceLocator.getOrbitManager().orbitThreadMgr.postMessage({
                  type: OrbitCruncherMsgType.SETTINGS_UPDATE,
                  numberOfOrbitsToDraw: settingsManager.numberOfEcfOrbitsToDraw,
                });
              });
            }
          }
          break;
        case 'color':
          UrlManager.assignColorScheme_(kv, settingsManager);
          break;
        case 'msbai':
          settingsManager.plugins.OrbitGuardMenuPlugin = { ...settingsManager.plugins.OrbitGuardMenuPlugin, ...{ enabled: true } };
          settingsManager.plugins.SatInfoBoxManeuver = { ...settingsManager.plugins.SatInfoBoxManeuver, ...{ enabled: true } };
          break;
        default:
          // Do nothing for other keys, they will be handled in the EventBus.getInstance().onKeepTrackReady event
          break;
      }

      EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
        switch (key) {
          case 'search':
            if (!settingsManager.disableUI) {
              const uiManagerInstance = ServiceLocator.getUiManager();

              uiManagerInstance.doSearch(kv.search);
              if (settingsManager.lastSearchResults.length === 0) {
                uiManagerInstance.toast(`Search for "${kv.search}" found nothing!`, ToastMsgType.caution, true);
                uiManagerInstance.searchManager.hideResults();
              }
            }
            break;
          case 'intldes':
            this.handleIntldesParam_(kv[key]);
            break;
          case 'sat':
            this.handleSatParam_(kv[key]);
            break;
          case 'misl':
            this.handleMislParam_(kv[key]);
            break;
          case 'pitch':
          case 'yaw':
            this.handlePitchYawParam_(kv);
            break;
          case 'lat':
          case 'lon':
            this.handleLatLonParam_(kv.lat, kv.lon, kv.zoom, kv.date ?? null);
            break;
          case 'rate':
            this.handleRateParam_(kv[key]);
            break;
          case 'zoom':
            this.handleZoomParam_(kv[key], kv.camDistBuffer ?? null);
            break;
          default:
            console.warn(`Unknown URL parameter: ${key}`);
        }
      });
    });

    return isUsingParsedVariables;
  }

  private static assignColorScheme_(kv: Record<string, string>, settingsManager: SettingsManager) {
    const colorParam = kv.color?.toLowerCase();

    if (colorParam && UrlManager.colorSchemeDefinitions_[colorParam]) {
      settingsManager.defaultColorScheme = UrlManager.colorSchemeDefinitions_[colorParam];
    }
  }

  static updateURL(isMaxData: boolean = false): void {
    // Throttling navigation to prevent the browser from hanging.
    if (Date.now() - this.lastUpdateTime_ < 250) {
      return;
    }
    this.lastUpdateTime_ = Date.now();

    const uiManagerInstance = ServiceLocator.getUiManager();
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const mainCamera = ServiceLocator.getMainCamera();

    if (!uiManagerInstance?.searchManager) {
      return;
    }
    if (settingsManager.isDisableUrlBar) {
      return;
    }

    const arr = window.location.href.split('?');
    let url = arr[0];
    const paramSlices = [] as string[];

    // Handle Time First
    if (isMaxData || timeManagerInstance.staticOffset < -1000 || timeManagerInstance.staticOffset > 1000) {
      paramSlices.push(`date=${new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset).toISOString()}`);
    }

    if (this.propRate_ < 0.99 || this.propRate_ > 1.01) {
      paramSlices.push(`rate=${this.propRate_}`);
    }

    if (this.selectedSat_?.sccNum) {
      // TODO: This doesn't work for VIMPEL objects
      const scc = this.selectedSat_.sccNum;

      if (scc !== '') {
        paramSlices.push(`sat=${scc}`);
      }
    }

    if (this.searchString_ !== '') {
      paramSlices.push(`search=${this.searchString_}`);
    }

    if (settingsManager.limitSats) {
      paramSlices.push(`limitSats=${settingsManager.limitSats}`);
    }

    if (settingsManager.isEnableJscCatalog === false) {
      paramSlices.push('vimpel=false');
    }

    if (this.selectedSat_?.sccNum && !(mainCamera.state.ftsPitch > -0.1 && mainCamera.state.ftsPitch < 0.1 && mainCamera.state.ftsYaw > -0.1 && mainCamera.state.ftsYaw < 0.1)) {
      paramSlices.push(`pitch=${(mainCamera.state.ftsPitch * RAD2DEG).toFixed(3)}`);
      paramSlices.push(`yaw=${(mainCamera.state.ftsYaw * RAD2DEG).toFixed(3)}`);
    } else if (mainCamera.state.camPitch > -0.01 && mainCamera.state.camPitch < 0.01 && mainCamera.state.camYaw > -0.01 && mainCamera.state.camYaw < 0.01) {
      // If pitch and yaw are close to zero, we don't need to include them in the URL
    } else {
      paramSlices.push(`pitch=${(mainCamera.state.camPitch * RAD2DEG).toFixed(3)}`);
      paramSlices.push(`yaw=${(mainCamera.state.camYaw * RAD2DEG).toFixed(3)}`);
    }

    paramSlices.push(`zoom=${mainCamera.zoomLevel().toFixed(2)}`);

    if (this.selectedSat_) {
      paramSlices.push(`camDistBuffer=${mainCamera.state.camDistBuffer}`);
    }

    if (ServiceLocator.getColorSchemeManager().currentColorScheme.id !== 'CelestrakColorScheme') {
      const shorthandFromDefinition = Object.keys(UrlManager.colorSchemeDefinitions_).find(
        (key) => UrlManager.colorSchemeDefinitions_[key] === ServiceLocator.getColorSchemeManager().currentColorScheme.id,
      );

      paramSlices.push(`color=${shorthandFromDefinition}`);
    }

    if (settingsManager.isOrbitCruncherInEcf && settingsManager.numberOfEcfOrbitsToDraw !== 1) {
      paramSlices.push(`ecf=${settingsManager.numberOfEcfOrbitsToDraw}`);
    }

    if (settingsManager.isDisableSensors) {
      paramSlices.push('sensors=false');
    }
    if (settingsManager.isDisableLaunchSites) {
      paramSlices.push('launchSites=false');
    }

    if (settingsManager.isDisableBottomMenu) {
      paramSlices.push('bottomMenu=false');
    }

    if (settingsManager.dataSources.externalTLEsOnly) {
      paramSlices.push(`tle="${encodeURIComponent(settingsManager.dataSources.externalTLEs)}"`);
      paramSlices.push('external-only=true');
    } else if (!settingsManager.dataSources.tle.includes('keeptrack.space') && isMaxData) {
      paramSlices.push(`tle="${encodeURIComponent(settingsManager.dataSources.tle)}"`);
    }

    if (paramSlices.length > 0) {
      url += `?${paramSlices.join('&')}`;
    }

    if (url !== window.location.href) {
      setTimeout(() => {
        // Find any # in the URL and replace it with an empty string
        url = url.replace(/#/gu, '');
        window.history.replaceState(null, '', url);
      }, 100);
    }
  }

  private static handleIntldesParam_(val: string) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const urlSatId = catalogManagerInstance.intlDes2id(val.toUpperCase());

    if (urlSatId !== null && catalogManagerInstance.getObject(urlSatId)?.active) {
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(urlSatId);
    } else {
      ServiceLocator.getUiManager().toast(`International Designator "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
    }
  }

  private static handleSatParam_(val: string) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const urlSatId = catalogManagerInstance.sccNum2Id(parseInt(val));

    if (urlSatId !== null) {
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(urlSatId);
    } else {
      ServiceLocator.getUiManager().toast(`Satellite "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
    }
  }

  private static handleMislParam_(val: string) {
    const subVal = val.split(',');

    (<HTMLSelectElement>getEl('ms-type')).value = subVal[0].toString();
    (<HTMLSelectElement>getEl('ms-attacker')).value = subVal[1].toString();
    (<HTMLSelectElement>getEl('ms-target')).value = subVal[2].toString();
    (<HTMLButtonElement>getEl('missile')).click();

    ServiceLocator.getUiManager().toast('Missile launched!', ToastMsgType.normal, false);
  }

  private static handleDateParam_(val: string) {
    // There are two acceptable versions of date param:
    // 1. A unix timestamp in milliseconds (13 digits)
    // 2. An ISO 8601 date string (e.g. 2023-10-05T14:48:00.000Z)
    if (val.includes('-')) {
      const date = new Date(val);

      if (isNaN(date.getTime())) {
        ServiceLocator.getUiManager().toast(`Date value of "${val}" is not a proper ISO 8601 date string!`, ToastMsgType.caution, true);

        return;
      }

      settingsManager.simulationTime = date;
    } else {
      if (val.length !== 13) {
        ServiceLocator.getUiManager().toast(`Date value of "${val}" is not a proper unix timestamp!`, ToastMsgType.caution, true);

        return;
      }
      if (isNaN(parseInt(val))) {
        ServiceLocator.getUiManager().toast(`Date value of "${val}" is not a proper unix timestamp!`, ToastMsgType.caution, true);

        return;
      }

      settingsManager.simulationTime = new Date(parseFloat(val));
    }
  }

  private static handleRateParam_(val: string) {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    let rate = parseFloat(val);

    if (isNaN(rate)) {
      ServiceLocator.getUiManager().toast(`Propagation rate of "${rate}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }
    rate = Math.min(rate, 1000);
    // could run time backwards, but let's not!
    rate = Math.max(rate, 0);

    settingsManager.propRate = rate;
    if (timeManagerInstance) {
      timeManagerInstance.changePropRate(Number(rate));
    }
  }

  private static handleZoomParam_(val: string, camDistBuffer: string) {
    const zoom = parseFloat(val);
    const camDistBufferValue = parseFloat(camDistBuffer);

    if (isNaN(zoom)) {
      ServiceLocator.getUiManager().toast(`Zoom value of "${val}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }

    if (zoom < 0.06 || zoom > 1) {
      ServiceLocator.getUiManager().toast(`Zoom value of "${val}" is out of bounds!`, ToastMsgType.caution, true);

      return;
    }

    ServiceLocator.getMainCamera().state.zoomTarget = zoom;

    if (camDistBufferValue >= settingsManager.nearZoomLevel) {
      // Outside camDistBuffer
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
    }
  }

  private static handlePitchYawParam_(kv: Record<string, string>) {
    const pitchNum = parseFloat(kv.pitch);
    const yawNum = parseFloat(kv.yaw);

    if (isNaN(pitchNum) || isNaN(yawNum)) {
      ServiceLocator.getUiManager().toast('Pitch or Yaw value is not a valid float!', ToastMsgType.caution, true);

      return;
    }
    if (pitchNum < -90 || pitchNum > 90) {
      ServiceLocator.getUiManager().toast('Pitch value is out of bounds!', ToastMsgType.caution, true);

      return;
    }
    if (yawNum < -360 || yawNum > 360) {
      ServiceLocator.getUiManager().toast('Yaw value is out of bounds!', ToastMsgType.caution, true);

      return;
    }
    const mainCameraInstance = ServiceLocator.getMainCamera();

    mainCameraInstance.autoRotate(false);
    mainCameraInstance.camSnap(pitchNum * DEG2RAD as Radians, yawNum * DEG2RAD as Radians);

    if (kv.sat) {
      mainCameraInstance.state.camAngleSnappedOnSat = false;
      mainCameraInstance.state.ftsPitch = pitchNum * DEG2RAD as Radians;
      mainCameraInstance.state.ftsYaw = yawNum * DEG2RAD as Radians;
    }
  }

  private static handleLatLonParam_(lat: string, lon: string, zoom: string, date: string | null) {
    const latNum = parseFloat(lat) as Degrees;
    const lonNum = parseFloat(lon) as Degrees;
    const zoomNum = parseFloat(zoom);


    if (isNaN(zoomNum)) {
      ServiceLocator.getUiManager().toast(`Zoom value of "${zoom}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }

    if (isNaN(latNum) || isNaN(lonNum)) {
      ServiceLocator.getUiManager().toast('Latitude or Longitude value is not a valid float!', ToastMsgType.caution, true);

      return;
    }

    if (latNum < -90 || latNum > 90 || lonNum < -360 || lonNum > 360) {
      ServiceLocator.getUiManager().toast('Latitude or Longitude value is out of bounds!', ToastMsgType.caution, true);

      return;
    }

    ServiceLocator.getMainCamera().autoRotate(false);

    if (date !== null && !isNaN(parseInt(date))) {
      setTimeout(() => {
        ServiceLocator.getMainCamera().lookAtLatLon(latNum, lonNum, zoomNum);
      }, 10500);
    } else {
      ServiceLocator.getMainCamera().lookAtLatLon(latNum, lonNum, zoomNum);
    }
  }

  static handleEarthParam_(val: string) {
    switch (val) {
      case 'satellite':
        settingsManager.earthTextureStyle = EarthTextureStyle.BLUE_MARBLE;
        settingsManager.isDrawCloudsMap = true;
        settingsManager.isDrawBumpMap = true;
        settingsManager.isDrawSpecMap = true;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAurora = true;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;
        settingsManager.isEarthAmbientLighting = true;
        break;
      case 'engineer':
        settingsManager.earthTextureStyle = EarthTextureStyle.BLUE_MARBLE;
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAurora = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.ON;
        settingsManager.isEarthAmbientLighting = false;
        EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
          PluginRegistry.getPlugin(NightToggle)?.setBottomIconToSelected();
        });
        break;
      case 'opscenter':
        settingsManager.earthTextureStyle = EarthTextureStyle.FLAT;
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = true;
        settingsManager.isDrawPoliticalMap = true;
        settingsManager.isDrawAurora = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
          PluginRegistry.getPlugin(NightToggle)?.setBottomIconToSelected();
        });
        break;
      case '90s':
        settingsManager.earthTextureStyle = EarthTextureStyle.FLAT;
        settingsManager.isDrawCloudsMap = false;
        settingsManager.isDrawBumpMap = false;
        settingsManager.isDrawSpecMap = false;
        settingsManager.isEarthGrayScale = false;
        settingsManager.isDrawPoliticalMap = false;
        settingsManager.isDrawAurora = false;
        settingsManager.isDrawAtmosphere = AtmosphereSettings.OFF;
        settingsManager.isEarthAmbientLighting = false;
        EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
          PluginRegistry.getPlugin(NightToggle)?.setBottomIconToSelected();
        });
        break;
      default:
        break;
    }
  }

  private static handleSunParam_(val: string) {
    settingsManager.isDrawSun = true;
    settingsManager.isUseSunTexture = false;
    settingsManager.isDisableGodrays = false;

    switch (val) {
      case 'off':
        settingsManager.isDrawSun = false;
        settingsManager.isUseSunTexture = false;
        settingsManager.isDisableGodrays = true;
        break;
      case 'potato':
        settingsManager.godraysSamples = -1; // GodraySamples.OFF
        settingsManager.isUseSunTexture = true;
        settingsManager.isDisableGodrays = true;
        break;
      case 'low':
        settingsManager.godraysSamples = 16; // GodraySamples.LOW
        break;
      case 'medium':
        settingsManager.godraysSamples = 32; // GodraySamples.MEDIUM
        break;
      case 'high':
        settingsManager.godraysSamples = 64; // GodraySamples.HIGH
        break;
      case 'ultra':
        settingsManager.godraysSamples = 128; // GodraySamples.ULTRA
        break;
      default:
        console.warn(`Unknown sun parameter: ${val}`);
    }
  }

  private static handleDotsParam_(val: string): boolean {
    switch (val) {
      case 'large':
        settingsManager.satShader = {
          minSize: 15.0,
          maxSize: 70.0,
          largeObjectMinZoom: 0.37,
          largeObjectMaxZoom: 0.58,
          minSizePlanetarium: 20.0,
          maxSizePlanetarium: 20.0,
          maxAllowedSize: 35.0,
          isUseDynamicSizing: false,
          dynamicSizeScalar: 1.0,
          starSize: '20.0',
          distanceBeforeGrow: '14000.0',
          blurFactor1: '0.76',
          blurFactor2: '0.4',
          blurFactor3: '0.43',
          blurFactor4: '0.25',
        };

        return true;
      default:
        return false;
    }
  }
}

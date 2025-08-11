import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { InputEventType, keepTrackApi } from '@app/keepTrackApi';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager, settingsManager } from '@app/settings/settings';
import { AtmosphereSettings, EarthTextureStyle } from '@app/singletons/draw-manager/earth';
import { OrbitCruncherType } from '@app/webworker/orbitCruncher';
import { DEG2RAD, Degrees, DetailedSatellite, Kilometers, RAD2DEG, Radians } from 'ootk';
import { getEl } from '../lib/get-el';

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

  static {
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, (sat) => {
      if (sat instanceof DetailedSatellite) {
        this.selectedSat_ = sat;
      } else {
        this.selectedSat_ = null;
      }
      this.updateURL();
    });

    keepTrackApi.on(KeepTrackApiEvents.propRateChanged, (propRate) => {
      this.propRate_ = propRate;
      this.updateURL();
    });

    keepTrackApi.on(KeepTrackApiEvents.searchUpdated, (searchString: string) => {
      this.searchString_ = searchString;
      this.updateURL();
    });

    keepTrackApi.on(KeepTrackApiEvents.updateDateTime, () => {
      this.updateURL();
    });

    keepTrackApi.on(InputEventType.KeyDown, (key) => {
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

              keepTrackApi.on(KeepTrackApiEvents.onKeepTrackReady, () => {
                keepTrackApi.getOrbitManager().orbitWorker.postMessage({
                  typ: OrbitCruncherType.SETTINGS_UPDATE,
                  numberOfOrbitsToDraw: settingsManager.numberOfEcfOrbitsToDraw,
                });
              });
            }
          }
          break;
        case 'color':
          UrlManager.assignColorScheme_(kv, settingsManager);
          break;
        default:
          // Do nothing for other keys, they will be handled in the keepTrackApi.onKeepTrackReady event
          break;
      }

      keepTrackApi.on(KeepTrackApiEvents.onKeepTrackReady, () => {
        switch (key) {
          case 'search':
            if (!settingsManager.disableUI) {
              const uiManagerInstance = keepTrackApi.getUiManager();

              uiManagerInstance.doSearch(kv.search);
              if (settingsManager.lastSearchResults.length === 0) {
                keepTrackApi.toast(`Search for "${kv.search}" found nothing!`, ToastMsgType.caution, true);
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
    const uiManagerInstance = keepTrackApi.getUiManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const mainCamera = keepTrackApi.getMainCamera();

    if (!uiManagerInstance.searchManager) {
      return;
    }
    if (settingsManager.isDisableUrlBar) {
      return;
    }

    const arr = window.location.href.split('?');
    let url = arr[0];
    const paramSlices = [] as string[];

    if (settingsManager.limitSats) {
      paramSlices.push(`limitSats=${settingsManager.limitSats}`);
    }

    if (settingsManager.dataSources.externalTLEsOnly) {
      paramSlices.push(`tle="${encodeURIComponent(settingsManager.dataSources.externalTLEs)}"`);
      paramSlices.push('external-only=true');
    } else if (!settingsManager.dataSources.tle.includes('keeptrack.space') && isMaxData) {
      paramSlices.push(`tle="${encodeURIComponent(settingsManager.dataSources.tle)}"`);
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

    if (this.propRate_ < 0.99 || this.propRate_ > 1.01) {
      paramSlices.push(`rate=${this.propRate_}`);
    }

    if (this.selectedSat_?.sccNum && !(mainCamera.ftsPitch > -0.1 && mainCamera.ftsPitch < 0.1 && mainCamera.ftsYaw > -0.1 && mainCamera.ftsYaw < 0.1)) {
      paramSlices.push(`pitch=${(mainCamera.ftsPitch * RAD2DEG).toFixed(3)}`);
      paramSlices.push(`yaw=${(mainCamera.ftsYaw * RAD2DEG).toFixed(3)}`);
    } else if (mainCamera.camPitch > -0.01 && mainCamera.camPitch < 0.01 && mainCamera.camYaw > -0.01 && mainCamera.camYaw < 0.01) {
      // If pitch and yaw are close to zero, we don't need to include them in the URL
    } else {
      paramSlices.push(`pitch=${(mainCamera.camPitch * RAD2DEG).toFixed(3)}`);
      paramSlices.push(`yaw=${(mainCamera.camYaw * RAD2DEG).toFixed(3)}`);
    }

    paramSlices.push(`zoom=${mainCamera.zoomLevel().toFixed(2)}`);

    if (this.selectedSat_) {
      paramSlices.push(`camDistBuffer=${mainCamera.camDistBuffer}`);
    }

    if (keepTrackApi.getColorSchemeManager().currentColorScheme.id !== 'CelestrakColorScheme') {
      const shorthandFromDefinition = Object.keys(UrlManager.colorSchemeDefinitions_).find(
        (key) => UrlManager.colorSchemeDefinitions_[key] === keepTrackApi.getColorSchemeManager().currentColorScheme.id,
      );

      paramSlices.push(`color=${shorthandFromDefinition}`);
    }

    if (settingsManager.isOrbitCruncherInEcf) {
      paramSlices.push(`ecf=${settingsManager.numberOfEcfOrbitsToDraw}`);
    }

    if (isMaxData || timeManagerInstance.staticOffset < -1000 || timeManagerInstance.staticOffset > 1000) {
      paramSlices.push(`date=${(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset).toString()}`);
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
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const urlSatId = catalogManagerInstance.intlDes2id(val.toUpperCase());

    if (urlSatId !== null && catalogManagerInstance.getObject(urlSatId)?.active) {
      keepTrackApi.getPlugin(SelectSatManager)?.selectSat(urlSatId);
    } else {
      keepTrackApi.toast(`International Designator "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
    }
  }

  private static handleSatParam_(val: string) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const urlSatId = catalogManagerInstance.sccNum2Id(parseInt(val));

    if (urlSatId !== null) {
      keepTrackApi.getPlugin(SelectSatManager)?.selectSat(urlSatId);
    } else {
      keepTrackApi.toast(`Satellite "${val.toUpperCase()}" was not found!`, ToastMsgType.caution, true);
    }
  }

  private static handleMislParam_(val: string) {
    const subVal = val.split(',');

    (<HTMLSelectElement>getEl('ms-type')).value = subVal[0].toString();
    (<HTMLSelectElement>getEl('ms-attacker')).value = subVal[1].toString();
    (<HTMLSelectElement>getEl('ms-target')).value = subVal[2].toString();
    (<HTMLButtonElement>getEl('missile')).click();

    keepTrackApi.toast('Missile launched!', ToastMsgType.normal, false);
  }

  private static handleDateParam_(val: string) {
    if (isNaN(parseInt(val))) {
      keepTrackApi.toast(`Date value of "${val}" is not a proper unix timestamp!`, ToastMsgType.caution, true);

      return;
    }
    settingsManager.staticOffset = Number(val) - Date.now();
  }

  private static handleRateParam_(val: string) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    let rate = parseFloat(val);

    if (isNaN(rate)) {
      keepTrackApi.toast(`Propagation rate of "${rate}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }
    rate = Math.min(rate, 1000);
    // could run time backwards, but let's not!
    rate = Math.max(rate, 0);
    timeManagerInstance.changePropRate(Number(rate));
  }

  private static handleZoomParam_(val: string, camDistBuffer: string) {
    const zoom = parseFloat(val);
    const camDistBufferValue = parseFloat(camDistBuffer);

    if (isNaN(zoom)) {
      keepTrackApi.toast(`Zoom value of "${val}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }

    if (zoom < 0.1 || zoom > 100) {
      keepTrackApi.toast(`Zoom value of "${val}" is out of bounds!`, ToastMsgType.caution, true);

      return;
    }

    keepTrackApi.getMainCamera().camZoomSnappedOnSat = false;
    keepTrackApi.getMainCamera().changeZoom(zoom);
    // if camDistBuffer is not a number, set it to just outside the min zoom distance for close zoom
    keepTrackApi.getMainCamera().camDistBuffer = isNaN(camDistBufferValue)
      ? settingsManager.minZoomDistance + 1 as Kilometers
      : camDistBufferValue as Kilometers;

    if (camDistBufferValue >= settingsManager.nearZoomLevel) {
      // Outside camDistBuffer
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
    }
  }

  private static handlePitchYawParam_(kv: Record<string, string>) {
    const pitchNum = parseFloat(kv.pitch);
    const yawNum = parseFloat(kv.yaw);

    if (isNaN(pitchNum) || isNaN(yawNum)) {
      keepTrackApi.toast('Pitch or Yaw value is not a valid float!', ToastMsgType.caution, true);

      return;
    }
    if (pitchNum < -90 || pitchNum > 90) {
      keepTrackApi.toast('Pitch value is out of bounds!', ToastMsgType.caution, true);

      return;
    }
    if (yawNum < -360 || yawNum > 360) {
      keepTrackApi.toast('Yaw value is out of bounds!', ToastMsgType.caution, true);

      return;
    }
    const mainCameraInstance = keepTrackApi.getMainCamera();

    mainCameraInstance.autoRotate(false);
    mainCameraInstance.camSnap(pitchNum * DEG2RAD as Radians, yawNum * DEG2RAD as Radians);

    if (kv.sat) {
      mainCameraInstance.camAngleSnappedOnSat = false;
      mainCameraInstance.ftsPitch = pitchNum * DEG2RAD as Radians;
      mainCameraInstance.ftsYaw = yawNum * DEG2RAD as Radians;
    }
  }

  private static handleLatLonParam_(lat: string, lon: string, zoom: string, date: string | null) {
    const latNum = parseFloat(lat) as Degrees;
    const lonNum = parseFloat(lon) as Degrees;
    const zoomNum = parseFloat(zoom);


    if (isNaN(zoomNum)) {
      keepTrackApi.toast(`Zoom value of "${zoom}" is not a valid float!`, ToastMsgType.caution, true);

      return;
    }

    if (isNaN(latNum) || isNaN(lonNum)) {
      keepTrackApi.toast('Latitude or Longitude value is not a valid float!', ToastMsgType.caution, true);

      return;
    }

    if (latNum < -90 || latNum > 90 || lonNum < -360 || lonNum > 360) {
      keepTrackApi.toast('Latitude or Longitude value is out of bounds!', ToastMsgType.caution, true);

      return;
    }

    keepTrackApi.getMainCamera().autoRotate(false);

    if (date !== null && !isNaN(parseInt(date))) {
      setTimeout(() => {
        keepTrackApi.getMainCamera().lookAtLatLon(latNum, lonNum, zoomNum);
      }, 10500);
    } else {
      keepTrackApi.getMainCamera().lookAtLatLon(latNum, lonNum, zoomNum);
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
        keepTrackApi.on(KeepTrackApiEvents.onKeepTrackReady, () => {
          keepTrackApi.getPlugin(NightToggle)?.setBottomIconToSelected();
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
        keepTrackApi.on(KeepTrackApiEvents.onKeepTrackReady, () => {
          keepTrackApi.getPlugin(NightToggle)?.setBottomIconToSelected();
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
        keepTrackApi.on(KeepTrackApiEvents.onKeepTrackReady, () => {
          keepTrackApi.getPlugin(NightToggle)?.setBottomIconToSelected();
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

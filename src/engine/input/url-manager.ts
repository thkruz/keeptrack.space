import { DeepSpaceDesignatorEntry, DeepSpaceDesignators } from '@app/app/data/deep-space-designators';
import { focusDeepSpaceSatellite } from '@app/app/ui/deep-space-focus';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { t7e } from '@app/locales/keys';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager, settingsManager } from '@app/settings/settings';
import { DEG2RAD, Degrees, RAD2DEG, Radians, Satellite } from '@ootk/src/main';
import { PluginRegistry } from '../core/plugin-registry';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { KeyboardComponent } from '../plugins/components/keyboard/keyboard-component';
import { AtmosphereSettings, EarthTextureStyle } from '../rendering/draw-manager/earth-quality-enums';
import { errorManagerInstance } from '../utils/errorManager';
import { getEl } from '../utils/get-el';
import { waitForCruncher } from '../utils/waitForCruncher';

export abstract class UrlManager {
  private static selectedSat_: Satellite | null = null;
  private static searchString_: string = '';
  private static propRate_: number;
  private static readonly MAX_URL_LENGTH_ = 2000;
  private static readonly colorSchemeDefinitions_ = {
    type: 'ObjectTypeColorScheme',
    celestrak: 'CelestrakColorScheme',
    country: 'CountryColorScheme',
    rcs: 'RcsColorScheme',
    mission: 'MissionColorScheme',
    confidence: 'ConfidenceColorScheme',
    orbitalplane: 'OrbitalPlaneDensityColorScheme',
    spatial: 'SpatialDensityColorScheme',
    sunlight: 'SunlightColorScheme',
    gpage: 'GpAgeColorScheme',
    source: 'SourceColorScheme',
    velocity: 'VelocityColorScheme',
    starlink: 'StarlinkColorScheme',
    smallsat: 'SmallSatColorScheme',
  };
  static lastUpdateTime_: number;

  static {
    EventBus.getInstance().on(EventBusEvent.selectSatData, (sat) => {
      if (sat instanceof Satellite) {
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

    new KeyboardComponent('UrlManager', [
      {
        key: 'U',
        // Force-write the full state to the URL bar even when live updates are disabled.
        callback: () => this.updateURL(true, true),
      },
    ]).init();
  }

  static getParams(): string[] {
    let queryStr = window.location.search.substring(1);

    // if queryStr includes '#' it will break params, so we need to remove it and retry
    const hashIndex = window.location.hash?.indexOf('#') ?? -1;

    if (hashIndex !== -1) {
      queryStr = window.location.hash.split('#')[1]; // Get the part after the hash
      queryStr = queryStr.split('?')[1]; // Remove any query string after the hash
    }

    // Normalize "smart"/curly quotes (U+2018/U+2019/U+201C/U+201D) to a straight
    // double quote. Browsers and rich-text editors often substitute these when a
    // user pastes a quoted URL, and a mismatched pair (e.g. a curly opening quote
    // with a straight closing quote) breaks the quote-aware encoding below.
    queryStr = queryStr.replace(/%E2%80%9[89CD]/giu, '%22');

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
      // Split on the FIRST '=' only — values can legitimately contain '=' (e.g. an
      // external URL with its own query string), so param.split('=')[1] would drop
      // everything after the second '='.
      const eqIndex = param.indexOf('=');

      if (eqIndex === -1) {
        return;
      }

      const key = param.slice(0, eqIndex);
      const val = param.slice(eqIndex + 1);

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
        case 'regime':
          this.handleRegimeParam_(kv[key]);
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
                ServiceLocator.getOrbitManager().orbitThreadMgr.sendSettingsUpdate(settingsManager.numberOfEcfOrbitsToDraw);
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
            this.handleSearchParam_(kv.search);
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
          case 'date':
          case 'camDistBuffer':
          case 'vimpel':
          case 'sensors':
          case 'launchSites':
          case 'tle':
          case 'external-only':
          case 'bottomMenu':
          case 'earth':
          case 'debugFailTexture':
          case 'debugFailStatus':
          case 'debugFailCount':
            // Consumed by other parameter handlers (lat/lon uses date, zoom uses camDistBuffer);
            // debugFail* are read in texture-load-registry for dev-only texture failure injection
            break;
          default:
            errorManagerInstance.info(`Unknown URL parameter: ${key}`);
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

  /**
   * Builds a shareable URL that captures the current application state.
   *
   * This is a pure builder: it reads live state but performs no navigation and
   * ignores the live-update / disable settings (those are the writer's concern).
   * Heavy params are progressively dropped to keep the URL under MAX_URL_LENGTH_.
   * @param isMaxData When true, include extended/heavy params (date, external TLEs, etc.).
   * @returns The full shareable URL string.
   */
  // eslint-disable-next-line complexity
  static getShareUrl(isMaxData: boolean = true): string {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const mainCamera = ServiceLocator.getMainCamera();

    const arr = window.location.href.split('?');
    let url = arr[0];
    const paramSlices = [] as string[];

    // Handle Time First
    if (isMaxData || timeManagerInstance.staticOffset < -1000 || timeManagerInstance.staticOffset > 1000) {
      const epochMs = timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset;

      if (Number.isFinite(epochMs)) {
        paramSlices.push(`date=${new Date(epochMs).toISOString()}`);
      }
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
    } else {
      // Deep-space probes (Voyager 1, etc.) are focused via centerBody rather than
      // selection; emit their NORAD ID so the shared URL reproduces the view.
      const deepSpaceScc = DeepSpaceDesignators.sccNumForBody(settingsManager.centerBody);

      if (deepSpaceScc) {
        paramSlices.push(`sat=${deepSpaceScc}`);
      }
    }

    if (this.searchString_ !== '') {
      paramSlices.push(`search=${this.searchString_}`);
    }

    if (settingsManager.limitSats) {
      paramSlices.push(`limitSats=${settingsManager.limitSats}`);
    }

    if (settingsManager.core.regimeFilter.length > 0) {
      paramSlices.push(`regime=${settingsManager.core.regimeFilter.join(',')}`);
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

    if (settingsManager.dataSources.externalTLEsOnly) {
      paramSlices.push(`tle=${encodeURIComponent(settingsManager.dataSources.externalTLEs)}`);
      paramSlices.push('external-only=true');
    } else if (!settingsManager.dataSources.tle.includes('keeptrack.space') && isMaxData) {
      paramSlices.push(`tle=${encodeURIComponent(settingsManager.dataSources.tle)}`);
    }

    if (settingsManager.isShowExtendedUrlParams) {
      if (settingsManager.isEnableJscCatalog === false) {
        paramSlices.push('vimpel=false');
      }

      if (this.selectedSat_) {
        paramSlices.push(`camDistBuffer=${mainCamera.state.camDistBuffer}`);
      }

      if (ServiceLocator.getColorSchemeManager().currentColorScheme.id !== 'CelestrakColorScheme') {
        const shorthandFromDefinition = Object.keys(UrlManager.colorSchemeDefinitions_).find(
          (key) => UrlManager.colorSchemeDefinitions_[key] === ServiceLocator.getColorSchemeManager().currentColorScheme.id
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
    }

    if (paramSlices.length > 0) {
      url += `?${paramSlices.join('&')}`;
    }

    // Drop heavy params progressively to stay under the URL length limit and avoid 431 errors
    if (url.length > UrlManager.MAX_URL_LENGTH_) {
      const heavyKeys = ['tle', 'external-only', 'search', 'limitSats'];

      for (const dropKey of heavyKeys) {
        const idx = paramSlices.findIndex((s) => s.startsWith(`${dropKey}=`) || s.startsWith(`${dropKey}%`));

        if (idx !== -1) {
          paramSlices.splice(idx, 1);
          url = paramSlices.length > 0 ? `${arr[0]}?${paramSlices.join('&')}` : arr[0];
          if (url.length <= UrlManager.MAX_URL_LENGTH_) {
            break;
          }
        }
      }
    }

    return url;
  }

  /**
   * Writes the current application state to the browser URL bar.
   *
   * Live updates are opt-in (see {@link SettingsManager.isUpdateUrlBarLive}) so the
   * URL bar is not continuously rewritten on every state change. Pass `isForce` to
   * write regardless of that setting (e.g. the 'U' shortcut or the Share menu).
   * @param isMaxData When true, include extended/heavy params in the URL.
   * @param isForce When true, bypass the live-update opt-in gate.
   */
  static updateURL(isMaxData: boolean = false, isForce: boolean = false): void {
    // Live URL-bar updates are off by default — only write when forced or explicitly enabled.
    if (!isForce && !settingsManager.isUpdateUrlBarLive) {
      return;
    }

    // Throttling navigation to prevent the browser from hanging.
    if (Date.now() - this.lastUpdateTime_ < 250) {
      return;
    }
    this.lastUpdateTime_ = Date.now();

    const uiManagerInstance = ServiceLocator.getUiManager();

    if (!uiManagerInstance?.searchManager) {
      return;
    }
    if (settingsManager.isDisableUrlBar) {
      return;
    }

    let url = this.getShareUrl(isMaxData);

    // If still too long after dropping heavy params, skip the update entirely
    if (url.length > UrlManager.MAX_URL_LENGTH_) {
      return;
    }

    if (url !== window.location.href) {
      setTimeout(() => {
        // Find any # in the URL and replace it with an empty string
        url = url.replace(/#/gu, '');
        window.history.replaceState(null, '', url);
      }, 100);
    }
  }

  /**
   * Runs the URL-driven search, but only once the position cruncher has delivered
   * a synced snapshot.
   *
   * Firing the search synchronously on `onKeepTrackReady` loses a race: the dots
   * position/color pipeline is not warm yet, so `doSearch` fills the search box and
   * builds the result group, but the group-color highlight silently no-ops against a
   * cruncher that has not sent its first frame. The user sees a filled search box with
   * nothing selected, and only a manual retype (which re-runs the search after the
   * pipeline is live) fixes it. Waiting for the cruncher makes the on-load search
   * behave like a manual one. Mirrors ColorSchemeManager.calcColorBufsNextCruncher().
   */
  private static handleSearchParam_(searchString: string) {
    if (settingsManager.disableUI) {
      return;
    }

    const runSearch = () => {
      const uiManagerInstance = ServiceLocator.getUiManager();

      uiManagerInstance.doSearch(searchString);
      if (settingsManager.lastSearchResults.length === 0) {
        uiManagerInstance.toast(`Search for "${searchString}" found nothing!`, ToastMsgType.caution, true);
        uiManagerInstance.searchManager.hideResults();
      }
    };

    const satCruncher = ServiceLocator.getCatalogManager()?.satCruncherThread?.worker;

    // No cruncher (e.g. disabled catalog, test env) — nothing to sync with, so run now.
    if (!satCruncher) {
      runSearch();

      return;
    }

    waitForCruncher({
      cruncher: satCruncher,
      cb: runSearch,
      // Every propagation message carries satPos; skip a couple so the main-thread
      // position/color buffers are in sync before the group highlight is applied.
      validationFunc: (m) => Boolean(m.satPos),
      skipNumber: 2,
      isRunCbOnFailure: true,
      maxRetries: 5,
    });
  }

  private static handleIntldesParam_(val: string) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const urlSatId = catalogManagerInstance.intlDes2id(val.toUpperCase());

    if (urlSatId !== null && catalogManagerInstance.getObject(urlSatId)?.active) {
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(urlSatId);

      return;
    }

    if (this.tryDeepSpaceDesignator_(DeepSpaceDesignators.lookupIntlDes(val))) {
      return;
    }

    ServiceLocator.getUiManager().toast(t7e('urlManager.intldesNotFound').replace('{val}', val.toUpperCase()), ToastMsgType.caution, true);
  }

  private static handleSatParam_(val: string) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    // Pass the raw string — sccNum2Id handles numeric, alpha-5, and extended
    // forms. parseInt would turn alpha-5 ("T0001") into NaN.
    const urlSatId = catalogManagerInstance.sccNum2Id(val);

    if (urlSatId !== null) {
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(urlSatId);

      return;
    }

    if (this.tryDeepSpaceDesignator_(DeepSpaceDesignators.lookupSccNum(val))) {
      return;
    }

    ServiceLocator.getUiManager().toast(t7e('urlManager.satNotFound').replace('{val}', val.toUpperCase()), ToastMsgType.caution, true);
  }

  /**
   * Deep-space objects (Voyager 1, OEM missions) have no TLE, so external links
   * like ?sat=10321 miss the catalog. When the designator registry knows the
   * object, resolve it here instead of toasting "not found".
   * @returns true when the designator was recognized (even if the object's
   * ephemeris turns out to be unavailable, in which case a specific toast names it).
   */
  private static tryDeepSpaceDesignator_(entry: DeepSpaceDesignatorEntry | null): boolean {
    if (!entry) {
      return false;
    }

    if (entry.kind === 'probe' && entry.bodyName) {
      this.focusProbeWhenReady_(entry);

      return true;
    }

    if (entry.kind === 'deferred' && entry.focus) {
      entry.focus().then((isFocused) => {
        if (!isFocused) {
          this.toastDeepSpaceUnavailable_(entry);
        }
      });

      return true;
    }

    // kind 'knownObject' (recognized, but no ephemeris available yet)
    this.toastDeepSpaceUnavailable_(entry);

    return true;
  }

  private static readonly DEEP_SPACE_RETRY_INTERVAL_MS_ = 500;
  /** ~15 s at 500 ms per attempt, enough for a slow ephemeris fetch. */
  private static readonly DEEP_SPACE_MAX_RETRIES_ = 30;

  /**
   * Chebyshev ephemeris loads asynchronously in Scene.loadScene(), which is not
   * awaited before onKeepTrackReady fires. Poll until the probe reports ready;
   * a probe deleted from the scene (failed fetch) or a timeout degrades to the
   * "ephemeris unavailable" toast.
   */
  private static focusProbeWhenReady_(entry: DeepSpaceDesignatorEntry, attempt = 0): void {
    const bodyName = entry.bodyName ?? '';
    const probe = ServiceLocator.getScene()?.deepSpaceSatellites?.[bodyName];

    if (probe?.isEphemerisReady) {
      focusDeepSpaceSatellite(bodyName);

      return;
    }

    if (!probe || attempt >= UrlManager.DEEP_SPACE_MAX_RETRIES_) {
      this.toastDeepSpaceUnavailable_(entry);

      return;
    }

    setTimeout(() => this.focusProbeWhenReady_(entry, attempt + 1), UrlManager.DEEP_SPACE_RETRY_INTERVAL_MS_);
  }

  private static toastDeepSpaceUnavailable_(entry: DeepSpaceDesignatorEntry): void {
    ServiceLocator.getUiManager().toast(t7e('urlManager.deepSpaceNoEphemeris').replace('{name}', entry.displayName), ToastMsgType.caution, true);
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
        errorManagerInstance.warn(`Date value of "${val}" is not a proper ISO 8601 date string!`);

        return;
      }

      settingsManager.simulationTime = date;
    } else {
      if (val.length !== 13) {
        errorManagerInstance.warn(`Date value of "${val}" is not a proper unix timestamp!`);

        return;
      }
      if (isNaN(parseInt(val))) {
        errorManagerInstance.warn(`Date value of "${val}" is not a proper unix timestamp!`);

        return;
      }

      settingsManager.simulationTime = new Date(parseFloat(val));
    }
  }

  private static handleRateParam_(val: string) {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    let rate = parseFloat(val);

    if (isNaN(rate)) {
      errorManagerInstance.warn(`Propagation rate of "${rate}" is not a valid float!`);

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
    mainCameraInstance.camSnap((pitchNum * DEG2RAD) as Radians, (yawNum * DEG2RAD) as Radians);

    if (kv.sat) {
      mainCameraInstance.state.camAngleSnappedOnSat = false;
      mainCameraInstance.state.ftsPitch = (pitchNum * DEG2RAD) as Radians;
      mainCameraInstance.state.ftsYaw = (yawNum * DEG2RAD) as Radians;
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
        errorManagerInstance.warn(`Unknown sun parameter: ${val}`);
    }
  }

  private static readonly VALID_REGIMES_ = ['vleo', 'leo', 'meo', 'geo', 'heo', 'xgeo'];

  private static handleRegimeParam_(val: string): void {
    const regimes = val
      .toLowerCase()
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    const valid: string[] = [];

    for (const r of regimes) {
      if (UrlManager.VALID_REGIMES_.includes(r)) {
        valid.push(r);
      } else {
        errorManagerInstance.warn(`Unknown regime filter: ${r}`);
      }
    }

    settingsManager.core.regimeFilter = valid;
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
          starMinSize: 8.0,
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

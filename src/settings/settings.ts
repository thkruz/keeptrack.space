/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { MobileManager } from '@app/app/ui/mobileManager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { ColorSchemeColorMap } from '@app/engine/rendering/color-schemes/color-scheme';
import { ObjectTypeColorSchemeColorMap } from '@app/engine/rendering/color-schemes/object-type-color-scheme';
import { EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { pluginManifest } from '@app/plugins/plugin-manifest';
import { errorManagerInstance, LogLevel } from '../engine/utils/errorManager';
import { isThisNode } from '../engine/utils/isThisNode';
import { PersistenceManager, StorageKey } from '../engine/utils/persistence-manager';
import { CameraSettings, defaultCameraSettings } from './camera-settings';
import { ColorSettings, defaultColorSettings } from './color-settings';
import { CoreSettings, defaultCoreSettings } from './core-settings';
import { DataSettings, defaultDataSettings } from './data-settings';
import { defaultColorSettings as importedDefaultColorSettings } from './default-color-settings';
import { defaultGraphicsSettings, GraphicsSettings } from './graphics-settings';
import { defaultOrbitalSettings, OrbitalSettings } from './orbital-settings';
import { parseGetVariables } from './parse-get-variables';
import { defaultPerformanceSettings, PerformanceSettings } from './performance-settings';
import { applyPersistedSetting, PERSISTED_SETTINGS_TABLE } from './persisted-settings-table';
import { darkClouds } from './presets/darkClouds';
import { SettingsPresets } from './presets/presets';
import { defaultUiSettings, SatLabelMode, UiSettings } from './ui-settings';

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
/* eslint-disable max-lines */

/**
 * Mapping of property names to their category
 */
const PROPERTY_CATEGORY_MAP: Record<string, keyof SettingsManager> = {
  // Graphics
  earthDayTextureQuality: 'graphics',
  earthNightTextureQuality: 'graphics',
  earthSpecTextureQuality: 'graphics',
  earthBumpTextureQuality: 'graphics',
  earthCloudTextureQuality: 'graphics',
  earthPoliticalTextureQuality: 'graphics',
  sunTextureQuality: 'graphics',
  earthTextureStyle: 'graphics',
  isEarthGrayScale: 'graphics',
  isEarthAmbientLighting: 'graphics',
  isDrawPoliticalMap: 'graphics',
  isDrawCloudsMap: 'graphics',
  isBlackEarth: 'graphics',
  isDrawSpecMap: 'graphics',
  isDrawBumpMap: 'graphics',
  earthNumLatSegs: 'graphics',
  earthNumLonSegs: 'graphics',
  isDrawAtmosphere: 'graphics',
  isDrawAurora: 'graphics',
  isDrawGraticule: 'graphics',
  isDrawFlatMapTerminator: 'graphics',
  isDrawSun: 'graphics',
  sizeOfSun: 'graphics',
  isUseSunTexture: 'graphics',
  isDrawNightAsDay: 'graphics',
  isDisablePerformanceDowngrade: 'graphics',
  isDisableGodrays: 'graphics',
  godraysSamples: 'graphics',
  godraysDecay: 'graphics',
  godraysExposure: 'graphics',
  godraysDensity: 'graphics',
  godraysWeight: 'graphics',
  godraysIlluminationDecay: 'graphics',
  zFar: 'graphics',
  canvasPixelRatio: 'graphics',
  isDrawMilkyWay: 'graphics',
  milkyWayTextureQuality: 'graphics',
  hiresMilkWay: 'graphics',
  isGraySkybox: 'graphics',
  isDisableSkybox: 'graphics',
  isDisablePlanets: 'graphics',
  isDisableStars: 'graphics',
  isDrawConstellationBoundaries: 'graphics',
  isDrawNasaConstellations: 'graphics',
  smallImages: 'graphics',
  satShader: 'graphics',
  vertShadersSize: 'graphics',
  pickingDotSize: 'graphics',
  meshOverride: 'graphics',
  meshRotation: 'graphics',
  meshListOverride: 'graphics',
  modelsOnSatelliteViewOverride: 'graphics',
  noMeshManager: 'graphics',
  isDisableAsyncReadPixels: 'graphics',
  debugMobilePicking: 'graphics',

  // UI
  activeMenuMode: 'ui',
  disableUI: 'ui',
  isMobileModeEnabled: 'ui',
  isDisableBottomMenu: 'ui',
  isEmbedMode: 'ui',
  isShowSplashScreen: 'ui',
  splashScreenList: 'ui',
  isShowLoadingHints: 'ui',
  isShowPrimaryLogo: 'ui',
  isShowSecondaryLogo: 'ui',
  navBarLogoUrl: 'ui',
  isWatchlistTopMenuNotification: 'ui',
  isUseJdayOnTopMenu: 'ui',
  isJdayToggleable: 'ui',
  mapWidth: 'ui',
  mapHeight: 'ui',
  lastMapUpdateTime: 'ui',
  isLoadLastMap: 'ui',
  isLoadLastSensor: 'ui',
  hiResWidth: 'ui',
  hiResHeight: 'ui',
  screenshotMode: 'ui',
  lastBoxUpdateTime: 'ui',
  queuedScreenshot: 'ui',
  isPreventDefaultHtml: 'ui',
  isDisableCss: 'ui',
  enableLimitedUI: 'ui',
  enableHoverOrbits: 'ui',
  enableHoverOverlay: 'ui',
  isGroupOverlayDisabled: 'ui',
  updateHoverDelayLimitBig: 'ui',
  updateHoverDelayLimitSmall: 'ui',
  isShowNextPass: 'ui',
  isEciOnHover: 'ui',
  isSatLabelModeOn: 'ui',
  satLabelMode: 'ui',
  desktopMaxLabels: 'ui',
  mobileMaxLabels: 'ui',
  minTimeBetweenSatLabels: 'ui',
  desktopMinimumWidth: 'ui',
  isAutoResizeCanvas: 'ui',
  isResizing: 'ui',
  isPreventColorboxClose: 'ui',
  isUseHigherFOVonMobile: 'ui',
  isOrbitOverlayVisible: 'ui',
  isShowSatNameNotOrbit: 'ui',
  showOrbitThroughEarth: 'ui',
  isShowAds: 'ui',
  retro: 'ui',
  startWithFocus: 'ui',
  isShowConfidenceLevels: 'ui',
  copyrightOveride: 'ui',
  isDisableAsciiCatalog: 'ui',
  isDisableUrlBar: 'ui',
  isUpdateUrlBarLive: 'ui',
  isAlwaysHidePropRate: 'ui',
  isDisableTimeMachineToasts: 'ui',
  isDisableToasts: 'ui',
  isDisableSearchBox: 'ui',
  containerRoot: 'ui',

  // Camera
  fieldOfView: 'camera',
  fieldOfViewMax: 'camera',
  fieldOfViewMin: 'camera',
  fieldOfViewSatellite: 'camera',
  fieldOfViewLerpSpeed: 'camera',
  cameraDecayFactor: 'camera',
  cameraMovementSpeed: 'camera',
  cameraMovementSpeedMin: 'camera',
  autoPanSpeed: 'camera',
  autoRotateSpeed: 'camera',
  isAutoRotateL: 'camera',
  isAutoRotateR: 'camera',
  isAutoRotateU: 'camera',
  isAutoRotateD: 'camera',
  isAutoPanL: 'camera',
  isAutoPanR: 'camera',
  isAutoPanU: 'camera',
  isAutoPanD: 'camera',
  zoomSpeed: 'camera',
  maxZoomDistance: 'camera',
  minZoomDistance: 'camera',
  nearZoomLevel: 'camera',
  minDistanceFromSatellite: 'camera',
  isZoomStopsRotation: 'camera',
  isZoomStopsSnappedOnSat: 'camera',
  isAutoZoomIn: 'camera',
  isAutoZoomOut: 'camera',
  autoZoomSpeed: 'camera',
  initZoomLevel: 'camera',
  disableCameraControls: 'camera',
  isDragging: 'camera',
  isFocusOnSatelliteWhenSelected: 'camera',
  isSmoothCameraTransitions: 'camera',
  cameraTransitionDuration: 'camera',
  offsetCameraModeX: 'camera',
  offsetCameraModeZ: 'camera',
  fpsForwardSpeed: 'camera',
  fpsPitchRate: 'camera',
  fpsRotateRate: 'camera',
  fpsSideSpeed: 'camera',
  fpsVertSpeed: 'camera',
  fpsYawRate: 'camera',
  touchCameraDecayFactor: 'camera',
  touchCameraMovementSpeed: 'camera',
  touchPinchSensitivity: 'camera',
  touchMinSatDistance: 'camera',
  momentumDamping: 'camera',
  touchMomentumDamping: 'camera',
  isLocalRotateEnabled: 'camera',
  drawCameraWidget: 'camera',
  isCompensateForEarthRotation: 'camera',

  // Orbital
  propagatorBackend: 'orbital',
  isDrawOrbits: 'orbital',
  isDrawTrailingOrbits: 'orbital',
  enableConstantSelectedSatRedraw: 'orbital',
  startWithOrbitsDisplayed: 'orbital',
  orbitSegments: 'orbital',
  oemOrbitSegments: 'orbital',
  maxOrbitsDisplayed: 'orbital',
  orbitGroupAlpha: 'orbital',
  orbitFadeFactor: 'orbital',
  isOrbitCruncherInEcf: 'orbital',
  numberOfEcfOrbitsToDraw: 'orbital',
  covarianceConfidenceLevel: 'orbital',
  isDrawCovarianceEllipsoid: 'orbital',
  isDrawInCoverageLines: 'orbital',
  coneDistanceFromEarth: 'orbital',
  lineScanMinEl: 'orbital',
  lineScanSpeedRadar: 'orbital',
  lineScanSpeedSat: 'orbital',
  fitTleSteps: 'orbital',

  // Data
  dataSources: 'data',
  telemetryServer: 'data',
  userServer: 'data',
  db: 'data',
  isDisableExtraCatalog: 'data',
  isUseDebrisCatalog: 'data',
  isEnableExtendedCatalog: 'data',
  isEnableJscCatalog: 'data',
  isDisableControlSites: 'data',
  isDisableLaunchSites: 'data',
  isDisableSensors: 'data',
  apiKey: 'data',
  apiServer: 'data',

  // Performance
  lowPerf: 'performance',
  isDrawLess: 'performance',
  maxAnalystSats: 'performance',
  maxFieldOfViewMarkers: 'performance',
  maxMissiles: 'performance',
  maxLabels: 'performance',
  maxOemSatellites: 'performance',
  maxNotionalDebris: 'performance',
  minimumDrawDt: 'performance',
  fpsThrottle1: 'performance',
  fpsThrottle2: 'performance',
  dotsOnScreen: 'performance',
  dotsPerColor: 'performance',
  isDisableCanvas: 'performance',
  cruncherReady: 'performance',
  positionCruncher: 'performance',
  orbitCruncher: 'performance',

  // Color
  colors: 'color',
  defaultColorScheme: 'color',
  colorSchemeInstances: 'color',
  currentLayer: 'color',
  hoverColor: 'color',
  selectedColor: 'color',
  selectedColorFallback: 'color',
  orbitGroupColor: 'color',
  orbitHoverColor: 'color',
  orbitInViewColor: 'color',
  orbitPlanetariumColor: 'color',
  orbitSelectColor: 'color',
  orbitSelectColor2: 'color',

  // Core
  classificationStr: 'core',
  plugins: 'core',
  filter: 'core',
  installDirectory: 'core',
  offlineMode: 'core',
  offlineIconBehavior: 'core',
  noCatalogOnLoad: 'core',
  isInIframe: 'core',
  isGlobalErrorTrapOn: 'core',
  isEnableConsole: 'core',
  simulationTime: 'core',
  propRate: 'core',
  changeTimeWithKeyboardAmountBig: 'core',
  changeTimeWithKeyboardAmountSmall: 'core',
  timeMachineDelay: 'core',
  timeMachineDelayAtPresentDay: 'core',
  loopTimeMachine: 'core',
  timeMachineLongToast: 'core',
  isDemoModeOn: 'core',
  demoModeInterval: 'core',
  preset: 'core',
  isShowGeoSats: 'core',
  isShowHeoSats: 'core',
  isShowMeoSats: 'core',
  isShowLeoSats: 'core',
  isShowNotionalSats: 'core',
  isShowStarlinkSats: 'core',
  isShowPayloads: 'core',
  isShowRocketBodies: 'core',
  isShowDebris: 'core',
  isStarlinkOnly: 'core',
  isNotionalDebris: 'core',
  isDebrisOnly: 'core',
  catalogReferenceTime: 'core',
  lastSearch: 'core',
  lastSearchResults: 'core',
  minimumSearchCharacters: 'core',
  searchLimit: 'core',
  isShowDecayedInSearch: 'core',
  isShowVimpelInSearch: 'core',
  searchableFields: 'core',
  searchableTypes: 'core',
  limitSats: 'core',
  isDisableSelectSat: 'core',
  daysUntilObjectLost: 'core',
  lostSatStr: 'core',
  geolocation: 'core',
  geolocationUsed: 'core',
  gpsElevationMask: 'core',
  nextNPassesCount: 'core',
  centerBody: 'core',
  altMsgNum: 'core',
  altLoadMsgs: 'core',
  isEPFL: 'core',
  nameOfSpecialSats: 'core',
  lastInteractionTime: 'core',
  lastGamepadMovement: 'core',
  isLimitedGamepadControls: 'core',
  isAllowRightClick: 'core',
  disableDefaultContextMenu: 'core',
  disableNormalEvents: 'core',
  disableWindowScroll: 'core',
  disableWindowTouchMove: 'core',
  disableZoomControls: 'core',
  isDisableKeyboard: 'core',
  isFreezePropRateOnDrag: 'core',
  isBlockPersistence: 'core',
  videoBitsPerSecond: 'core',
  isMissionDataEnabled: 'core',
  pTime: 'core',
  lkVerify: 'core',
  settingsManager: 'core',
  isAutoStart: 'core',
  isDisableLoginGate: 'core',
  isDisableOnboarding: 'core',
  onLoadCb: 'core',
};

/**
 * Interface that declares all flattened properties for TypeScript type checking.
 * The actual values are delegated to category instances via getters/setters.
 */
export interface SettingsManager extends GraphicsSettings, UiSettings, CameraSettings, OrbitalSettings, DataSettings, PerformanceSettings, ColorSettings, CoreSettings {}

export class SettingsManager {
  /**
   * Persisted-table keys explicitly forced via URL params, presets, or embed
   * overrides this session. These skip the localStorage restore (and any
   * post-login remote apply) so explicit boot-time overrides always win.
   */
  readonly urlOverriddenSettingKeys = new Set<StorageKey>();

  // Category instances - these hold the actual settings
  core: CoreSettings;
  data: DataSettings;
  performance: PerformanceSettings;
  graphics: GraphicsSettings;
  ui: UiSettings;
  camera: CameraSettings;
  orbital: OrbitalSettings;
  color: ColorSettings;

  constructor() {
    // Initialize category instances with defaults
    this.core = Object.assign(new CoreSettings(), defaultCoreSettings);
    this.data = Object.assign(new DataSettings(), defaultDataSettings);
    this.performance = Object.assign(new PerformanceSettings(), defaultPerformanceSettings);
    this.graphics = Object.assign(new GraphicsSettings(), defaultGraphicsSettings);
    this.ui = Object.assign(new UiSettings(), defaultUiSettings);
    this.camera = Object.assign(new CameraSettings(), defaultCameraSettings);
    this.orbital = Object.assign(new OrbitalSettings(), defaultOrbitalSettings);
    this.color = Object.assign(new ColorSettings(), defaultColorSettings);

    // Create property accessors for backward compatibility
    this.createPropertyAccessors_();

    // Override isSatLabelModeOn to be a computed accessor based on satLabelMode
    Object.defineProperty(this, 'isSatLabelModeOn', {
      get: () => this.ui.satLabelMode !== SatLabelMode.OFF,
      set: (value: boolean) => {
        this.ui.satLabelMode = value ? SatLabelMode.FOV_ONLY : SatLabelMode.OFF;
      },
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Programmatically create getters and setters for all properties
   * This maintains backward compatibility with direct property access
   */
  private createPropertyAccessors_() {
    for (const [propertyName, categoryName] of Object.entries(PROPERTY_CATEGORY_MAP)) {
      Object.defineProperty(this, propertyName, {
        get() {
          return this[categoryName][propertyName];
        },
        set(value) {
          this[categoryName][propertyName] = value;
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  /**
   * True once the app finished booting (onKeepTrackReady). preserveSettings
   * writes are dropped before then: plugin init paths (e.g. GraphicsMenu's
   * syncOnLoad -> updateGodrays_) call preserveSettings while replaying
   * *loaded* state, and persisting that boot replay would stamp default values
   * as fresh user intent (clobbering stored/cloud data under LWW).
   */
  private static isPersistenceArmed_ = false;

  static armPersistence() {
    SettingsManager.isPersistenceArmed_ = true;
  }

  /**
   * Persist the settings-menu-owned subset to local storage (always, for every
   * user; a logged-in account layers cloud sync on top of this base layer).
   * PersistenceManager's equality short-circuit makes redundant writes free.
   *
   * Keys explicitly forced via URL params this session are skipped so a forced
   * value never overwrites the user's stored choice.
   */
  static preserveSettings() {
    if (SettingsManager.isPersistenceArmed_) {
      const persistence = PersistenceManager.getInstance();

      for (const entry of PERSISTED_SETTINGS_TABLE) {
        if (settingsManager.urlOverriddenSettingKeys.has(entry.key)) {
          continue;
        }

        const value = entry.serialize(settingsManager);

        if (value === null) {
          persistence.removeItem(entry.key);
        } else {
          persistence.saveItem(entry.key, value);
        }
      }
    }

    EventBus.getInstance().emit(EventBusEvent.saveSettings);
  }

  /**
   * Restore the settings-menu-owned subset from local storage. Keys the user
   * explicitly forced via URL params / presets / embed overrides this session
   * are skipped so the documented "URL Params > Local Storage > Default"
   * precedence actually holds.
   *
   * Search settings (searchLimit, decayed/Vimpel toggles, searchable fields)
   * are owned and loaded by SearchSettingsPlugin.
   */
  loadPersistedSettings() {
    const persistence = PersistenceManager.getInstance();

    for (const entry of PERSISTED_SETTINGS_TABLE) {
      if (this.urlOverriddenSettingKeys.has(entry.key)) {
        continue;
      }

      applyPersistedSetting(this, entry.key, persistence.getItem(entry.key));
    }
  }

  init(settingsOverride?: SettingsManagerOverride) {
    /*
     * Export settingsManager to everyone else
     * window.settingsManager = this;
     * Expose these to node if running in node
     */
    if (global) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>global).settingsManager = this;
    }

    this.pTime = [];

    this.checkIfIframe_();
    this.setInstallDirectory_();
    MobileManager.checkMobileMode();

    /*
     * Baseline snapshot of every persisted setting BEFORE embed/URL/preset
     * overrides run. Diffed afterwards to detect which settings were explicitly
     * forced this session (recordUrlOverriddenSettings_), so localStorage never
     * silently beats an explicit boot-time override.
     */
    const preOverrideSnapshot = this.snapshotPersistedSettings_();

    this.setEmbedOverrides_();
    this.setColorSettings_();

    // Lowest-precedence plugin enable/disable layer: the user's Plugin Manager
    // toggles. Loaded before URL params / settingsOverride / strict-list so those
    // deterministically win (e.g. a dev-harness boot overrides stale toggles).
    this.loadPersistedPluginToggles_();

    const params = this.loadOverridesFromUrl_();

    if (settingsOverride) {
      this.loadOverrides_(settingsOverride);
    }

    if (settingsManager.preset) {
      switch (
        settingsManager.preset // NOSONAR
      ) {
        case 'dark-clouds':
          darkClouds(settingsManager);
          break;
        default:
          break;
      }
    } else if (!this.disableUI) {
      parseGetVariables(params, this);
    }
    settingsManager.isBlockPersistence = UrlManager.parseGetVariables(this) || settingsManager.isBlockPersistence;

    // Any persisted setting the overrides changed is treated as explicitly set
    this.recordUrlOverriddenSettings_(preOverrideSnapshot);

    if (!settingsManager.isBlockPersistence) {
      /**
       * Load Order:
       * URL Params > Local Storage > Default
       */
      this.loadPersistedSettings();
    }

    // If No UI Reduce Overhead
    if (this.disableUI) {
      // LEAVE AT LEAST ONE TO PREVENT ERRORS
      this.maxFieldOfViewMarkers = 1;
      this.maxMissiles = 1;
      this.maxAnalystSats = 1;
    }

    // Disable resource intense plugins if lowPerf is enabled
    if (this.lowPerf) {
      if (this.plugins.SensorFov) {
        this.plugins.SensorFov.enabled = false;
      }
      if (this.plugins.SensorSurvFence) {
        this.plugins.SensorSurvFence.enabled = false;
      }
      if (this.plugins.SatelliteFov) {
        this.plugins.SatelliteFov.enabled = false;
      }
      this.maxFieldOfViewMarkers = 1;
    }

    this.loadLastMapTexture_();

    /*
     * Arm persistence only once the app is fully booted: plugin init paths
     * replay loaded state through preserveSettings, and persisting that replay
     * would stamp boot values as fresh user intent.
     */
    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
      SettingsManager.armPersistence();
    });
  }

  private checkIfIframe_() {
    if (window.self !== window.top) {
      this.isInIframe = true;
      this.isShowPrimaryLogo = true;
    }
  }

  /** Serialized view of every persisted-table setting, used to diff override effects. */
  private snapshotPersistedSettings_(): Map<StorageKey, string | null> {
    const snapshot = new Map<StorageKey, string | null>();

    for (const entry of PERSISTED_SETTINGS_TABLE) {
      try {
        snapshot.set(entry.key, entry.serialize(this));
      } catch {
        snapshot.set(entry.key, null);
      }
    }

    return snapshot;
  }

  /** Mark every persisted setting whose value changed during override parsing as explicitly set. */
  private recordUrlOverriddenSettings_(preOverrideSnapshot: Map<StorageKey, string | null>): void {
    for (const entry of PERSISTED_SETTINGS_TABLE) {
      let current: string | null = null;

      try {
        current = entry.serialize(this);
      } catch {
        continue;
      }

      if (preOverrideSnapshot.get(entry.key) !== current) {
        this.urlOverriddenSettingKeys.add(entry.key);
      }
    }
  }

  /**
   * Sets the color settings for the application. If the colors are not found in local storage or the version is outdated,
   * default colors are used and saved to local storage.
   *
   * @private
   */
  private setColorSettings_() {
    this.selectedColorFallback = this.selectedColor;

    this.colors = {} as ColorSchemeColorMap & ObjectTypeColorSchemeColorMap;
    try {
      const jsonString = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_DOT_COLORS);

      if (jsonString) {
        this.colors = JSON.parse(jsonString);
      }
    } catch {
      // eslint-disable-next-line no-console
      console.warn('Settings Manager: Unable to get color settings - localStorage issue!');
    }
    if (!this.colors || Object.keys(this.colors).length === 0 || this.colors.version !== importedDefaultColorSettings.version) {
      this.colors = importedDefaultColorSettings;

      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DOT_COLORS, JSON.stringify(this.colors));
    }
  }

  /**
   * Loads overrides from the URL query string and applies them to the plugin settings.
   * @returns An array of query string parameters.
   */
  private loadOverridesFromUrl_() {
    const params = UrlManager.getParams();

    const plugins = this.plugins;

    for (const param of params) {
      const key = param.split('=')[0];
      const val = param.split('=')[1];

      if (key === 'settingsManagerOverride') {
        const overrides = JSON.parse(decodeURIComponent(val));

        // Back-compat: plugins renamed since their config key was minted are
        // aliased here so existing embed links / saved overrides keep working.
        const pluginKeyAliases: Record<string, string> = { MissilePlugin: 'MissileSimulatorPlugin' };

        Object.keys(overrides.plugins).forEach((rawKey) => {
          const _key = pluginKeyAliases[rawKey] ?? rawKey;

          if (!(_key in plugins) || typeof overrides.plugins[rawKey] === 'undefined') {
            return;
          }
          this.plugins[_key] = overrides.plugins[rawKey];
        });
      }
    }

    return params;
  }

  disableAllPlugins() {
    Object.keys(this.plugins).forEach((key) => {
      this.plugins[key] = false;
    });
  }

  /**
   * Load the previously saved map texture.
   */
  private loadLastMapTexture_() {
    if (this.disableUI) {
      this.isLoadLastMap = false;
    }

    if (this.isLoadLastMap && !this.isDrawLess) {
      const lastMap = PersistenceManager.getInstance().getItem(StorageKey.LAST_MAP);

      if (lastMap) {
        settingsManager.earthTextureStyle = lastMap as EarthTextureStyle;
      }
    }
  }

  /**
   * Sets the embed overrides for the settings.
   * If the current page is an embed.html page, it sets various settings to specific values.
   *
   * FOR TESTING ONLY
   */
  private setEmbedOverrides_() {
    let pageName = location.href.split('/').slice(-1);

    pageName = pageName[0].split('?').slice(0);

    if (pageName[0] === 'embed.html') {
      this.disableUI = true;
      this.startWithOrbitsDisplayed = true;
      this.isAutoResizeCanvas = true;
      this.enableHoverOverlay = true;
      this.enableHoverOrbits = true;
      this.isDrawLess = true;
      this.smallImages = true;
      this.updateHoverDelayLimitSmall = 25;
      this.updateHoverDelayLimitBig = 45;
    }
  }

  exportSettingsToJSON() {
    const settings = {};

    for (const key of Object.keys(this)) {
      settings[key] = this[key];
    }

    // Save the settings to a file
    const settingsBlob = new Blob([JSON.stringify(settings)], { type: 'application/json' });
    const url = URL.createObjectURL(settingsBlob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'settings.json';

    a.click();
  }

  private deepMerge(target: object, source: object): object {
    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        // Recursively merge objects
        target[key] = this.deepMerge({ ...targetValue }, sourceValue);
      } else {
        target[key] = sourceValue;
      }
    }

    return target;
  }

  private loadOverrides_(settingsOverride: SettingsManagerOverride) {
    // combine settingsOverride with window.settingsOverride
    const overrides = { ...settingsOverride, ...window.settingsOverride };

    // Support both flat and nested overrides
    // First, check for category-based overrides (nested)
    const categoryKeys = ['graphics', 'ui', 'camera', 'orbital', 'data', 'performance', 'color', 'core'];

    for (const category of categoryKeys) {
      if (overrides[category]) {
        // Deep merge category overrides
        this[category] = this.deepMerge({ ...this[category] }, overrides[category]);
      }
    }

    // Then apply flat overrides (for backward compatibility)
    for (const key of Object.keys(overrides)) {
      // Skip category keys as they're already handled
      if (categoryKeys.includes(key)) {
        continue;
      }

      const overrideValue = overrides[key];
      const currentValue = this[key];

      if (
        typeof overrideValue === 'object' &&
        overrideValue !== null &&
        !Array.isArray(overrideValue) &&
        typeof currentValue === 'object' &&
        currentValue !== null &&
        !Array.isArray(currentValue)
      ) {
        this[key] = this.deepMerge({ ...currentValue }, overrideValue);
      } else {
        this[key] = overrideValue;
      }
    }

    // Allow overrides to raise the error-manager minimum log level by name (e.g.
    // 'WARN'). E2E runs set this so info/log boot toasts — which render in a
    // full-width band over the side-menu close buttons on localhost — never appear.
    if (typeof overrides.minLogLevel === 'string') {
      const level = LogLevel[overrides.minLogLevel as keyof typeof LogLevel];

      if (typeof level === 'number') {
        errorManagerInstance.setLogLevel(level);
      }
    }

    // Strict plugin allowlist: when the profile opts in, any plugin not explicitly
    // listed in overrides.plugins is forced to enabled:false. Prevents new plugins
    // added to the manifest later from leaking into branded/embed deployments.
    // alwaysEnabled plugins (infrastructure like SelectSatManager) are exempt —
    // their base-plugin init() reads settingsManager.plugins[id].enabled and bails
    // out if false, which would break every plugin that depends on them.
    if (this.isStrictPluginList && overrides.plugins) {
      const allowed = new Set(Object.keys(overrides.plugins));
      const alwaysEnabled = new Set(pluginManifest.filter((d) => d.alwaysEnabled).map((d) => d.configKey));

      for (const key of Object.keys(this.plugins)) {
        if (!allowed.has(key) && !alwaysEnabled.has(key)) {
          this.plugins[key] = { ...this.plugins[key], enabled: false };
        }
      }
    }
  }

  /**
   * Apply the user's persisted per-plugin enable/disable overrides (set from the
   * Plugin Manager UI). Stored as a sparse { configKey: boolean } diff from the
   * manifest defaults. alwaysEnabled infrastructure plugins are never toggled.
   */
  private loadPersistedPluginToggles_() {
    const raw = PersistenceManager.getInstance().getItem(StorageKey.PLUGIN_ENABLE_OVERRIDES);

    if (!raw) {
      return;
    }

    let overrides: Record<string, boolean>;

    try {
      overrides = JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return;
    }

    const alwaysEnabled = new Set(pluginManifest.filter((d) => d.alwaysEnabled).map((d) => d.configKey));
    const plugins = this.plugins as unknown as Record<string, { enabled?: boolean } | undefined>;

    for (const [key, enabled] of Object.entries(overrides)) {
      if (alwaysEnabled.has(key)) {
        continue;
      }
      plugins[key] = { ...plugins[key], enabled };
    }
  }

  private setInstallDirectory_() {
    switch (window.location.host) {
      case 'keeptrack.space':
      case 'www.keeptrack.space':
        this.installDirectory = '/app/';
        break;
      case 'localhost':
      case '127.0.0.1':
        // Is node running? This must be some kind of test
        if (isThisNode()) {
          this.installDirectory = 'http://127.0.0.1:5544/';
        } else {
          /*
           * Comment Out the Next Two Lines if you are testing on a local server
           * and have the keeptrack files installed in a subdirectory
           */
          this.installDirectory = '/';
          // this.offline = true;
        }
        break;
      case '':
        this.offlineMode = true;
        this.isDisableAsciiCatalog = false;
        this.installDirectory = './';
        break;
      case 'poderespacial.fac.mil.co':
        SettingsPresets.loadPresetFacSat2(this);
        break;
      default:
        this.installDirectory = '/';
        break;
    }
    if (typeof this.installDirectory === 'undefined') {
      // Put Your Custom Install Directory Here
      this.installDirectory = '/';
    }
  }

  /**
   * Placeholder for overrides
   */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  timeMachineString(_yearStr: string): string | boolean {
    return false;
  }
}

// Create a type based on the parameters of SettingsManager (ignore methods)
export type SettingsManagerOverride = Partial<
  Omit<
    SettingsManager,
    | 'exportSettingsToJSON'
    | 'loadOverridesFromUrl_'
    | 'loadLastMapTexture_'
    | 'setEmbedOverrides_'
    | 'setMobileSettings_'
    | 'setInstallDirectory_'
    | 'setColorSettings_'
    | 'checkIfIframe_'
    | 'initParseFromGETVariables_'
    | 'loadOverrides_'
    | 'createPropertyAccessors_'
  >
>;

// Export the settings manager instance

export const settingsManager = new SettingsManager();

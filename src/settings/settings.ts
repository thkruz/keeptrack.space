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
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { ColorSchemeColorMap } from '@app/engine/rendering/color-schemes/color-scheme';
import { ObjectTypeColorSchemeColorMap } from '@app/engine/rendering/color-schemes/object-type-color-scheme';
import { AtmosphereSettings, EarthDayTextureQuality, EarthNightTextureQuality, EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { isThisNode } from '../engine/utils/isThisNode';
import { PersistenceManager, StorageKey } from '../engine/utils/persistence-manager';
import { CameraSettings, defaultCameraSettings } from './camera-settings';
import { ColorSettings, defaultColorSettings } from './color-settings';
import { CoreSettings, defaultCoreSettings } from './core-settings';
import { DataSettings, defaultDataSettings } from './data-settings';
import { defaultColorSettings as importedDefaultColorSettings } from './default-color-settings';
import { GraphicsSettings, defaultGraphicsSettings } from './graphics-settings';
import { OrbitalSettings, defaultOrbitalSettings } from './orbital-settings';
import { parseGetVariables } from './parse-get-variables';
import { PerformanceSettings, defaultPerformanceSettings } from './performance-settings';
import { darkClouds } from './presets/darkClouds';
import { SettingsPresets } from './presets/presets';
import { UiSettings, defaultUiSettings } from './ui-settings';
import { EventBus } from '@app/engine/events/event-bus';

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
  isDrawSun: 'graphics',
  sizeOfSun: 'graphics',
  isUseSunTexture: 'graphics',
  isDrawNightAsDay: 'graphics',
  isDisableGodrays: 'graphics',
  godraysSamples: 'graphics',
  godraysDecay: 'graphics',
  godraysExposure: 'graphics',
  godraysDensity: 'graphics',
  godraysWeight: 'graphics',
  godraysIlluminationDecay: 'graphics',
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
  zFar: 'graphics',
  zNear: 'graphics',
  meshOverride: 'graphics',
  meshRotation: 'graphics',
  meshListOverride: 'graphics',
  modelsOnSatelliteViewOverride: 'graphics',
  noMeshManager: 'graphics',
  isDisableAsyncReadPixels: 'graphics',

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
  isWatchlistTopMenuNotification: 'ui',
  isUseJdayOnTopMenu: 'ui',
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
  isShowAgencies: 'ui',
  isDisableUrlBar: 'ui',
  isAlwaysHidePropRate: 'ui',
  isDisableTimeMachineToasts: 'ui',
  isDisableToasts: 'ui',
  isDisableSearchBox: 'ui',
  containerRoot: 'ui',

  // Camera
  fieldOfView: 'camera',
  fieldOfViewMax: 'camera',
  fieldOfViewMin: 'camera',
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
  offsetCameraModeX: 'camera',
  offsetCameraModeZ: 'camera',
  fpsForwardSpeed: 'camera',
  fpsPitchRate: 'camera',
  fpsRotateRate: 'camera',
  fpsSideSpeed: 'camera',
  fpsVertSpeed: 'camera',
  fpsYawRate: 'camera',
  drawCameraWidget: 'camera',

  // Orbital
  isDrawOrbits: 'orbital',
  isDrawTrailingOrbits: 'orbital',
  enableConstantSelectedSatRedraw: 'orbital',
  startWithOrbitsDisplayed: 'orbital',
  orbitSegments: 'orbital',
  oemOrbitSegments: 'orbital',
  maxOribtsDisplayedDesktopAll: 'orbital',
  maxOribtsDisplayed: 'orbital',
  maxOrbitsDisplayedMobile: 'orbital',
  maxOribtsDisplayedDesktop: 'orbital',
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
  lastSearch: 'core',
  lastSearchResults: 'core',
  minimumSearchCharacters: 'core',
  searchLimit: 'core',
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
  versionDate: 'core',
  versionNumber: 'core',
  videoBitsPerSecond: 'core',
  isMissionDataEnabled: 'core',
  pTime: 'core',
  lkVerify: 'core',
  settingsManager: 'core',
  isAutoStart: 'core',
  onLoadCb: 'core',
};

/**
 * Interface that declares all flattened properties for TypeScript type checking.
 * The actual values are delegated to category instances via getters/setters.
 */
export interface SettingsManager extends
  GraphicsSettings,
  UiSettings,
  CameraSettings,
  OrbitalSettings,
  DataSettings,
  PerformanceSettings,
  ColorSettings,
  CoreSettings { }

export class SettingsManager {
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

  static preserveSettings() {
    if (settingsManager.offlineMode) {
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_CAMERA_WIDGET, settingsManager.drawCameraWidget.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_ORBITS, settingsManager.isDrawOrbits.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_TRAILING_ORBITS, settingsManager.isDrawTrailingOrbits.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_ECF, settingsManager.isOrbitCruncherInEcf.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_IN_COVERAGE_LINES, settingsManager.isDrawInCoverageLines.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_SUN, settingsManager.isDrawSun.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_COVARIANCE_ELLIPSOID, settingsManager.isDrawCovarianceEllipsoid.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_BLACK_EARTH, settingsManager.isBlackEarth.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_ATMOSPHERE, settingsManager.isDrawAtmosphere.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_AURORA, settingsManager.isDrawAurora.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_MILKY_WAY, settingsManager.isDrawMilkyWay.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_GRAY_SKYBOX, settingsManager.isGraySkybox.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_ECI_ON_HOVER, settingsManager.isEciOnHover.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_HOS, settingsManager.colors.transparent[3] === 0 ? 'true' : 'false');
      if (settingsManager.isShowConfidenceLevels) {
        PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_CONFIDENCE_LEVELS, settingsManager.isShowConfidenceLevels.toString());
      } else {
        PersistenceManager.getInstance().removeItem(StorageKey.SETTINGS_CONFIDENCE_LEVELS);
      }
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DEMO_MODE, settingsManager.isDemoModeOn.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_SAT_LABEL_MODE, settingsManager.isSatLabelModeOn.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_FREEZE_PROP_RATE_ON_DRAG, settingsManager.isFreezePropRateOnDrag.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS, settingsManager.isDisableTimeMachineToasts.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_SEARCH_LIMIT, settingsManager.searchLimit.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_SAMPLES, settingsManager.godraysSamples.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_DECAY, settingsManager.godraysDecay.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_EXPOSURE, settingsManager.godraysExposure.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_DENSITY, settingsManager.godraysDensity.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_WEIGHT, settingsManager.godraysWeight.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_GODRAYS_ILLUMINATION_DECAY, settingsManager.godraysIlluminationDecay.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_EARTH_DAY_RESOLUTION, settingsManager.earthDayTextureQuality?.toString());
      PersistenceManager.getInstance().saveItem(StorageKey.GRAPHICS_SETTINGS_EARTH_NIGHT_RESOLUTION, settingsManager.earthNightTextureQuality?.toString());
    }

    EventBus.getInstance().emit(EventBusEvent.saveSettings);
  }

  loadPersistedSettings() {
    // Offline Mode only
    if (!this.offlineMode) {
      return;
    }

    this.isDrawOrbits = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_ORBITS, this.isDrawOrbits) as boolean;
    this.drawCameraWidget = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_CAMERA_WIDGET, this.drawCameraWidget) as boolean;
    this.isDrawTrailingOrbits = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_TRAILING_ORBITS, this.isDrawTrailingOrbits) as boolean;
    this.isOrbitCruncherInEcf = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_ECF, this.isOrbitCruncherInEcf) as boolean;
    this.isDrawInCoverageLines = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_IN_COVERAGE_LINES, this.isDrawInCoverageLines) as boolean;
    this.isDrawSun = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_SUN, this.isDrawSun) as boolean;
    this.isDrawCovarianceEllipsoid = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_COVARIANCE_ELLIPSOID, this.isDrawCovarianceEllipsoid) as boolean;
    this.isBlackEarth = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_BLACK_EARTH, this.isBlackEarth) as boolean;
    this.isDrawAtmosphere = parseInt(PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_DRAW_ATMOSPHERE) ?? '1') as AtmosphereSettings;
    this.isDrawAurora = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_AURORA, this.isDrawAurora) as boolean;
    this.isDrawMilkyWay = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DRAW_MILKY_WAY, this.isDrawMilkyWay) as boolean;
    this.isGraySkybox = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_GRAY_SKYBOX, this.isGraySkybox) as boolean;
    this.isEciOnHover = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_ECI_ON_HOVER, this.isEciOnHover) as boolean;
    if (settingsManager.isShowConfidenceLevels) {
      this.isShowConfidenceLevels = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_CONFIDENCE_LEVELS, this.isShowConfidenceLevels) as boolean;
    } else {
      this.isShowConfidenceLevels = false;
    }
    this.isDemoModeOn = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DEMO_MODE, this.isDemoModeOn) as boolean;
    this.isSatLabelModeOn = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_SAT_LABEL_MODE, this.isSatLabelModeOn) as boolean;
    this.isFreezePropRateOnDrag = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_FREEZE_PROP_RATE_ON_DRAG, this.isFreezePropRateOnDrag) as boolean;
    this.isDisableTimeMachineToasts = PersistenceManager.getInstance().checkIfEnabled(StorageKey.SETTINGS_DISABLE_TIME_MACHINE_TOASTS, this.isDisableTimeMachineToasts) as boolean;

    const earthDayTextureQaulityString = PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_EARTH_DAY_RESOLUTION);

    if (earthDayTextureQaulityString !== null) {
      this.earthDayTextureQuality = earthDayTextureQaulityString as EarthDayTextureQuality;
    }

    const earthNightTextureQaulityString = PersistenceManager.getInstance().getItem(StorageKey.GRAPHICS_SETTINGS_EARTH_NIGHT_RESOLUTION);

    if (earthNightTextureQaulityString !== null) {
      this.earthNightTextureQuality = earthNightTextureQaulityString as EarthNightTextureQuality;
    }

    const searchLimitString = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_SEARCH_LIMIT);

    if (searchLimitString !== null) {
      this.searchLimit = parseInt(searchLimitString);
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
    this.setEmbedOverrides_();
    this.setColorSettings_();

    const params = this.loadOverridesFromUrl_();

    if (settingsOverride) {
      this.loadOverrides_(settingsOverride);
    }

    if (settingsManager.preset) {
      switch (settingsManager.preset) { // NOSONAR
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
  }

  private checkIfIframe_() {
    if (window.self !== window.top) {
      this.isInIframe = true;
      this.isShowPrimaryLogo = true;
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

        Object.keys(overrides.plugins)
          .filter((_key) => _key in plugins)
          .forEach((_key) => {
            if (typeof overrides.plugins[_key] === 'undefined') {
              return;
            }
            this.plugins[_key] = overrides.plugins[_key];
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

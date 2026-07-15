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

import type { SensorGeolocation, SolarBody } from '@app/engine/core/interfaces';
import { Degrees, Milliseconds } from '@app/engine/ootk/src/main';
import type { FilterPluginSettings } from '@app/plugins/filter-menu/filter-menu';
import type { KeepTrackPluginsConfiguration } from '@app/plugins/keeptrack-plugins-configuration';
import type { ClassificationString } from '../app/ui/classification';
import { defaultPlugins } from './default-plugins';

/**
 * Controls how plugin icons behave when internet is unavailable.
 */
export enum OfflineIconBehavior {
  /** Grey out the icon; not clickable */
  DISABLE = 'disable',
  /** Completely hide the icon from the bottom menu */
  HIDE = 'hide',
}

/**
 * Which object fields a name/text search is allowed to match against.
 */
export interface SearchableFields {
  name: boolean;
  altName: boolean;
  bus: boolean;
  noradId: boolean;
  intlDes: boolean;
  launchVehicle: boolean;
}

/**
 * Which kinds of catalog objects a search is allowed to return. All types are
 * enabled by default; disabling one narrows the search to the remaining kinds.
 */
export interface SearchableTypes {
  satellite: boolean;
  missile: boolean;
  star: boolean;
  sensor: boolean;
  launchSite: boolean;
  planet: boolean;
}

/**
 * Core application settings and global flags
 */
export class CoreSettings {
  /**
   * A variable to hold a classification string, set to `null` when unused
   */
  classificationStr: ClassificationString | null = null;

  // Plugins and Filters
  /**
   * This controls which of the built-in plugins are loaded
   */
  plugins: KeepTrackPluginsConfiguration = defaultPlugins;

  filter: FilterPluginSettings = {};

  /**
   * URL-based regime filter. When non-empty, only satellites in the specified
   * regimes are loaded. Valid values: vleo, leo, meo, geo, heo, xgeo
   */
  regimeFilter: string[] = [];

  // Installation and Environment
  /**
   * The relative path to the installation directory. This is necessary if the application is
   * a folder inside the main folder of the webserver.
   * @deprecated This should be removed in favor of dynamic path resolution in the future.
   */
  installDirectory = '';
  /** Flag to determine if external data is available */
  offlineMode = false;
  /** Controls how internet-dependent plugin icons behave when offline */
  offlineIconBehavior: OfflineIconBehavior = OfflineIconBehavior.HIDE;
  /** Skip loading the satellite catalog on startup. Use with CatalogManagementPlugin to load catalogs via drag-and-drop or file picker. */
  noCatalogOnLoad = false;
  /**
   * Flag if the user is running inside an iframe
   */
  isInIframe = false;

  // Error Handling
  /**
   * Catch Errors and report them via github
   */
  isGlobalErrorTrapOn = true;
  isEnableConsole = false;

  // Time and Simulation
  /** The initial time */
  simulationTime: Date | null = null;
  propRate = 1.0;
  changeTimeWithKeyboardAmountBig = (1000 * 60 * 60) as Milliseconds; // 1 hour
  changeTimeWithKeyboardAmountSmall = (1000 * 60) as Milliseconds; // 1 minute

  // Time Machine
  /**
   * Delay before advancing in Time Machine mode
   */
  timeMachineDelay = <Milliseconds>5000;
  /**
   * Delay before advancing in Time Machine mode
   */
  timeMachineDelayAtPresentDay = <Milliseconds>20000;
  loopTimeMachine = false;
  timeMachineLongToast = false;

  // Demo Mode
  /**
   * Determines whether or not to run the demo mode.
   */
  isDemoModeOn = false;
  /**
   * The number of milliseconds between each satellite in demo mode.
   */
  demoModeInterval = <Milliseconds>3000;

  // Preset
  preset: string | null = null; // Used to force a preset to be loaded without GET variable

  // Satellite Visibility
  /**
   * Determines whether or not to show Geo satellites in the application.
   */
  isShowGeoSats = true;
  /**
   * Determines whether or not to show HEO satellites in the application.
   */
  isShowHeoSats = true;
  /**
   * Determines whether or not to show MEO satellites in the application.
   */
  isShowMeoSats = true;
  /**
   * Determines whether or not to show LEO satellites in the application.
   */
  isShowLeoSats = true;
  /**
   * Determines whether or not to show Notional satellites in the application.
   * Notional satellites are satellites that haven't launched yet.
   */
  isShowNotionalSats = true;
  /**
   * Determines whether or not to show Starlink satellites in the application.
   */
  isShowStarlinkSats = true;
  /**
   * Determines whether or not payloads should be displayed.
   */
  isShowPayloads = true;
  /**
   * Determines whether or not rocket bodies are shown.
   */
  isShowRocketBodies = true;
  /**
   * Determines whether or not debris is shown.
   */
  isShowDebris = true;
  /**
   * When set to true, only load satellites with the name "Starlink"
   */
  isStarlinkOnly = false;

  // Debris
  /**
   * Determines whether or not to show notional debris in the application. This was designed for presentation purposes.
   */
  isNotionalDebris = false;
  isDebrisOnly = false;

  /**
   * Reference epoch (ms since Unix epoch) that age-of-GP displays measure against,
   * instead of the wall clock. `null` means "use the current time" (the normal,
   * live-catalog case). The HistoricCatalogPlugin sets this to a loaded snapshot's
   * time so the GP-age color scheme and sat-info-box report age relative to when
   * the historic catalog was current. Cleared by CatalogLoader on any fresh load.
   */
  catalogReferenceTime: number | null = null;

  // Search
  lastSearch: string | string[] = '';
  /**
   * List of the last search results
   */
  lastSearchResults: number[] = [];
  /**
   * The minimum number of characters to type before searching.
   */
  minimumSearchCharacters = 2; // Searches after 3 characters typed
  /**
   * The maximum number of satellites to display when searching.
   */
  searchLimit = 600;
  /**
   * Whether to show decayed satellites (position 0,0,0) in search results.
   */
  isShowDecayedInSearch = true;
  /**
   * Whether to include Vimpel (analyst) objects in search results. These can
   * slow searches down considerably, so they are opt-in.
   */
  isShowVimpelInSearch = false;
  /**
   * Which object fields a name/text search is allowed to match against. All
   * fields default to enabled; disabling a field narrows the search.
   */
  searchableFields: SearchableFields = {
    name: true,
    altName: true,
    bus: true,
    noradId: true,
    intlDes: true,
    launchVehicle: true,
  };
  /**
   * Which kinds of catalog objects a search may return. All types are enabled by
   * default; disable individual kinds in the Search Settings menu.
   */
  searchableTypes: SearchableTypes = {
    satellite: true,
    missile: true,
    star: true,
    sensor: true,
    launchSite: true,
    planet: true,
  };
  /**
   * String to limit which satellites are loaded from the catalog
   */
  limitSats = '';

  // Selection
  isDisableSelectSat: boolean | null = null;
  /**
   * The number of days before a TLE is considered lost.
   */
  daysUntilObjectLost = 60;
  lostSatStr = '';

  // Geolocation
  /**
   * Geolocation data of the user.
   */
  geolocation: SensorGeolocation = {
    lat: null,
    lon: null,
    alt: null,
    minaz: null,
    maxaz: null,
    minel: null,
    maxel: null,
    minrange: null,
    maxrange: null,
  };
  /**
   * Global flag for determining if geolocation is being used
   */
  geolocationUsed = false;

  // GPS and Navigation
  /**
   * Minimum elevation to for calculating DOPs in dop plugin
   */
  gpsElevationMask = <Degrees>15;
  /**
   * The number of passes to consider when determining lookangles.
   */
  nextNPassesCount = 5;

  // Center Body
  centerBody: SolarBody = 'Earth' as SolarBody; // SolarBody.Earth

  // Special Settings
  altMsgNum: number | null = null;
  altLoadMsgs = false;
  isEPFL = false;
  /**
   * Name of satellite category for objects not in the official catalog.
   */
  nameOfSpecialSats = 'Special Sats';

  // Input Controls
  lastInteractionTime = 0;
  /**
   * The timestamp of the last gamepad movement.
   */
  lastGamepadMovement = 0;
  /**
   * Indicates whether the gamepad controls are limited or not.
   */
  isLimitedGamepadControls = false;
  /**
   * Allow Right Click Menu
   */
  isAllowRightClick = true;
  /**
   * Disable normal browser right click menu
   */
  disableDefaultContextMenu = true;
  /**
   * Disable normal browser events from keyboard/mouse
   */
  disableNormalEvents = false;
  /**
   * Disable Scrolling the Window Object
   */
  disableWindowScroll = true;
  /**
   * Disable Touch Move
   *
   * NOTE: Caused drag errors on Desktop
   */
  disableWindowTouchMove = true;
  /**
   * Disable Zoom Keyboard Keys
   */
  disableZoomControls = true;
  /**
   * Flag if the keyboard should be disabled
   */
  isDisableKeyboard = false;
  /**
   * Determines whether or not to freeze the propagation rate when dragging
   */
  isFreezePropRateOnDrag = false;

  // Persistence
  /**
   * If true, block saving/loading from local storage
   */
  isBlockPersistence = false;

  // Recording
  /**
   * The desired video bitrate in bits per second for video recording.
   *
   * This value is set to 30,000,000 bits per second (or 10.0 Mbps) by default.
   */
  videoBitsPerSecond = 30000000;

  // Mission Data
  /**
   * This enables/disable the mission data section of the sat-info-box. There is no value if your data set contains no mission data.
   */
  isMissionDataEnabled = true;

  // Misc
  pTime: unknown[] = [];
  lkVerify = 0;
  settingsManager: unknown = null;
  isAutoStart = false;

  /**
   * When true, pro plugins are usable without logging in.
   * Useful for self-hosted or branded deployments (e.g., celestrak).
   */
  isDisableLoginGate = false;

  /**
   * When true, the first-run onboarding tour never auto-starts (manual restart
   * surfaces still work). Intended for kiosk/embedded/offline deployments.
   */
  isDisableOnboarding = false;

  /**
   * When true, the PWA service worker is never registered. Embedded deployments
   * (e.g. the companion app's WebView, which serves the build from its own
   * https origin) must not install a service worker inside the host app.
   */
  isDisableServiceWorker = false;

  /**
   * When true, GA telemetry never loads regardless of consent state. Embedded
   * deployments must set this: they serve from localhost-like origins where the
   * dev-convenience consent shortcut would otherwise always grant.
   */
  isDisableTelemetry = false;

  /**
   * When true, the SoundManager never initializes its AudioContext or preloads any
   * clips. Deployments that ship no audio/ assets (e.g. the companion embed, whose
   * sync prunes the ~40 sound files) must set this — otherwise every clip 404s at
   * boot and floods the console with "Failed to load audio" warnings.
   */
  isDisableSounds = false;

  /**
   * When true, the per-frame GPU-picking pass (renders the catalog into an
   * offscreen id-buffer so a click/tap can identify the object under the cursor)
   * is skipped entirely. Deployments with no tap-to-select (e.g. the companion
   * embed, which drives selection programmatically) don't need it — and on
   * mobile, where the pass runs unscissored full-screen, it corrupts the visible
   * scene (missing atmosphere, orbit lines z-fighting through the Earth). Off by
   * default so normal builds keep interactive picking.
   */
  isDisableGpuPicking = false;

  /**
   * When true, the override's `plugins` map is treated as an exhaustive allowlist:
   * any plugin not listed (regardless of manifest default) is forced to enabled:false.
   * Profiles like celestrak/embed should set this to true so new plugins added to the
   * manifest later don't leak into the deployment.
   */
  isStrictPluginList = false;

  /**
   * Callback function that is called when the settings are loaded.
   */
  // eslint-disable-next-line no-empty-function
  onLoadCb = () => { };
}

export const defaultCoreSettings = new CoreSettings();

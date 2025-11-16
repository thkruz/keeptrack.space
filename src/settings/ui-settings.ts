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

import type { MenuMode } from '@app/engine/core/interfaces';
import { Milliseconds } from '@app/engine/ootk/src/main';

/**
 * User Interface and display settings
 */
export class UiSettings {
  activeMenuMode: MenuMode = 0; // MenuMode.BASIC

  // UI Enable/Disable
  /**
   * Disable main user interface. Currently an all or nothing package.
   */
  disableUI = false;
  isMobileModeEnabled = false;
  /**
   * Flag to determine if the bottom menu is disabled. Do not enable this unless you have disabled
   * plugins that use the bottom menu.
   */
  isDisableBottomMenu = false;
  isEmbedMode = false;

  // Splash Screen
  /**
   * Determines whether or not the splash screen images should be displayed.
   * The text and version number still appear.
   */
  isShowSplashScreen = true;
  splashScreenList: string[] | null = null;
  /** Flag to determine if loading hints are shown on splash screen*/
  isShowLoadingHints = true;

  // Logos
  /**
   * Flag for showing the primary logo
   */
  isShowPrimaryLogo = true;
  /**
   * Flag for showing the secondary logo for partnerships
   */
  isShowSecondaryLogo = false;

  // Top Menu
  /** Flag to determine if the watchlist is shown in the top menu */
  isWatchlistTopMenuNotification = true;
  isUseJdayOnTopMenu = true;

  // Maps
  /**
   * Initial resolution of the map width to increase performance
   */
  mapWidth = 800;
  /**
   * Initial resolution of the map height to increase performance
   */
  mapHeight = 600;
  /**
   * The last time the stereographic map was updated.
   *
   * TODO: This doesn't belong in the settings manager.
   */
  lastMapUpdateTime = 0;
  /**
   * Determines whether the last map that was loaded should be loaded again on the next session.
   */
  isLoadLastMap = true;

  // Sensor
  /**
   * Flag for loading the last sensor used by user
   */
  isLoadLastSensor = true;

  // Screenshots and Recording
  hiResWidth: number | null = null;
  hiResHeight: number | null = null;
  screenshotMode: string | null = null;
  lastBoxUpdateTime: number | null = null;
  /**
   * Global flag for determining if a screenshot is queued
   */
  queuedScreenshot = false;

  // HTML and CSS
  /** Ensures no html is injected into the page */
  isPreventDefaultHtml = false;
  isDisableCss: boolean | null = null;
  /**
   * Indicates whether the fallback css is enabled. This only loads if isDisableCss is true.
   */
  enableLimitedUI = true;

  // Hover and Overlay
  /**
   * Shows the orbit of the object when highlighted
   */
  enableHoverOrbits = true;
  /**
   * Shows an overlay with object information
   */
  enableHoverOverlay = true;
  isGroupOverlayDisabled: boolean | null = null;
  /**
   * How many draw calls to wait before updating orbit overlay if last draw time was greater than 50ms
   */
  updateHoverDelayLimitBig = 5;
  /**
   * How many draw calls to wait before updating orbit overlay if last draw time was greater than 20ms
   */
  updateHoverDelayLimitSmall = 3;
  /**
   * Determines whether or not to show the next pass time when hovering over an object.
   *
   * This is process intensive and should be disabled on low end devices
   */
  isShowNextPass = false;
  /**
   * Display ECI coordinates on object hover
   */
  isEciOnHover = false;

  // Labels
  /**
   * Determines whether or not to show the satellite labels.
   */
  isSatLabelModeOn = true;
  /**
   * The maximum number of satellite labels to display on desktop devices.
   */
  desktopMaxLabels = 500;
  /**
   * Maximum number of satellite labels to display on mobile devices
   */
  mobileMaxLabels = 100;
  /**
   * Minimum time between new satellite labels in milliseconds
   */
  minTimeBetweenSatLabels = <Milliseconds>100;

  // Responsive Design
  /**
   * The minimum width of the desktop view in pixels.
   */
  desktopMinimumWidth = 1300;
  /**
   * Determines whether the canvas should automatically resize when the window is resized.
   */
  isAutoResizeCanvas = true;
  /**
   * Global flag for determining if the application is resizing
   */
  isResizing = false;

  // Colorbox and Modals
  isPreventColorboxClose = false;
  isUseHigherFOVonMobile: boolean | null = null;

  // Orbit Display
  isOrbitOverlayVisible = false;
  isShowSatNameNotOrbit: boolean | null = null;
  /**
   * Determines whether the orbit should be shown through the Earth or not.
   */
  showOrbitThroughEarth = false;

  // Ads and Branding
  isShowAds = true;

  // Misc UI
  retro = false;
  /**
   * Allows canvas will steal focus on load
   */
  startWithFocus = false;
  /**
   * Indicates whether to show confidence levels when hovering over an object.
   */
  isShowConfidenceLevels: boolean = false;
  /**
   * Used for disabling the copyright text on screenshots and the map.
   */
  copyrightOveride = false;
  /**
   * Disable the optional ASCII catalog (only applies to offline mode)
   *
   * /tle/TLE.txt
   */
  isDisableAsciiCatalog = true;
  /**
   * Indicates whether or not Payload Owners/Manufacturers should be displayed on globe.
   *
   * TODO: This needs to be revamped. Most agencies are not linked to any satellites!
   */
  isShowAgencies = false;
  isDisableUrlBar: boolean | null = null;
  /**
   * Determines whether or not to hide the propagation rate text on the GUI.
   */
  isAlwaysHidePropRate = false;
  /**
   * Disable Toasts During Time Machine
   */
  isDisableTimeMachineToasts = false;
  /**
   * Disable toast messages
   */
  isDisableToasts = false;
  isDisableSearchBox = false;
  /**
   * The container root element for the application
   * NOTE: This is for initializing it, but keepTrackApi.containerRoot will be used throughout
   * the application when looking for the container root element
   */
  containerRoot: HTMLDivElement;
}

export const defaultUiSettings = new UiSettings();

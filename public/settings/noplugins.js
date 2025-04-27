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

const settingsOverride = {
  // installDirectory: '../',             // Directory where keepTrack is installed

  /*
   * enableHoverOrbits: false,            // Show orbits when mouse hovers over
   * startWithOrbitsDisplayed: true, // Start with orbits displayed
   * maxOribtsDisplayedDesktopAll: 50000, // Maximum number of orbits to display
   */
  isDisableSensors: true,
  isDisableLaunchSites: true,
  isDisableControlSites: true,
  isShowSplashScreen: false,
  isEPFL: true, // Changes how the hover textbox looks
  isDisableAsciiCatalog: true, // Disables the ascii catalog
  isLoadLastMap: false, // Loads the last map from local storage
  isShowLogo: true, // Support the developer and show the logo in the bottom left corner
  isGlobalErrorTrapOn: false, // No error reporting when crash occurs

  orbitHoverColor: [1.0, 0.5, 0.5, 1.0], // Color of orbits when mouse hovers over
  colors: {
    debris: [1.0, 0.0, 0.0, 0.5], // Color of debris
    /*
     * facility: [0.64, 0.0, 0.64, 1.0],
     * sensor: [1.0, 0.0, 0.0, 1.0],
     * deselected: [1.0, 1.0, 1.0, 0],
     * inView: [0.85, 0.5, 0.0, 1.0],
     * inviewAlt: [0.2, 0.4, 1.0, 1],
     * payload: [0.2, 1.0, 0.0, 0.5],
     * rocketBody: [0.2, 0.4, 1.0, 1],
     * unknown: [0.5, 0.5, 0.5, 0.85],
     * analyst: [1.0, 1.0, 1.0, 0.8],
     * missile: [1.0, 1.0, 0.0, 1.0],
     * missileInview: [1.0, 0.0, 0.0, 1.0],
     * transparent: [1.0, 1.0, 1.0, 0.1],
     * satHi: [1.0, 1.0, 1.0, 1.0],
     * satMed: [1.0, 1.0, 1.0, 0.8],
     * satLow: [1.0, 1.0, 1.0, 0.6],
     * sunlightInview: [0.85, 0.5, 0.0, 1.0],
     * penumbral: [1.0, 1.0, 1.0, 0.3],
     * umbral: [1.0, 1.0, 1.0, 0.1],
     * gradientAmt: 0,
     * satSmall: [0.2, 1.0, 0.0, 0.65],
     * rcsSmall: [1.0, 0, 0, 0.6],
     * rcsMed: [0.2, 0.4, 1.0, 1],
     * rcsLarge: [0, 1.0, 0, 0.6],
     * rcsUnknown: [1.0, 1.0, 0, 0.6],
     * ageNew: [0, 1.0, 0, 0.9],
     * ageMed: [1.0, 1.0, 0.0, 0.9],
     * ageOld: [1.0, 0.6, 0, 0.9],
     * ageLost: [1.0, 0.0, 0, 0.9],
     * lostobjects: [0.2, 1.0, 0.0, 0.65],
     * satLEO: [0.2, 1.0, 0.0, 0.65],
     * satGEO: [0.2, 1.0, 0.0, 0.65],
     * inGroup: [1.0, 0.0, 0.0, 1.0],
     * countryPRC: [1.0, 0, 0, 0.6],
     * countryUS: [0.2, 0.4, 1.0, 1],
     * countryCIS: [1.0, 1.0, 1.0, 1.0],
     * countryOther: [0, 1.0, 0, 0.6],
     * pink: [1.0, 0.0, 1.0, 1.0],
     * notional: [1.0, 0.0, 0.0, 0.7],
     */
  },
  // noMeshManager: true,

  plugins: {
    debug: false,
    satInfoboxCore: false,
    aboutManager: false,
    collisions: false,
    dops: false,
    findSat: false,
    launchCalendar: false,
    newLaunch: false,
    nextLaunch: false,
    nightToggle: false,
    photoManager: false,
    screenRecorder: false,
    satChanges: false,
    stereoMap: false,
    timeMachine: false,
    initialOrbit: false,
    missile: false,
    breakup: false,
    editSat: false,
    constellations: false,
    countries: false,
    colorsMenu: false,
    shortTermFences: false,
    orbitReferences: false,
    analysis: false,
    plotAnalysis: false,
    sensorFov: false,
    sensorSurv: false,
    satelliteFov: false,
    satelliteView: false,
    planetarium: false,
    astronomy: false,
    screenshot: false,
    watchlist: false,
    sensor: false,
    settingsMenu: false,
    datetime: false,
    social: false,
    topMenu: false,
    classificationBar: false,
    soundManager: false,
    gamepad: false,
    debrisScreening: false,
    videoDirector: false,
    createSat: false,
  },
};

// Expose these to the console
window.settingsOverride = settingsOverride;

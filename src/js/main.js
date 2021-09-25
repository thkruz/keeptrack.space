/* eslint-disable no-unreachable */
/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import '@app/js/api/externalApi';
import 'jquery-ui-bundle';
import 'materialize-css';
import '@app/css/astroux/css/astro.css';

import { LineFactory, sceneManager } from '@app/js/drawManager/sceneManager/sceneManager.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';

import $ from 'jquery';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { Dots } from '@app/js/drawManager/dots';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { VERSION } from '@app/js/settingsManager/version.js';
import { VERSION_DATE } from '@app/js/settingsManager/versionDate.js';
import { adviceManager } from '@app/js/uiManager/ui-advice.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
import { isThisJest } from '@app/js/api/externalApi';
import { jQAlt } from '@app/js/lib/jqalt.js';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { orbitManager } from '@app/js/orbitManager/orbitManager.js';
// import { radarDataManager } from'@app/js/satSet/radarDataManager.js';
import { satSet } from '@app/js/satSet/satSet.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { sensorManager } from '@app/js/plugins/sensor/sensorManager.js';
import { starManager } from '@app/js/starManager/starManager.js';
import { timeManager } from '@app/js/timeManager/timeManager';

const keepTrackApi = window.keepTrackApi;
keepTrackApi.programs = {
  adviceManager: adviceManager,
  cameraManager: null,
  ColorScheme: ColorScheme,
  drawManager: drawManager,
  mapManager: null,
  objectManager: objectManager,
  orbitManager: orbitManager,
  satSet: satSet,
  satellite: satellite,
  sceneManager: sceneManager,
  searchBox: searchBox,
  sensorManager: sensorManager,
  settingsManager: settingsManager,
  starManager: starManager,
  timeManager: timeManager,
  uiManager: uiManager,
  uiInput: uiInput,
};

export const redirectHttpToHttps = () => {
  // This is necessary for some of the geolocation based functions
  // but it only runs on the main website
  if (window.location.protocol === 'http:' && (window.location.hostname === 'keeptrack.space' || window.location.hostname === 'www.keeptrack.space')) {
    var httpURL = window.location.hostname + window.location.pathname + window.location.search;
    var httpsURL = 'https://' + httpURL;
    window.location = httpsURL;
  }
};

export const showErrorCode = (error) => {
  let errorHtml = '';
  if (error?.message) {
    errorHtml += error.message + '<br>';
  }
  if (error?.lineNumber) {
    errorHtml += 'Line: ' + error.lineNumber + '<br>';
  }
  if (error?.stack) {
    errorHtml += error.stack + '<br>';
  }
  $('#loader-text').html(errorHtml);
  // istanbul ignore next
  if (!isThisJest()) console.warn(error);
};

export const initalizeKeepTrack = async () => {
  try {
    uiManager.loadStr('science');
    // Load all the plugins now that we have the API initialized
    await import('@app/js/plugins/core')
      .then((mod) => mod.loadCorePlugins(keepTrackApi, settingsManager.plugins))
      .catch((err) => {});
    await import('@app/js/plugins/plugins')
      .then((mod) => mod.loadExtraPlugins())
      .catch((err) => {});

    uiManager.loadStr('science2');
    // Start initializing the rest of the website
    timeManager.init();
    uiManager.onReady();
    uiManager.loadStr('dots');
    uiManager.mobileManager.init();
    const cameraManager = new Camera();
    keepTrackApi.programs.cameraManager = cameraManager;
    // We need to know if we are on a small screen before starting webgl
    await drawManager.glInit();
    if (typeof process !== 'undefined') {
      // NOTE: Jest fails with webgl2 so we use webgl1 during testing
      // This means we need to mock some of the webgl2 code
      // eslint-disable-next-line no-undef
      keepTrackApi.programs.drawManager.gl = global.mocks.glMock;
    }

    window.addEventListener('resize', drawManager.resizeCanvas);

    drawManager.loadScene();

    const dotsManager = await drawManager.createDotsManager(Dots);
    keepTrackApi.programs.dotsManager = dotsManager;

    await satSet.init();
    objectManager.init();
    ColorScheme.init();
    drawManager.selectSatManager.init();

    await satSet.loadCatalog(); // Needs Object Manager and gl first
    const satCruncher = satSet.satCruncher;
    keepTrackApi.programs.satCruncher = satCruncher;

    dotsManager.setupPickingBuffer(satSet.satData);
    satSet.setColorScheme(ColorScheme.default, true);

    const groupsManager = new GroupFactory();
    keepTrackApi.programs.groupsManager = groupsManager;

    orbitManager.init();
    searchBox.init();

    const lineManager = new LineFactory();
    keepTrackApi.programs.lineManager = lineManager;

    starManager.init();
    uiManager.init();
    satellite.initLookangles();
    dotsManager.updateSizeBuffer(satSet.satData);
    // await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
    satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
    objectManager.satLinkManager.idToSatnum(satSet);

    uiInput.init();

    drawManager.init();

    // Now that everything is loaded, start rendering to thg canvas
    drawManager.drawLoop();

    // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
    uiManager.postStart();

    // Update any CSS now that we know what is loaded
    keepTrackApi.methods.uiManagerFinal();
  } catch (error) {
    showErrorCode(error);
  }
};

// Upodate the version number and date
settingsManager.versionNumber = VERSION;
settingsManager.versionDate = VERSION_DATE;

// Import CSS needed for loading screen
(async () => {
  try {
    if (!settingsManager.disableUI) {
      import('@app/css/fonts.css')
        .then((resp) => resp)
        .catch((err) => {});
      import('@app/css/materialize.css')
        .then((resp) => resp)
        .catch((err) => {});
      import('@app/css/materialize-local.css')
        .then((resp) => resp)
        .catch((err) => {});
      import('@app/js/lib/external/colorPick.css')
        .then((resp) => resp)
        .catch((err) => {});
      import('@app/css/perfect-scrollbar.min.css')
        .then((resp) => resp)
        .catch((err) => {});
      import('@app/css/jquery-ui.min.css')
        .then((resp) => resp)
        .catch((err) => {});
      import('@app/css/jquery-ui-timepicker-addon.css')
        .then((resp) => resp)
        .catch((err) => {});
      import('@app/css/style.css')
        .then(
          await import('@app/css/responsive.css')
            .catch((err) => {})
            .then((resp) => resp)
        )
        .catch((err) => {});
    } else if (settingsManager.enableLimitedUI) {
      import('@app/css/limitedUI.css')
        .then((resp) => resp)
        .catch((err) => {});
    } else {
      // console.log('ERROR');
    }
  } catch (e) {
    console.error(e);
  }
})();

// Force HTTPS on main website
redirectHttpToHttps();
// Load the main website
jQAlt.docReady(initalizeKeepTrack);

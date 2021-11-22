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

import { keepTrackApi } from '@app/js/api/externalApi';
import { camera } from '@app/js/camera/camera';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory';
import { dotsManager } from '@app/js/drawManager/dots';
import { drawManager } from '@app/js/drawManager/drawManager';
import { LineFactory, sceneManager } from '@app/js/drawManager/sceneManager/sceneManager';
import { GroupFactory } from '@app/js/groupsManager/groupsManager';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { orbitManager } from '@app/js/orbitManager/orbitManager';
import { sensorManager } from '@app/js/plugins/sensor/sensorManager';
import { satellite } from '@app/js/satMath/satMath';
import { satSet } from '@app/js/satSet/satSet';
import { VERSION } from '@app/js/settingsManager/version.js';
import { VERSION_DATE } from '@app/js/settingsManager/versionDate.js';
import { starManager } from '@app/js/starManager/starManager';
import { timeManager } from '@app/js/timeManager/timeManager';
import { adviceManager } from '@app/js/uiManager/adviceManager';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager';

export const initalizeKeepTrack = async (): Promise<void> => {
  try {
    keepTrackApi.programs = {
      adviceManager: adviceManager,
      mainCamera: camera,
      ColorScheme: ColorScheme,
      drawManager: drawManager,
      dotsManager: dotsManager,
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

    uiManager.loadStr('science');
    // Load all the plugins now that we have the API initialized
    await import('@app/js/plugins/core')
      .then((mod) => mod.loadCorePlugins(keepTrackApi, settingsManager.plugins))
      .catch(() => {
        // intentionally left blank
      });
    await import('@app/js/plugins/plugins')
      .then((mod) => mod.loadExtraPlugins(keepTrackApi))
      .catch(() => {
        // intentionally left blank
      });

    uiManager.loadStr('science2');
    // Start initializing the rest of the website
    timeManager.init();
    uiManager.onReady();
    uiManager.loadStr('dots');
    uiManager.mobileManager.init();
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

    await drawManager.createDotsManager(drawManager.gl);

    await satSet.init();
    objectManager.init();
    ColorScheme.init();
    drawManager.selectSatManager.init();

    const satCruncher = satSet.satCruncher;
    keepTrackApi.programs.satCruncher = satCruncher;

    keepTrackApi.programs.dotsManager.setupPickingBuffer(satSet.satData);
    satSet.setColorScheme(ColorScheme.default, true);

    const groupsManager = new GroupFactory();
    keepTrackApi.programs.groupsManager = groupsManager;

    orbitManager.init();
    searchBox.init();

    const lineManager = new LineFactory();
    keepTrackApi.programs.lineManager = lineManager;

    starManager.init();
    uiManager.init();
    keepTrackApi.programs.dotsManager.updateSizeBuffer(satSet.satData);
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
    console.debug(error);
  }
};

// Upodate the version number and date
settingsManager.versionNumber = VERSION;
settingsManager.versionDate = VERSION_DATE;

// Load the main website
$(document).on('ready', initalizeKeepTrack);

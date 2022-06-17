/* eslint-disable no-unreachable */
/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
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

import { keepTrackApi } from '../js/api/keepTrackApi';
import { camera } from '../js/camera/camera';
import { colorSchemeManager } from '../js/colorManager/colorSchemeManager';
import { dotsManager } from '../js/drawManager/dots';
import { drawManager } from '../js/drawManager/drawManager';
import { LineFactory } from '../js/drawManager/sceneManager/sceneManager';
import { groupsManager } from '../js/groupsManager/groupsManager';
import { objectManager } from '../js/objectManager/objectManager';
import { orbitManager } from '../js/orbitManager/orbitManager';
import { sensorManager } from '../js/plugins';
import { satellite } from '../js/satMath/satMath';
import { satSet } from '../js/satSet/satSet';
import { VERSION } from '../js/settingsManager/version.js';
import { VERSION_DATE } from '../js/settingsManager/versionDate.js';
import { starManager } from '../js/starManager/starManager';
import { timeManager } from '../js/timeManager/timeManager';
import { adviceManager } from '../js/uiManager/adviceManager';
import { uiManager } from '../js/uiManager/uiManager';
import { searchBox } from './uiManager/searchBox';

export const initalizeKeepTrack = async (): Promise<void> => {
  try {
    keepTrackApi.programs = <any>{
      adviceManager,
      mainCamera: camera,
      colorSchemeManager,
      drawManager,
      dotsManager,
      groupsManager,
      mapManager: null,
      objectManager,
      orbitManager,
      satSet,
      satellite,
      searchBox,
      sensorManager,
      starManager,
      timeManager,
      uiManager,
    };

    uiManager.loadStr('science');
    // Load all the plugins now that we have the API initialized
    await import('./plugins')
      .then((mod) => mod.loadCorePlugins(keepTrackApi, settingsManager.plugins))
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

    satSet.init();
    objectManager.init();
    colorSchemeManager.init();
    drawManager.selectSatManager.init();

    const satCruncher = satSet.satCruncher;
    keepTrackApi.programs.satCruncher = satCruncher;

    keepTrackApi.programs.dotsManager.setupPickingBuffer(satSet.satData?.length);
    satSet.setColorScheme(colorSchemeManager.default, true);

    orbitManager.init();

    const lineManager = new LineFactory();
    keepTrackApi.programs.lineManager = lineManager;

    starManager.init();
    uiManager.init();
    keepTrackApi.programs.dotsManager.updateSizeBuffer(satSet.satData?.length);
    // await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
    satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
    objectManager.satLinkManager.idToSatnum(satSet);

    uiManager.uiInput.init();

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
document.addEventListener('DOMContentLoaded', initalizeKeepTrack);

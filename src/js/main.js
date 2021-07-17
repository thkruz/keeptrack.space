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
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { LineFactory } from '@app/js/drawManager/sceneManager/sceneManager.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
import { jQAlt } from '@app/js/lib/jqalt.js';
import { missileManager } from '@app/js/missileManager/missileManager.js';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { orbitManager } from '@app/js/orbitManager/orbitManager.js';
import { photoManager } from '@app/js/photoManager/photoManager.js';
// import { radarDataManager } from'@app/js/satSet/radarDataManager.js';
import { sMM } from '@app/js/uiManager/sideMenuManager.js';
import { satSet } from '@app/js/satSet/satSet.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { sensorManager } from '@app/js/sensorManager/sensorManager.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';
import { starManager } from '@app/js/starManager/starManager.js';
import { timeManager } from '@app/js/timeManager/timeManager.js';

const keepTrackApi = window.keepTrackApi;
keepTrackApi.programs.ColorScheme = ColorScheme;
keepTrackApi.programs.drawManager = drawManager;
keepTrackApi.programs.missileManager = missileManager;
keepTrackApi.programs.objectManager = objectManager;
keepTrackApi.programs.orbitManager = orbitManager;
keepTrackApi.programs.photoManager = photoManager;
keepTrackApi.programs.satSet = satSet;
keepTrackApi.programs.satellite = satellite;
keepTrackApi.programs.searchBox = searchBox;
keepTrackApi.programs.sensorManager = sensorManager;
keepTrackApi.programs.settingsManager = settingsManager;
keepTrackApi.programs.starManager = starManager;
keepTrackApi.programs.sMM = sMM;
keepTrackApi.programs.timeManager = timeManager;
keepTrackApi.programs.uiManager = uiManager;
keepTrackApi.programs.uiInput = uiInput;

const initalizeKeepTrack = async () => {
  try {
    await timeManager.init();
    settingsManager.loadStr('dots');
    uiManager.mobileManager.init();
    const cameraManager = new Camera();
    keepTrackApi.programs.cameraManager = cameraManager;
    // We need to know if we are on a small screen before starting webgl
    await drawManager.glInit();
    window.addEventListener('resize', drawManager.resizeCanvas);

    drawManager.loadScene();

    const dotsManager = await drawManager.createDotsManager();
    keepTrackApi.programs.dotsManager = dotsManager;

    satSet.init();
    objectManager.init();
    await ColorScheme.init();
    drawManager.selectSatManager.init();

    await satSet.loadCatalog(); // Needs Object Manager and gl first
    const satCruncher = satSet.satCruncher;
    keepTrackApi.programs.satCruncher = satCruncher;

    dotsManager.setupPickingBuffer(satSet.satData);
    satSet.setColorScheme(ColorScheme.default, true);

    const groupsManager = new GroupFactory();
    keepTrackApi.programs.groupsManager = groupsManager;

    await orbitManager.init();
    searchBox.init();

    const lineManager = new LineFactory();
    keepTrackApi.programs.lineManager = lineManager;

    starManager.init();
    uiManager.init();
    await satellite.initLookangles();
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
    photoManager.init();
  } catch (error) {
    /* istanbul ignore next */
    console.warn(error);
  }
};

jQAlt.docReady(initalizeKeepTrack);

// For testing purposes
export { initalizeKeepTrack };

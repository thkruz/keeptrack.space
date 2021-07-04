/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * Copyright (C) 2016-2021 Theodore Kruczek
 * Copyright (C) 2020 Heather Kruczek
 * Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import 'jquery-ui-bundle';
import 'materialize-css';
import { getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly, satSet } from './satSet/satSet.js';
import { uiInput, uiManager } from './uiManager/uiManager.js';
import { Camera } from './cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from './colorManager/color-scheme-factory.js';
import { GroupFactory } from './groupsManager/group-factory.js';
import { LineFactory } from './drawManager/sceneManager/sceneManager.js';
import { drawManager } from './drawManager/drawManager.js';
import { jQAlt } from './lib/jqalt.js';
import { objectManager } from './objectManager/objectManager.js';
import { orbitManager } from './orbitManager/orbitManager.js';
import { photoManager } from './photoManager/photoManager.js';
// import { radarDataManager } from './satSet/radarDataManager.js';
import { sMM } from './uiManager/sideMenuManager.js';
import { satellite } from './lib/lookangles.js';
import { searchBox } from './uiManager/search-box.js';
import { sensorManager } from './sensorManager/sensorManager.js';
import { settingsManager } from './settingsManager/settingsManager.js';
import { starManager } from './starManager/starManager.js';
import { timeManager } from './timeManager/timeManager.js';

const initalizeKeepTrack = async () => {
  try {
    await timeManager.init();
    settingsManager.loadStr('dots');
    uiManager.mobileManager.init();
    const cameraManager = new Camera();
    // We need to know if we are on a small screen before starting webgl
    const gl = await drawManager.glInit();
    window.addEventListener('resize', drawManager.resizeCanvas);
    drawManager.loadScene(gl);
    const dotsManager = await drawManager.createDotsManager();
    satSet.init(gl, dotsManager, cameraManager);
    objectManager.init(sensorManager);
    await ColorScheme.init(gl, cameraManager, timeManager, sensorManager, objectManager, satSet, satellite, settingsManager);
    drawManager.selectSatManager.init(ColorScheme.group, sensorManager, satSet, objectManager, sMM, timeManager);
    await satSet.loadCatalog(); // Needs Object Manager and gl first
    const satCruncher = satSet.satCruncher;

    dotsManager.setupPickingBuffer(satSet.satData);
    satSet.setColorScheme(ColorScheme.default, true);

    const groupsManager = new GroupFactory(satSet, ColorScheme, settingsManager);
    await orbitManager.init(gl, cameraManager, groupsManager);
    searchBox.init(satSet, groupsManager, orbitManager, dotsManager);
    const lineManager = new LineFactory(gl, orbitManager.shader, getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly);
    starManager.init(lineManager, getIdFromStarName);
    uiManager.init(cameraManager, lineManager, starManager, groupsManager, satSet, orbitManager, groupsManager, ColorScheme);
    await satellite.initLookangles(satSet, satCruncher, sensorManager, groupsManager);
    dotsManager.updateSizeBuffer(satSet.satData);
    // await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
    satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
    objectManager.satLinkManager.idToSatnum(satSet);

    uiInput.init(cameraManager, objectManager, satellite, satSet, lineManager, sensorManager, starManager, ColorScheme, satCruncher, uiManager, drawManager, dotsManager);

    drawManager.init(groupsManager, uiInput, starManager, satellite, ColorScheme, cameraManager, objectManager, orbitManager, sensorManager, uiManager, lineManager, dotsManager);

    // Now that everything is loaded, start rendering to thg canvas
    drawManager.drawLoop();

    // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
    uiManager.postStart();
    photoManager.init(cameraManager, satSet, timeManager, uiManager, drawManager.selectSatManager);
  } catch (error) {
    /* istanbul ignore next */
    console.warn(error);
  }
};

jQAlt.docReady(initalizeKeepTrack);

// For testing purposes
export { initalizeKeepTrack };

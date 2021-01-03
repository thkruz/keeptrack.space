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
import '@app/js/keeptrack-foot.js';
import 'materialize-css';
import { Atmosphere, LineFactory, Moon, earth, sun } from '@app/js/sceneManager/sceneManager.js';
import { getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly, satSet } from '@app/js/satSet.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { Dots } from './dots';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { dlManager } from '@app/js/dlManager/dlManager.js';
import { jQAlt } from '@app/js/jqalt/jqalt.js';
import { meshManager } from '@app/modules/meshManager.js';
import { mobile } from '@app/js/mobile.js';
import { objectManager } from '@app/js/objectManager.js';
import { orbitManager } from '@app/js/orbitManager.js';
import { radarDataManager } from '@app/js/radarDataManager.js';
import { satLinkManager } from '@app/modules/satLinkManager.js';
import { satellite } from '@app/js/lookangles.js';
import { searchBox } from '@app/js/search-box.js';
import { selectSatManager } from '@app/js/selectSat.js';
import { sensorManager } from '@app/modules/sensorManager.js';
import { settingsManager } from '@app/js/keeptrack-head.js';
import { starManager } from '@app/js/starManager/starManager.js';
import { timeManager } from '@app/js/timeManager.js';

jQAlt.docReady(async function initalizeKeepTrack() {
  timeManager.propRealTime = Date.now();
  settingsManager.loadStr('dots');
  await mobile.checkMobileMode();
  const cameraManager = new Camera();
  const gl = await dlManager.glInit(mobile);
  const dotsManager = new Dots(gl);
  satSet.init(gl, dotsManager, cameraManager);
  objectManager.init(dotsManager);
  await ColorScheme.init(gl, cameraManager, timeManager, sensorManager, objectManager, satSet, satellite, settingsManager);
  selectSatManager.init(ColorScheme.group);
  await satSet.loadCatalog(); // Needs Object Manager and gl first
  const satCruncher = satSet.satCruncher;

  dotsManager.setupPickingBuffer(satSet.satData);
  satSet.setColorScheme(ColorScheme.default, true);
  await earth.init(gl);
  earth.loadHiRes();
  earth.loadHiResNight();
  meshManager.init(gl, earth);
  let atmosphere = new Atmosphere(gl, earth);
  await sun.init(gl, earth);
  let moon = new Moon(gl, sun);

  const groupsManager = new GroupFactory(satSet, ColorScheme, settingsManager);
  await orbitManager.init(gl, cameraManager, groupsManager);
  searchBox.init(satSet, groupsManager, orbitManager, dotsManager);
  const lineManager = new LineFactory(gl, orbitManager.shader, getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly);
  satLinkManager.init(lineManager, satSet, sensorManager);
  starManager.init(lineManager, getIdFromStarName);
  uiManager.init(cameraManager, lineManager, starManager, groupsManager, satSet, orbitManager, groupsManager, ColorScheme);
  await satellite.initLookangles(satSet, satCruncher, sensorManager, groupsManager);
  dotsManager.updateSizeBuffer(satSet.satData);
  await radarDataManager.init(sensorManager, timeManager, satSet, satCruncher, satellite);
  satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
  satLinkManager.idToSatnum(satSet);

  uiInput.init(cameraManager, mobile, objectManager, satellite, satSet, lineManager, sensorManager, starManager, ColorScheme, satCruncher, earth, gl, uiManager, dlManager, dotsManager);

  await dlManager.init(
    groupsManager,
    uiInput,
    moon,
    sun,
    searchBox,
    atmosphere,
    starManager,
    satellite,
    ColorScheme,
    cameraManager,
    objectManager,
    orbitManager,
    meshManager,
    earth,
    sensorManager,
    uiManager,
    lineManager,
    gl,
    timeManager,
    dotsManager
  );

  // Now that everything is loaded, start rendering to thg canvas
  dlManager.drawLoop();

  // Reveleal Key Components to the Console
  window.satSet = satSet;
});

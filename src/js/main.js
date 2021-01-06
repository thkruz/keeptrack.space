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
import { getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly, satSet } from '@app/js/satSet/satSet.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { Dots } from './dots';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { LineFactory } from '@app/js/dlManager/sceneManager/sceneManager.js';
import { dlManager } from '@app/js/dlManager/dlManager.js';
import { jQAlt } from '@app/js/jqalt/jqalt.js';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { orbitManager } from '@app/js/orbitManager.js';
import { radarDataManager } from '@app/js/satSet/radarDataManager.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { selectSatManager } from '@app/js/selectSat.js';
import { sensorManager } from '@app/modules/sensorManager.js';
import { settingsManager } from '@app/js/settings.js';
import { starManager } from '@app/js/starManager/starManager.js';
import { timeManager } from '@app/js/timeManager.js';

jQAlt.docReady(async function initalizeKeepTrack() {
  timeManager.init();
  settingsManager.loadStr('dots');
  uiManager.mobileManager.init();
  const cameraManager = new Camera();
  // We need to know if we are on a small screen before starting webgl
  const gl = await dlManager.glInit();
  dlManager.loadScene();
  const dotsManager = new Dots(gl);
  satSet.init(gl, dotsManager, cameraManager);
  objectManager.init(sensorManager);
  await ColorScheme.init(gl, cameraManager, timeManager, sensorManager, objectManager, satSet, satellite, settingsManager);
  selectSatManager.init(ColorScheme.group);
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
  await radarDataManager.init(sensorManager, satSet, satCruncher, satellite);
  satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
  objectManager.satLinkManager.idToSatnum(satSet);

  uiInput.init(cameraManager, objectManager, satellite, satSet, lineManager, sensorManager, starManager, ColorScheme, satCruncher, uiManager, dlManager, dotsManager);

  await dlManager.init(groupsManager, uiInput, starManager, satellite, ColorScheme, cameraManager, objectManager, orbitManager, sensorManager, uiManager, lineManager, dotsManager);

  // Now that everything is loaded, start rendering to thg canvas
  await dlManager.drawLoop();

  // UI Changes after everything starts -- DO NOT RUN THIS EARLY IT HIDES THE CANVAS
  uiManager.postStart();

  // Reveleal Key Components to the Console
  window.satSet = satSet;
});

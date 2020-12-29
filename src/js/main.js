/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * Copyright (C) 2016-2020 Theodore Kruczek
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

import * as $ from 'jquery';
// eslint-disable-next-line sort-imports
import 'jquery-ui-bundle';
import '@app/js/keeptrack-foot.js';
import 'materialize-css';
import * as glm from '@app/js/lib/gl-matrix.js';
import { LineFactory, atmosphere, earth, moon, sun } from '@app/js/sceneManager/sceneManager.js';
import { db, settingsManager } from '@app/js/keeptrack-head.js';
import { getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly, satCruncher, satScreenPositionArray, satSet } from '@app/js/satSet.js';
import { isselectedSatNegativeOne, selectSatManager } from '@app/js/selectSat.js';
import { mathValue, watermarkedDataURL } from '@app/js/helpers.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorScheme } from '@app/js/color-scheme.js';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { meshManager } from '@app/modules/meshManager.js';
import { missileManager } from '@app/modules/missileManager.js';
import { mobile } from '@app/js/mobile.js';
import { objectManager } from '@app/js/objectManager.js';
import { orbitManager } from '@app/js/orbitManager.js';
import { radarDataManager } from '@app/js/radarDataManager.js';
import { sMM } from '@app/js/sideMenuManager.js';
import { satLinkManager } from '@app/modules/satLinkManager.js';
import { satellite } from '@app/js/lookangles.js';
import { searchBox } from '@app/js/search-box.js';
import { sensorManager } from '@app/modules/sensorManager.js';
import { starManager } from '@app/js/starManager/starManager.js';
import { timeManager } from '@app/js/timeManager.js';
import { uiManager } from '@app/js/uiManager.js';
let M = window.M;

('use strict');
const canvasDOM = $('#keeptrack-canvas');
const bodyDOM = $('#bodyDOM');
const satHoverBoxNode1 = document.getElementById('sat-hoverbox1');
const satHoverBoxNode2 = document.getElementById('sat-hoverbox2');
const satHoverBoxNode3 = document.getElementById('sat-hoverbox3');
const satHoverBoxDOM = $('#sat-hoverbox');
const rightBtnMenuDOM = $('#right-btn-menu');
const rightBtnSaveDOM = $('#save-rmb');
const rightBtnViewDOM = $('#view-rmb');
const rightBtnEditDOM = $('#edit-rmb');
const rightBtnCreateDOM = $('#create-rmb');
const rightBtnDrawDOM = $('#draw-rmb');
const rightBtnColorsDOM = $('#colors-rmb');
const rightBtnEarthDOM = $('#earth-rmb');
const rightBtnSaveMenuDOM = $('#save-rmb-menu');
const rightBtnViewMenuDOM = $('#view-rmb-menu');
const rightBtnEditMenuDOM = $('#edit-rmb-menu');
const rightBtnCreateMenuDOM = $('#create-rmb-menu');
const rightBtnDrawMenuDOM = $('#draw-rmb-menu');
const rightBtnColorsMenuDOM = $('#colors-rmb-menu');
const rightBtnEarthMenuDOM = $('#earth-rmb-menu');
const satMiniBox = document.querySelector('#sat-minibox');

var gl;
var lineManager;
var groupsManager;

var clickedSat = 0;

var maxPinchSize = Math.hypot(window.innerWidth, $(document).height());

// Menu Variables
var isDOPMenuOpen = false;

var pickFb, pickTex;
var pMatrix = glm.mat4.create();

var updateHoverDelay = 0;
var updateHoverDelayLimit = 1;

var pickColorBuf;

var mouseTimeout = null;
var mouseSat = -1;

var dragPoint = [0, 0, 0];

var isMouseMoving = false;
var dragHasMoved = false;

var isPinching = false;
var deltaPinchDistance = 0;
var startPinchDistance = 0;
var touchStartTime;

var satLabelModeLastTime = 0;
var isSatMiniBoxInUse = false;
var labelCount;
var hoverBoxOnSatMiniElements = [];
var satHoverMiniDOM;

var isShowNextPass = false;

// updateHover
let updateHoverSatId;

// _unProject variables
let glScreenX, glScreenY, screenVec, comboPMat, invMat, worldVec;

let isHoverBoxVisible = false;
let isShowDistance = true;

// getEarthScreenPoint
let rayOrigin, ptThru, rayDir, toCenterVec, dParallel, longDir, dPerp, dSubSurf, dSurf, ptSurf;

var cameraManager;

var initializeKeepTrack = () => {
  mobile.checkMobileMode();
  webGlInit();
  cameraManager = new Camera();
  ColorScheme.init(cameraManager);
  earth.init(gl);
  sun.init(gl, earth);
  if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess) {
    atmosphere.init(gl, earth);
    // Disabling Moon Until it is Fixed
    moon.init(gl, sun);
  }
  settingsManager.loadStr('dots');
  objectManager.init();
  satSet.init(satSetInitCallBack, cameraManager);
  if (settingsManager.isEnableRadarData) radarDataManager.init();
  dlManager.drawLoop(); // kick off the animationFrame()s
  if (!settingsManager.disableUI && !settingsManager.isDrawLess) {
    // Load Optional 3D models if available
    if (typeof meshManager !== 'undefined') {
      setTimeout(function () {
        meshManager.init();
      }, 0);
      settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];
    }
  }
};

var dlManager = {};
// Setup dlManager
{
  dlManager.drawLoopCallback = null;
  dlManager.setDrawLoopCallback = (cb) => {
    dlManager.drawLoopCallback = cb;
  };
  dlManager.i = 0;
  dlManager.sat;
  dlManager.demoModeSatellite = 0;
  dlManager.demoModeLastTime = 0;
  dlManager.dt = null;
  dlManager.t0 = 0;
  dlManager.isShowFPS = false;
}

dlManager.drawLoop = (preciseDt) => {
  // Restart the draw loop when ready to draw again
  requestAnimationFrame(dlManager.drawLoop);

  // Record milliseconds since last drawLoop - default is 0
  dlManager.dt = preciseDt - dlManager.t0 || 0;
  // Record last Draw Time for Calculating Difference
  dlManager.t0 = preciseDt;

  // Display it if that settings is enabled
  if (dlManager.isShowFPS) console.log(1000 / timeManager.dt);

  // Update official time for everyone else
  timeManager.setNow(Date.now(), dlManager.dt, $('#datetime-input-tb'));

  // Calculate changes related to satellites objects
  dlManager.satCalculate();

  // Calculate camera changes needed since last draw
  cameraManager.calculate(objectManager.selectedSat, dlManager.dt);

  // Missile oribts have to be updated every draw or they quickly become innacurate
  dlManager.updateMissileOrbits();

  // If in satellite view the orbit buffer needs to be updated every time
  if (cameraManager.cameraType.current == cameraManager.cameraType.satellite) orbitManager.updateOrbitBuffer(objectManager.lastSelectedSat());

  // Update Earth Direction
  earth.update();

  // Actually draw things now that math is done
  drawScene();

  // Update orbit currently being hovered over
  dlManager.updateHover();

  // callbacks at the end of the draw loop (this should be used more!)
  dlManager.onDrawLoopComplete(dlManager.drawLoopCallback);

  // If Demo Mode do stuff
  if (settingsManager.isDemoModeOn) _demoMode();

  // If in the process of taking a screenshot complete work for that
  if (settingsManager.screenshotMode) dlManager.screenShot();
};

var satSetInitCallBack = (satData) => {
  groupsManager = new GroupFactory(satSet, ColorScheme, settingsManager);
  selectSatManager.init(ColorScheme.group);
  orbitManager.init(cameraManager, groupsManager);
  lineManager = new LineFactory(gl, orbitManager.shader, getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly);
  starManager.init(lineManager, getIdFromStarName);
  satellite.initLookangles(satSet, satCruncher, sensorManager, groupsManager);
  uiManager.init(cameraManager, lineManager, starManager, groupsManager);
  satLinkManager.init(lineManager, satSet, sensorManager);
  setTimeout(function () {
    earth.loadHiRes();
    earth.loadHiResNight();
    // TOOD: Fix service worker with webpack
    // if (!settingsManager.offline && 'serviceWorker' in navigator) {
    //   navigator.serviceWorker.register('./serviceWorker.js').then(function () {
    //     console.debug(`[Service Worker] Installed!`);
    //   });
    // }
  }, 0);
  if (!settingsManager.disableUI) {
    searchBox.init(satData, groupsManager, orbitManager);
  }
  (function _checkIfEarthFinished() {
    if (earth.loaded) return;
    settingsManager.loadStr('coloring');
    setTimeout(function () {
      _checkIfEarthFinished();
    }, 250);
  })();
  let isFinalLoadingComplete = false;
  (function _finalLoadingSequence() {
    if (
      !isFinalLoadingComplete &&
      !earth.loaded
      // && settingsManager.cruncherReady
    ) {
      setTimeout(function () {
        _finalLoadingSequence();
      }, 250);
      return;
    }
    if (isFinalLoadingComplete) return;
    // NOTE:: This is called right after all the objects load on the screen.

    // Version Info Updated
    $('#version-info').html(settingsManager.versionNumber);
    $('#version-info').tooltip({
      delay: 50,
      html: settingsManager.versionDate,
      position: 'top',
    });

    satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc

    if ($(window).width() > $(window).height()) {
      settingsManager.mapHeight = $(window).width(); // Subtract 12 px for the scroll
      $('#map-image').width(settingsManager.mapHeight);
      settingsManager.mapHeight = (settingsManager.mapHeight * 3) / 4;
      $('#map-image').height(settingsManager.mapHeight);
      $('#map-menu').width($(window).width());
    } else {
      settingsManager.mapHeight = $(window).height() - 100; // Subtract 12 px for the scroll
      $('#map-image').height(settingsManager.mapHeight);
      settingsManager.mapHeight = (settingsManager.mapHeight * 4) / 3;
      $('#map-image').width(settingsManager.mapHeight);
      $('#map-menu').width($(window).width());
    }

    satLinkManager.idToSatnum();
  })();

  if (settingsManager.startWithOrbitsDisplayed) {
    setTimeout(function () {
      // Time Machine
      // orbitManager.historyOfSatellitesPlay();

      // All Orbits
      groupsManager.debris = groupsManager.createGroup('all', '');
      groupsManager.selectGroup(groupsManager.debris, orbitManager);
      satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
      groupsManager.debris.updateOrbits(orbitManager);
      settingsManager.isOrbitOverlayVisible = true;
    }, 0);
  }
};

dlManager.satCalculate = () => {
  if (objectManager.selectedSat !== -1) {
    dlManager.sat = satSet.getSat(objectManager.selectedSat);
    objectManager.lastSelectedSat(objectManager.selectedSat);
    if (!dlManager.sat.static) {
      cameraManager.camSnapToSat(dlManager.sat);

      if (dlManager.sat.missile || typeof meshManager == 'undefined') {
        settingsManager.selectedColor = [1.0, 0.0, 0.0, 1.0];
      } else {
        settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];
      }

      // If 3D Models Available, then update their position on the screen
      if (typeof meshManager !== 'undefined' && !dlManager.sat.missile) {
        // Try to reduce some jitter
        if (
          typeof meshManager.selectedSatPosition !== 'undefined' &&
          meshManager.selectedSatPosition.x > dlManager.sat.position.x - 1.0 &&
          meshManager.selectedSatPosition.x < dlManager.sat.position.x + 1.0 &&
          meshManager.selectedSatPosition.y > dlManager.sat.position.y - 1.0 &&
          meshManager.selectedSatPosition.y < dlManager.sat.position.y + 1.0 &&
          meshManager.selectedSatPosition.z > dlManager.sat.position.z - 1.0 &&
          meshManager.selectedSatPosition.z < dlManager.sat.position.z + 1.0
        ) {
          // Lerp to smooth difference between SGP4 and position+velocity
          meshManager.lerpPosition(dlManager.sat.position, timeManager.drawDt);
        } else {
          meshManager.updatePosition(dlManager.sat.position);
        }
      }
    }
    if (dlManager.sat.missile) orbitManager.setSelectOrbit(dlManager.sat.satId);
  }
  if (objectManager.selectedSat !== dlManager.lastSelectedSat) {
    selectSatManager.selectSat(objectManager.selectedSat, cameraManager);
    if (objectManager.selectedSat !== -1) {
      orbitManager.setSelectOrbit(objectManager.selectedSat);
      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
        lineManager.updateLineToSat(objectManager.selectedSat, satSet.getIdFromSensorName(sensorManager.currentSensor.name));
      }
      uiManager.updateMap();
    }
    if (objectManager.selectedSat === -1 && !isselectedSatNegativeOne) {
      orbitManager.clearSelectOrbit();
    }
    if (objectManager.selectedSat !== -1 || (objectManager.selectedSat == -1 && !isselectedSatNegativeOne)) {
      lineManager.drawWhenSelected();
    }
    dlManager.lastSelectedSat = objectManager.selectedSat;
  }
};

dlManager.updateMissileOrbits = () => {
  if (typeof missileManager != 'undefined' && missileManager.missileArray.length > 0) {
    for (dlManager.i = 0; dlManager.i < missileManager.missileArray.length; dlManager.i++) {
      orbitManager.updateOrbitBuffer(missileManager.missileArray[dlManager.i].id);
    }
  }
};

dlManager.screenShot = () => {
  webGlInit();
  if (settingsManager.queuedScreenshot) return;

  setTimeout(function () {
    let link = document.createElement('a');
    link.download = 'keeptrack.png';

    let d = new Date();
    let n = d.getFullYear();
    let copyrightStr;
    if (!settingsManager.copyrightOveride) {
      copyrightStr = `©${n} KEEPTRACK.SPACE`;
    } else {
      copyrightStr = '';
    }

    link.href = watermarkedDataURL(canvasDOM[0], copyrightStr);
    settingsManager.screenshotMode = false;
    settingsManager.queuedScreenshot = false;
    setTimeout(function () {
      link.click();
    }, 10);
    webGlInit();
  }, 200);
  settingsManager.queuedScreenshot = true;
};

var drawScene = () => {
  // Drawing ColorIds for Picking Satellites
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  dlManager.orbitsAbove();

  cameraManager.update(dlManager.sat, dlManager.sensorPos);

  gl.useProgram(gl.pickShaderProgram);
  gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(gl.pickShaderProgram.camMatrix, false, cameraManager.camMatrix);

  // gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (1000 / timeManager.dt > settingsManager.fpsThrottle1) {
    if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess) {
      sun.draw(pMatrix, cameraManager.camMatrix);
      moon.draw(pMatrix, cameraManager.camMatrix);
    }
  }
  if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess && cameraManager.cameraType.current !== cameraManager.cameraType.planetarium && cameraManager.cameraType.current !== cameraManager.cameraType.astronomy) {
    atmosphere.update(cameraManager.camPitch);
    atmosphere.draw(pMatrix, cameraManager.camMatrix);
  }
  earth.draw(pMatrix, cameraManager.camMatrix);
  satSet.draw(pMatrix, cameraManager.camMatrix);
  orbitManager.draw(pMatrix, cameraManager.camMatrix);

  lineManager.draw();

  if (objectManager.selectedSat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
    orbitManager.clearSelectOrbit();
    orbitManager.setSelectOrbit(objectManager.selectedSat);
  }

  // Draw Satellite Model if a satellite is selected and meshManager is loaded
  if (objectManager.selectedSat !== -1 && typeof meshManager != 'undefined' && meshManager.isReady) {
    let sat = dlManager.sat;
    // If 3D Models Available, then draw them on the screen
    if (typeof meshManager !== 'undefined' && (settingsManager.modelsOnSatelliteViewOverride || cameraManager.cameraType.current !== cameraManager.cameraType.satellite)) {
      if (!sat.static) {
        if (sat.SCC_NUM == 25544) {
          meshManager.models.iss.position = meshManager.selectedSatPosition;
          dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
          meshManager.drawObject(meshManager.models.iss, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
          return;
        }

        if (sat.OT == 1) {
          // Default Satellite
          if (sat.ON.slice(0, 5) == 'FLOCK' || sat.ON.slice(0, 5) == 'LEMUR') {
            meshManager.models.s3u.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.s3u, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }
          if (sat.ON.slice(0, 8) == 'STARLINK') {
            meshManager.models.starlink.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.starlink, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          if (sat.ON.slice(0, 10) == 'GLOBALSTAR') {
            meshManager.models.globalstar.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.globalstar, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          if (sat.ON.slice(0, 7) == 'IRIDIUM') {
            meshManager.models.iridium.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.iridium, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          if (sat.ON.slice(0, 7) == 'ORBCOMM') {
            meshManager.models.orbcomm.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.orbcomm, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          if (sat.ON.slice(0, 3) == 'O3B') {
            meshManager.models.o3b.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.o3b, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          // Is this a GPS Satellite (Called NAVSTAR)
          if (sat.ON.slice(0, 7) == 'NAVSTAR' || sat.ON.slice(10, 17) == 'NAVSTAR') {
            meshManager.models.gps.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.gps, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          // Is this a Galileo Satellite
          if (sat.ON.slice(0, 7) == 'GALILEO') {
            meshManager.models.galileo.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.galileo, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          // Is this a DSP Satellite?
          if (
            sat.SCC_NUM == '04630' ||
            sat.SCC_NUM == '05204' ||
            sat.SCC_NUM == '05851' ||
            sat.SCC_NUM == '06691' ||
            sat.SCC_NUM == '08482' ||
            sat.SCC_NUM == '08916' ||
            sat.SCC_NUM == '09803' ||
            sat.SCC_NUM == '11397' ||
            sat.SCC_NUM == '12339' ||
            sat.SCC_NUM == '13086' ||
            sat.SCC_NUM == '14930' ||
            sat.SCC_NUM == '15453' ||
            sat.SCC_NUM == '18583' ||
            sat.SCC_NUM == '20066' ||
            sat.SCC_NUM == '20929' ||
            sat.SCC_NUM == '21805' ||
            sat.SCC_NUM == '23435' ||
            sat.SCC_NUM == '24737' ||
            sat.SCC_NUM == '26356' ||
            sat.SCC_NUM == '26880' ||
            sat.SCC_NUM == '28158'
          ) {
            meshManager.models.dsp.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.dsp, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          // Is this an AEHF Satellite?
          if (sat.SCC_NUM == '36868' || sat.SCC_NUM == '38254' || sat.SCC_NUM == '39256' || sat.SCC_NUM == '43651' || sat.SCC_NUM == '44481' || sat.SCC_NUM == '45465') {
            meshManager.models.aehf.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.aehf, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }

          // Is this a 1U Cubesat?
          if (parseFloat(sat.R) < 0.1 && parseFloat(sat.R) > 0.04) {
            meshManager.models.s1u.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.s1u, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }
          if (parseFloat(sat.R) < 0.22 && parseFloat(sat.R) >= 0.1) {
            meshManager.models.s2u.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.s2u, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }
          if (parseFloat(sat.R) < 0.33 && parseFloat(sat.R) >= 0.22) {
            meshManager.models.s3u.position = meshManager.selectedSatPosition;
            dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
            meshManager.drawObject(meshManager.models.s3u, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
            return;
          }
          // Generic Model
          meshManager.models.sat2.position = meshManager.selectedSatPosition;
          dlManager.nadirYaw = Camera.longToYaw(sat.getTEARR().lon * mathValue.RAD2DEG, timeManager.selectedDate) + 180 * mathValue.DEG2RAD;
          meshManager.drawObject(meshManager.models.sat2, pMatrix, cameraManager.camMatrix, sat.isInSun(), dlManager.nadirYaw);
          return;
        }

        if (sat.OT == 2) {
          // Rocket Body
          meshManager.models.rocketbody.position = meshManager.selectedSatPosition;
          meshManager.drawObject(meshManager.models.rocketbody, pMatrix, cameraManager.camMatrix, sat.isInSun(), null);
          return;
        }

        if (sat.OT == 3) {
          if (sat.SCC_NUM <= 20000) {
            // Debris
            meshManager.models.debris0.position = meshManager.selectedSatPosition;
            meshManager.drawObject(meshManager.models.debris0, pMatrix, cameraManager.camMatrix, sat.isInSun(), null);
            return;
          } else if (sat.SCC_NUM <= 35000) {
            // Debris
            meshManager.models.debris1.position = meshManager.selectedSatPosition;
            meshManager.drawObject(meshManager.models.debris1, pMatrix, cameraManager.camMatrix, sat.isInSun(), null);
            return;
          } else if (sat.SCC_NUM > 35000) {
            // Debris
            meshManager.models.debris2.position = meshManager.selectedSatPosition;
            meshManager.drawObject(meshManager.models.debris2, pMatrix, cameraManager.camMatrix, sat.isInSun(), null);
            return;
          }
        }
      }
    }
  }
};

dlManager.isDrawOrbitsAbove = false;
dlManager.orbitsAbove = () => {
  if (cameraManager.cameraType.current == cameraManager.cameraType.astronomy || cameraManager.cameraType.current == cameraManager.cameraType.planetarium) {
    dlManager.sensorPos = satellite.calculateSensorPos(sensorManager.currentSensor);
    if (!dlManager.isDrawOrbitsAbove) {
      // Don't do this until the scene is redrawn with a new camera or thousands of satellites will
      // appear to be in the field of view
      dlManager.isDrawOrbitsAbove = true;
      return;
    }
    // Previously called showOrbitsAbove();
    if (!settingsManager.isSatLabelModeOn || cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
      if (isSatMiniBoxInUse) {
        $('#sat-minibox').html('');
      }
      isSatMiniBoxInUse = false;
      return;
    }

    if (sensorManager.currentSensor.lat == null) return;
    if (timeManager.now - satLabelModeLastTime < settingsManager.satLabelInterval) return;

    orbitManager.clearInViewOrbit();

    var sat;
    labelCount = 0;
    isHoverBoxVisible = true;

    hoverBoxOnSatMiniElements = document.getElementById('sat-minibox');

    /**
     * @todo Reuse hoverBoxOnSatMini DOM Elements
     * @body Currently are writing and deleting the nodes every draw element. Reusuing them with a transition effect will make it smoother
     */
    hoverBoxOnSatMiniElements.innerHTML = '';
    for (var i = 0; i < satSet.orbitalSats && labelCount < settingsManager.maxLabels; i++) {
      sat = satSet.getSatPosOnly(i);

      if (sat.static) continue;
      if (sat.missile) continue;
      if (sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false) continue;
      if (sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false) continue;
      if (sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false) continue;
      if (sat.inview && ColorScheme.objectTypeFlags.inFOV === false) continue;

      satSet.getScreenCoords(i, pMatrix, cameraManager.camMatrix, sat.position);
      if (satScreenPositionArray.error) continue;
      if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
      if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;

      // Draw Orbits
      if (!settingsManager.isShowSatNameNotOrbit) {
        orbitManager.addInViewOrbit(i);
      }

      // Draw Sat Labels
      // if (!settingsManager.enableHoverOverlay) continue
      satHoverMiniDOM = document.createElement('div');
      satHoverMiniDOM.id = 'sat-minibox-' + i;
      satHoverMiniDOM.textContent = sat.SCC_NUM;
      satHoverMiniDOM.setAttribute(
        'style',
        `display: block;
       position: absolute;
       left: ${satScreenPositionArray.x + 10}px;
       top: ${satScreenPositionArray.y}px
       `
      );
      hoverBoxOnSatMiniElements.appendChild(satHoverMiniDOM);
      labelCount++;
    }
    isSatMiniBoxInUse = true;
    satLabelModeLastTime = timeManager.now;
  } else {
    dlManager.sensorPos = null;
    dlManager.isDrawOrbitsAbove = false;
  }

  // Hide satMiniBoxes When Not in Use
  if (!settingsManager.isSatLabelModeOn || cameraManager.cameraType.current !== cameraManager.cameraType.planetarium) {
    if (isSatMiniBoxInUse) {
      satMiniBox.innerHTML = '';
    }
    isSatMiniBoxInUse = false;
  }
};

var currentSearchSats;
dlManager.updateHover = () => {
  if (!settingsManager.disableUI && !settingsManager.lowPerf) {
    currentSearchSats = searchBox.getLastResultGroup();
    if (typeof currentSearchSats !== 'undefined') {
      currentSearchSats = currentSearchSats['sats'];
      for (dlManager.i = 0; dlManager.i < currentSearchSats.length; dlManager.i++) {
        orbitManager.updateOrbitBuffer(currentSearchSats[dlManager.i].satId);
      }
    }
  }
  if (!settingsManager.disableUI && searchBox.isHovering()) {
    updateHoverSatId = searchBox.getHoverSat();
    satSet.getScreenCoords(updateHoverSatId, pMatrix, cameraManager.camMatrix);
    // if (!cameraManager.earthHitTest(gl, pickColorBuf, satScreenPositionArray.x, satScreenPositionArray.y)) {
    try {
      _hoverBoxOnSat(updateHoverSatId, satScreenPositionArray.x, satScreenPositionArray.y);
    } catch (e) {
      // Intentionally Empty
    }
    // } else {
    //   _hoverBoxOnSat(-1, 0, 0)
    // }
  } else {
    if (!isMouseMoving || cameraManager.isDragging || settingsManager.isMobileModeEnabled) {
      return;
    }

    // gl.readPixels in getSatIdFromCoord creates a lot of jank
    // Earlier in the loop we decided how much to throttle updateHover
    // if we skip it this loop, we want to still draw the last thing
    // it was looking at

    if (1000 / timeManager.dt < 30) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitBig;
    } else if (1000 / timeManager.dt < 50) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitSmall;
    } else {
      if (updateHoverDelayLimit > 1) --updateHoverDelayLimit;
    }

    if (++updateHoverDelay >= updateHoverDelayLimit) {
      updateHoverDelay = 0;
      mouseSat = getSatIdFromCoord(cameraManager.mouseX, cameraManager.mouseY);
    }

    if (settingsManager.enableHoverOrbits) {
      if (mouseSat !== -1) {
        orbitManager.setHoverOrbit(mouseSat);
      } else {
        orbitManager.clearHoverOrbit();
      }
      satSet.setHover(mouseSat);
    }
    if (settingsManager.enableHoverOverlay) {
      _hoverBoxOnSat(mouseSat, cameraManager.mouseX, cameraManager.mouseY);
    }
  }
};
let sat2;
var _hoverBoxOnSat = (satId, satX, satY) => {
  if (cameraManager.cameraType.current === cameraManager.cameraType.planetarium && !settingsManager.isDemoModeOn) {
    satHoverBoxDOM.css({ display: 'none' });
    if (satId === -1) {
      canvasDOM.css({ cursor: 'default' });
    } else {
      canvasDOM.css({ cursor: 'pointer' });
    }
    return;
  }
  if (satId === -1) {
    if (!isHoverBoxVisible || !settingsManager.enableHoverOverlay) return;
    if (objectManager.isStarManagerLoaded) {
      if (starManager.isConstellationVisible === true && !starManager.isAllConstellationVisible) starManager.clearConstellations();
    }
    // satHoverBoxDOM.html('(none)')
    satHoverBoxDOM.css({ display: 'none' });
    canvasDOM.css({ cursor: 'default' });
    isHoverBoxVisible = false;
  } else if (!cameraManager.isDragging && !!settingsManager.enableHoverOverlay) {
    var sat = satSet.getSatExtraOnly(satId);
    isHoverBoxVisible = true;
    if (sat.static || sat.isRadarData) {
      if (sat.type === 'Launch Facility') {
        var launchSite = objectManager.extractLaunchSite(sat.name);
        satHoverBoxNode1.textContent = launchSite.site + ', ' + launchSite.sitec;
        satHoverBoxNode2.innerHTML = sat.type + satellite.distance(sat, objectManager.selectedSatData) + '';
        satHoverBoxNode3.textContent = '';
      } else if (sat.isRadarData) {
        satHoverBoxNode1.innerHTML = 'Measurement: ' + sat.mId + '</br>Track: ' + sat.trackId + '</br>Object: ' + sat.objectId;
        if (sat.missileComplex !== -1) {
          satHoverBoxNode1.innerHTML += '</br>Missile Complex: ' + sat.missileComplex;
          satHoverBoxNode1.innerHTML += '</br>Missile Object: ' + sat.missileObject;
        }
        if (sat.satId !== -1) satHoverBoxNode1.innerHTML += '</br>Satellite: ' + sat.satId;
        if (typeof sat.rae == 'undefined' && sensorManager.currentSensor !== sensorManager.defaultSensor) {
          sat.rae = satellite.eci2Rae(sat.t, sat, sensorManager.currentSensor);
          sat.setRAE(sat.rae);
        }
        if (sensorManager.currentSensor !== sensorManager.defaultSensor) {
          let measurementDate = new Date(sat.t);
          satHoverBoxNode2.innerHTML =
            `JDAY: ${timeManager.getDayOfYear(measurementDate)} - ${measurementDate.toLocaleString('en-GB', { timeZone: 'UTC' }).slice(-8)}` +
            '</br>' +
            'R: ' +
            sat.rae.range.toFixed(2) +
            ' A: ' +
            sat.rae.az.toFixed(2) +
            ' E: ' +
            sat.rae.el.toFixed(2);
        } else {
          let measurementDate = new Date(sat.t);
          satHoverBoxNode2.innerHTML = `JDAY: ${timeManager.getDayOfYear(measurementDate)} - ${measurementDate.toLocaleString('en-GB', { timeZone: 'UTC' }).slice(-8)}`;
        }
        satHoverBoxNode3.innerHTML = 'RCS: ' + sat.rcs.toFixed(2) + ' m^2 (' + (10 ** (sat.rcs / 10)).toFixed(2) + ' dBsm)</br>Az Error: ' + sat.azError.toFixed(2) + '° El Error: ' + sat.elError.toFixed(2) + '°';
      } else if (sat.type === 'Control Facility') {
        satHoverBoxNode1.textContent = sat.name;
        satHoverBoxNode2.innerHTML = sat.typeExt + satellite.distance(sat, objectManager.selectedSatData) + '';
        satHoverBoxNode3.textContent = '';
      } else if (sat.type === 'Star') {
        if (starManager.findStarsConstellation(sat.name) !== null) {
          satHoverBoxNode1.innerHTML = sat.name + '</br>' + starManager.findStarsConstellation(sat.name);
        } else {
          satHoverBoxNode1.textContent = sat.name;
        }
        satHoverBoxNode2.innerHTML = sat.type;
        satHoverBoxNode3.innerHTML = 'RA: ' + sat.ra.toFixed(3) + ' deg </br> DEC: ' + sat.dec.toFixed(3) + ' deg';
        if (objectManager.lasthoveringSat !== satId) {
          starManager.drawConstellations(starManager.findStarsConstellation(sat.name));
        }
      } else {
        satHoverBoxNode1.textContent = sat.name;
        satHoverBoxNode2.innerHTML = sat.type + satellite.distance(sat, objectManager.selectedSatData) + '';
        satHoverBoxNode3.textContent = '';
      }
    } else if (sat.missile) {
      satHoverBoxNode1.innerHTML = sat.ON + '<br >' + sat.desc + '';
      satHoverBoxNode2.textContent = '';
      satHoverBoxNode3.textContent = '';
    } else {
      if (!settingsManager.enableHoverOverlay) return;
      // Use this as a default if no UI
      if (settingsManager.disableUI) {
        satHoverBoxNode1.textContent = sat.ON;
        satHoverBoxNode2.textContent = sat.SCC_NUM;
        satHoverBoxNode3.textContent = objectManager.extractCountry(sat.C);
      } else {
        if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null && isShowNextPass && isShowDistance) {
          satHoverBoxNode1.textContent = sat.ON;
          satHoverBoxNode2.textContent = sat.SCC_NUM;
          satHoverBoxNode3.innerHTML = satellite.nextpass(sat) + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
        } else if (isShowDistance) {
          satHoverBoxNode1.textContent = sat.ON;
          sat2 = satSet.getSat(objectManager.selectedSat);
          satHoverBoxNode2.innerHTML = sat.SCC_NUM + satellite.distance(sat, sat2) + '';
          if (sat2 !== null && sat !== sat2) {
            satHoverBoxNode3.innerHTML =
              'X: ' +
              sat.position.x.toFixed(2) +
              ' Y: ' +
              sat.position.y.toFixed(2) +
              ' Z: ' +
              sat.position.z.toFixed(2) +
              '</br>' +
              'ΔX: ' +
              (sat.velocity.x - sat2.velocity.x).toFixed(2) +
              'km/s ΔY: ' +
              (sat.velocity.y - sat2.velocity.y).toFixed(2) +
              'km/s ΔZ: ' +
              (sat.velocity.z - sat2.velocity.z).toFixed(2) +
              'km/s';
          } else {
            satHoverBoxNode3.innerHTML =
              'X: ' +
              sat.position.x.toFixed(2) +
              ' km' +
              ' Y: ' +
              sat.position.y.toFixed(2) +
              ' km' +
              ' Z: ' +
              sat.position.z.toFixed(2) +
              ' km' +
              '</br>' +
              'XDot: ' +
              sat.velocity.x.toFixed(2) +
              ' km/s' +
              ' YDot: ' +
              sat.velocity.y.toFixed(2) +
              ' km/s' +
              ' ZDot: ' +
              sat.velocity.z.toFixed(2) +
              ' km/s';
          }
        } else if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null && isShowNextPass) {
          satHoverBoxNode1.textContent = sat.ON;
          satHoverBoxNode2.textContent = sat.SCC_NUM;
          satHoverBoxNode3.textContent = satellite.nextpass(sat);
        } else {
          satHoverBoxNode1.textContent = sat.ON;
          satHoverBoxNode2.textContent = sat.SCC_NUM;
          satHoverBoxNode3.innerHTML =
            'X: ' + sat.position.x.toFixed(2) + ' Y: ' + sat.position.y.toFixed(2) + ' Z: ' + sat.position.z.toFixed(2) + '</br>X: ' + sat.velocity.x.toFixed(2) + ' Y: ' + sat.velocity.y.toFixed(2) + ' Z: ' + sat.velocity.z.toFixed(2);
        }
      }
    }

    objectManager.setLasthoveringSat = objectManager.hoveringSat;

    satHoverBoxDOM.css({
      'display': 'block',
      'text-align': 'center',
      'position': 'fixed',
      'left': satX + 20,
      'top': satY - 10,
    });
    canvasDOM.css({ cursor: 'pointer' });
  }
};
dlManager.onDrawLoopComplete = (cb) => {
  if (typeof cb == 'undefined') return;
  cb();
};

var demoModeLastTime = 0;
var _demoMode = () => {
  if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat == null) return;
  if (timeManager.now - demoModeLastTime < settingsManager.demoModeInterval) return;

  dlManager.demoModeLast = timeManager.now;

  if (dlManager.demoModeSatellite === satSet.getSatData().length) dlManager.demoModeSatellite = 0;
  let satData = satSet.getSatData();
  for (dlManager.i = dlManager.demoModeSatellite; dlManager.i < satData.length; dlManager.i++) {
    dlManager.sat = satData[dlManager.i];
    if (dlManager.sat.static) continue;
    if (dlManager.sat.missile) continue;
    // if (!dlManager.sat.inview) continue
    if (dlManager.sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false) continue;
    if (dlManager.sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false) continue;
    if (dlManager.sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false) continue;
    if (dlManager.sat.inview && ColorScheme.objectTypeFlags.inFOV === false) continue;
    satSet.getScreenCoords(dlManager.i, pMatrix, cameraManager.camMatrix);
    if (satScreenPositionArray.error) continue;
    if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
    if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;
    _hoverBoxOnSat(dlManager.i, satScreenPositionArray.x, satScreenPositionArray.y);
    orbitManager.setSelectOrbit(dlManager.i);
    dlManager.demoModeSatellite = dlManager.i + 1;
    return;
  }
};

var webGlInit = () => {
  db.log('webGlInit');
  let can = canvasDOM[0];
  let dpi;
  if (typeof settingsManager.dpi != 'undefined') {
    dpi = settingsManager.dpi;
  } else {
    dpi = window.devicePixelRatio;
    settingsManager.dpi = dpi;
  }

  // Using minimum allows the canvas to be full screen without fighting with
  // scrollbars
  let cw = document.documentElement.clientWidth || 0;
  let iw = window.innerWidth || 0;
  var vw = Math.min.apply(null, [cw, iw].filter(Boolean));
  var vh = Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  // If taking a screenshot then resize no matter what to get high resolution
  if (settingsManager.screenshotMode) {
    can.width = settingsManager.hiResWidth;
    can.height = settingsManager.hiResHeight;
  } else {
    // If not autoresizing then don't do anything to the canvas
    if (settingsManager.isAutoResizeCanvas) {
      // If this is a cellphone avoid the keyboard forcing resizes but
      // always resize on rotation
      if (settingsManager.isMobileModeEnabled) {
        // Changes more than 35% of height but not due to rotation are likely
        // the keyboard! Ignore them
        if ((((vw - can.width) / can.width) * 100 < 1 && ((vh - can.height) / can.height) * 100 < 1) || mobile.isRotationEvent || mobile.forceResize) {
          can.width = vw;
          can.height = vh;
          mobile.forceResize = false;
          mobile.isRotationEvent = false;
        }
      } else {
        can.width = vw;
        can.height = vh;
      }
    }
  }

  if (settingsManager.satShader.isUseDynamicSizing) {
    settingsManager.satShader.dynamicSize = (1920 / can.width) * settingsManager.satShader.dynamicSizeScalar * settingsManager.dpi;
    settingsManager.satShader.minSize = Math.max(settingsManager.satShader.minSize, settingsManager.satShader.dynamicSize);
  }

  if (!settingsManager.disableUI) {
    gl =
      can.getContext('webgl', {
        alpha: false,
        premultipliedAlpha: false,
        desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        stencil: false,
      }) || // Or...
      can.getContext('experimental-webgl', {
        alpha: false,
        premultipliedAlpha: false,
        desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        stencil: false,
      });
  } else {
    gl =
      can.getContext('webgl', {
        alpha: false,
        desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
      }) || // Or...
      can.getContext('experimental-webgl', {
        alpha: false,
        desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
      });
  }
  if (!gl) {
    db.log('browserUnsupported');
    $('#canvas-holder').hide();
    $('#no-webgl').css('display', 'block');
  }

  gl.getExtension('EXT_frag_depth');

  gl.viewport(0, 0, can.width, can.height);

  gl.enable(gl.DEPTH_TEST);

  // Reinitialize GPU Picking Buffers
  initGPUPicking();

  window.gl = gl;
};

var pick = {};
pick.shader = {
  vert: `
        attribute vec3 aPos;
        attribute vec3 aColor;
        attribute float aPickable;

        uniform mat4 uCamMatrix;
        uniform mat4 uMvMatrix;
        uniform mat4 uPMatrix;

        varying vec3 vColor;

        void main(void) {
        float dotSize = 16.0;
        vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);
        gl_Position = position;
        gl_PointSize = dotSize * aPickable;
        vColor = aColor * aPickable;
        }
    `,
  frag: `
        precision mediump float;

        varying vec3 vColor;

        void main(void) {
            gl_FragColor = vec4(vColor, 1.0);
        }
    `,
};

var initGPUPicking = () => {
  var pFragShader = gl.createShader(gl.FRAGMENT_SHADER);
  var pFragCode = pick.shader.frag;
  gl.shaderSource(pFragShader, pFragCode);
  gl.compileShader(pFragShader);

  var pVertShader = gl.createShader(gl.VERTEX_SHADER);
  var pVertCode = pick.shader.vert;
  gl.shaderSource(pVertShader, pVertCode);
  gl.compileShader(pVertShader);

  var pickShaderProgram = gl.createProgram();
  gl.attachShader(pickShaderProgram, pVertShader);
  gl.attachShader(pickShaderProgram, pFragShader);
  gl.linkProgram(pickShaderProgram);

  pickShaderProgram.aPos = gl.getAttribLocation(pickShaderProgram, 'aPos');
  pickShaderProgram.aColor = gl.getAttribLocation(pickShaderProgram, 'aColor');
  pickShaderProgram.aPickable = gl.getAttribLocation(pickShaderProgram, 'aPickable');
  pickShaderProgram.uCamMatrix = gl.getUniformLocation(pickShaderProgram, 'uCamMatrix');
  pickShaderProgram.uMvMatrix = gl.getUniformLocation(pickShaderProgram, 'uMvMatrix');
  pickShaderProgram.uPMatrix = gl.getUniformLocation(pickShaderProgram, 'uPMatrix');

  gl.pickShaderProgram = pickShaderProgram;

  pickFb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb);

  pickTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, pickTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  var rb = gl.createRenderbuffer(); // create RB to store the depth buffer
  gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

  gl.pickFb = pickFb;

  pickColorBuf = new Uint8Array(4);

  pMatrix = glm.mat4.create();
  glm.mat4.perspective(pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);
  var eciToOpenGlMat = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
  glm.mat4.mul(pMatrix, pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat
};

var _unProject = (mx, my) => {
  glScreenX = (mx / gl.drawingBufferWidth) * 2 - 1.0;
  glScreenY = 1.0 - (my / gl.drawingBufferHeight) * 2;
  screenVec = [glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords

  comboPMat = glm.mat4.create();
  glm.mat4.mul(comboPMat, pMatrix, cameraManager.camMatrix);
  invMat = glm.mat4.create();
  glm.mat4.invert(invMat, comboPMat);
  worldVec = glm.vec4.create();
  glm.vec4.transformMat4(worldVec, screenVec, invMat);

  return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
};
var getSatIdFromCoord = (x, y) => {
  // NOTE: gl.readPixels is a huge bottleneck
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
  gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickColorBuf);
  return ((pickColorBuf[2] << 16) | (pickColorBuf[1] << 8) | pickColorBuf[0]) - 1;
};

// Raycasting in getEarthScreenPoint would provide a lot of powerful (but slow) options later
var getEarthScreenPoint = (x, y) => {
  rayOrigin = cameraManager.getCamPos();
  ptThru = _unProject(x, y);

  rayDir = glm.vec3.create();
  glm.vec3.subtract(rayDir, ptThru, rayOrigin); // rayDir = ptThru - rayOrigin
  glm.vec3.normalize(rayDir, rayDir);

  toCenterVec = glm.vec3.create();
  glm.vec3.scale(toCenterVec, rayOrigin, -1); // toCenter is just -camera pos because center is at [0,0,0]
  dParallel = glm.vec3.dot(rayDir, toCenterVec);

  longDir = glm.vec3.create();
  glm.vec3.scale(longDir, rayDir, dParallel); // longDir = rayDir * distParallel
  glm.vec3.add(ptThru, rayOrigin, longDir); // ptThru is now on the plane going through the center of sphere
  dPerp = glm.vec3.len(ptThru);

  dSubSurf = Math.sqrt(mathValue.RADIUS_OF_EARTH * mathValue.RADIUS_OF_EARTH - dPerp * dPerp);
  dSurf = dParallel - dSubSurf;

  ptSurf = glm.vec3.create();
  glm.vec3.scale(ptSurf, rayDir, dSurf);
  glm.vec3.add(ptSurf, ptSurf, rayOrigin);

  return ptSurf;
};

$(document).ready(function () {
  // Start the initialization before doing anything else. The webworkers and
  // textures needs to start loading as fast as possible.
  initializeKeepTrack();

  // 2020 Key listener
  // TODO: Migrate most things from UI to Here
  $(window).on({
    keydown: function (e) {
      if (e.ctrlKey === true || e.metaKey === true) cameraManager.isCtrlPressed = true;
    },
  });
  $(window).on({
    keyup: function (e) {
      if (e.ctrlKey === false && e.metaKey === false) cameraManager.isCtrlPressed = false;
    },
  });

  if (settingsManager.disableWindowScroll || settingsManager.disableNormalEvents) {
    window.addEventListener(
      'scroll',
      function () {
        window.scrollTo(0, 0);
        return false;
      },
      { passive: false }
    );

    // left: 37, up: 38, right: 39, down: 40,
    // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
    var keys = { 37: 1, 38: 1, 39: 1, 40: 1 };

    var preventDefault = (e) => {
      e.preventDefault();
    };

    var preventDefaultForScrollKeys = (e) => {
      if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
      }
    };

    // modern Chrome requires { passive: false } when adding event
    var supportsPassive = false;
    try {
      window.addEventListener(
        'test',
        null,
        Object.defineProperty({}, 'passive', {
          // eslint-disable-next-line getter-return
          get: function () {
            supportsPassive = true;
          },
        })
      );
    } catch (e) {
      // Intentional
    }

    var wheelOpt = supportsPassive ? { passive: false } : false;
    var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

    // call this to Disable
    // eslint-disable-next-line no-unused-vars
    var disableScroll = () => {
      window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
      window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
      window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
      window.addEventListener('keydown', preventDefaultForScrollKeys, false);
    };

    // call this to Enable
    // eslint-disable-next-line no-unused-vars
    var enableScroll = () => {
      window.removeEventListener('DOMMouseScroll', preventDefault, false);
      window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
      window.removeEventListener('touchmove', preventDefault, wheelOpt);
      window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
    };
  }

  if (settingsManager.disableZoomControls || settingsManager.disableNormalEvents) {
    var stopKeyZoom = (event) => {
      if (event.ctrlKey == true && (event.which == '61' || event.which == '107' || event.which == '173' || event.which == '109' || event.which == '187' || event.which == '189')) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', stopKeyZoom, { passive: false });
    window.addEventListener('mousewheel', stopWheelZoom, { passive: false });
    window.addEventListener('DOMMouseScroll', stopWheelZoom, { passive: false });

    var stopWheelZoom = (event) => {
      if (event.ctrlKey == true) {
        event.preventDefault();
      }
    };
  }

  // Needed?
  if (settingsManager.disableWindowTouchMove) {
    window.addEventListener(
      'touchmove',
      function (event) {
        event.preventDefault();
      },
      { passive: false }
    );
  }

  // Resizing Listener
  $(window).on('resize', function () {
    if (!settingsManager.disableUI) {
      uiManager.resize2DMap();
    }
    mobile.checkMobileMode();
    if (!settingsManager.disableUI) {
      if (settingsManager.screenshotMode) {
        bodyDOM.css('overflow', 'visible');
        $('#canvas-holder').css('overflow', 'visible');
        $('#canvas-holder').width = 3840;
        $('#canvas-holder').height = 2160;
        bodyDOM.width = 3840;
        bodyDOM.height = 2160;
      } else {
        bodyDOM.css('overflow', 'hidden');
        $('#canvas-holder').css('overflow', 'hidden');
      }
    }
    if (!settingsManager.isResizing) {
      window.setTimeout(function () {
        settingsManager.isResizing = false;
        webGlInit();
      }, 500);
    }
    settingsManager.isResizing = true;
  });

  $(window).mousedown(function (evt) {
    // Camera Manager Events
    {
      if (!settingsManager.disableCameraControls) {
        // Middle Mouse Button MMB
        if (evt.button === 1) {
          cameraManager.isLocalRotate = true;
          cameraManager.localRotateStartPosition = cameraManager.localRotateCurrent;
          if (cameraManager.isShiftPressed) {
            cameraManager.isLocalRotateRoll = true;
            cameraManager.isLocalRotateYaw = false;
          } else {
            cameraManager.isLocalRotateRoll = false;
            cameraManager.isLocalRotateYaw = true;
          }
          evt.preventDefault();
        }

        // Right Mouse Button RMB
        if (evt.button === 2 && (cameraManager.isShiftPressed || cameraManager.isCtrlPressed)) {
          cameraManager.isPanning = true;
          cameraManager.panStartPosition = cameraManager.panCurrent;
          if (cameraManager.isShiftPressed) {
            cameraManager.isScreenPan = false;
            cameraManager.isWorldPan = true;
          } else {
            cameraManager.isScreenPan = true;
            cameraManager.isWorldPan = false;
          }
        }
      }
    }
  });

  $(window).mouseup(function (evt) {
    // Camera Manager Events
    {
      if (!settingsManager.disableCameraControls) {
        if (evt.button === 1) {
          cameraManager.isLocalRotate = false;
          cameraManager.localRotateRoll = false;
          cameraManager.localRotateYaw = false;
        }
        if (evt.button === 2) {
          cameraManager.isPanning = false;
          cameraManager.isScreenPan = false;
          cameraManager.isWorldPan = false;
        }
      }
    }
  });
  (function _canvasController() {
    db.log('_canvasController');
    var latLon;
    canvasDOM.on('touchmove', function (evt) {
      if (settingsManager.disableNormalEvents) {
        evt.preventDefault();
      }
      if (isPinching && typeof evt.originalEvent.touches[0] != 'undefined' && typeof evt.originalEvent.touches[1] != 'undefined') {
        var currentPinchDistance = Math.hypot(evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX, evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
        if (isNaN(currentPinchDistance)) return;

        deltaPinchDistance = (startPinchDistance - currentPinchDistance) / maxPinchSize;
        let zoomTarget = cameraManager.zoomTarget;
        zoomTarget += deltaPinchDistance * (settingsManager.cameraMovementSpeed / 10);
        zoomTarget = Math.min(Math.max(zoomTarget, 0.0001), 1); // Force between 0 and 1
        cameraManager.zoomTarget = zoomTarget;
      } else {
        // Dont Move While Zooming
        cameraManager.mouseX = evt.originalEvent.touches[0].clientX;
        cameraManager.mouseY = evt.originalEvent.touches[0].clientY;
        if (cameraManager.isDragging && cameraManager.screenDragPoint[0] !== cameraManager.mouseX && cameraManager.screenDragPoint[1] !== cameraManager.mouseY) {
          dragHasMoved = true;
          cameraManager.camAngleSnappedOnSat = false;
          cameraManager.camZoomSnappedOnSat = false;
        }
        isMouseMoving = true;
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(function () {
          isMouseMoving = false;
        }, 250);
      }
    });
    canvasDOM.on('mousemove', function (evt) {
      cameraManager.mouseX = evt.clientX - (canvasDOM.position().left - window.scrollX);
      cameraManager.mouseY = evt.clientY - (canvasDOM.position().top - window.scrollY);
      if (cameraManager.isDragging && cameraManager.screenDragPoint[0] !== cameraManager.mouseX && cameraManager.screenDragPoint[1] !== cameraManager.mouseY) {
        dragHasMoved = true;
        cameraManager.camAngleSnappedOnSat = false;
        cameraManager.camZoomSnappedOnSat = false;
      }
      isMouseMoving = true;
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(function () {
        isMouseMoving = false;
      }, 150);
    });

    if (settingsManager.disableUI) {
      canvasDOM.on('wheel', function () {
        satHoverBoxDOM.css({
          display: 'none',
        });
      });
    }
    if (!settingsManager.disableUI) {
      canvasDOM.on('wheel', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }

        var delta = evt.originalEvent.deltaY;
        if (evt.originalEvent.deltaMode === 1) {
          delta *= 33.3333333;
        }

        if (delta < 0) {
          cameraManager.isZoomIn = true;
        } else {
          cameraManager.isZoomIn = false;
        }

        cameraManager.rotateEarth(false);

        if (settingsManager.isZoomStopsSnappedOnSat || objectManager.selectedSat == -1) {
          let zoomTarget = cameraManager.zoomTarget;
          zoomTarget += delta / 100 / 50 / cameraManager.speedModifier; // delta is +/- 100
          zoomTarget = Math.min(Math.max(zoomTarget, 0.001), 1); // Force between 0 and 1
          cameraManager.zoomTarget = zoomTarget;
          cameraManager.ecLastZoom = zoomTarget;
          cameraManager.camZoomSnappedOnSat = false;
        } else {
          if (settingsManager.camDistBuffer < 300 || settingsManager.nearZoomLevel == -1) {
            settingsManager.camDistBuffer += delta / 7.5; // delta is +/- 100
            settingsManager.camDistBuffer = Math.min(Math.max(settingsManager.camDistBuffer, 30), 300);
            settingsManager.nearZoomLevel = cameraManager.zoomLevel;
          }
          if (settingsManager.camDistBuffer >= 300) {
            let zoomTarget = cameraManager.zoomTarget;
            zoomTarget += delta / 100 / 50 / cameraManager.speedModifier; // delta is +/- 100
            zoomTarget = Math.min(Math.max(zoomTarget, 0.001), 1); // Force between 0 and 1
            cameraManager.zoomTarget = zoomTarget;
            cameraManager.ecLastZoom = zoomTarget;
            cameraManager.camZoomSnappedOnSat = false;
            if (zoomTarget < settingsManager.nearZoomLevel) {
              cameraManager.camZoomSnappedOnSat = true;
              settingsManager.camDistBuffer = 200;
            }
          }
        }

        if (
          cameraManager.cameraType.current === cameraManager.cameraType.planetarium ||
          cameraManager.cameraType.current === cameraManager.cameraType.fps ||
          cameraManager.cameraType.current === cameraManager.cameraType.satellite ||
          cameraManager.cameraType.current === cameraManager.cameraType.astronomy
        ) {
          settingsManager.fieldOfView += delta * 0.0002;
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
          if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) settingsManager.fieldOfView = settingsManager.fieldOfViewMin;
          webGlInit();
        }
      });
      canvasDOM.on('click', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        rightBtnMenuDOM.hide();
        uiManager.clearRMBSubMenu();
        if ($('#colorbox').css('display') === 'block') {
          $.colorbox.close(); // Close colorbox if it was open
        }
      });
      canvasDOM.on('mousedown', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }

        if (cameraManager.speedModifier === 1) {
          settingsManager.cameraMovementSpeed = 0.003;
          settingsManager.cameraMovementSpeedMin = 0.005;
        }

        if (evt.button === 2) {
          dragPoint = getEarthScreenPoint(cameraManager.mouseX, cameraManager.mouseY);
          latLon = satellite.eci2ll(dragPoint[0], dragPoint[1], dragPoint[2]);
        }
        cameraManager.screenDragPoint = [cameraManager.mouseX, cameraManager.mouseY];
        cameraManager.dragStartPitch = cameraManager.camPitch;
        cameraManager.dragStartYaw = cameraManager.camYaw;
        if (evt.button === 0) {
          cameraManager.isDragging = true;
        }
        // debugLine.set(dragPoint, getCamPos())
        cameraManager.camSnapMode = false;
        if (!settingsManager.disableUI) {
          cameraManager.rotateEarth(false);
        }
        rightBtnMenuDOM.hide();
        uiManager.clearRMBSubMenu();

        // TODO: Make uiManager.updateURL() a setting that is disabled by default
        uiManager.updateURL();
      });
      canvasDOM.on('touchstart', function (evt) {
        settingsManager.cameraMovementSpeed = 0.0001;
        settingsManager.cameraMovementSpeedMin = 0.0001;
        if (evt.originalEvent.touches.length > 1) {
          // Two Finger Touch
          isPinching = true;
          startPinchDistance = Math.hypot(evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX, evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
          // _pinchStart(evt)
        } else {
          // Single Finger Touch
          mobile.startMouseX = evt.originalEvent.touches[0].clientX;
          mobile.startMouseY = evt.originalEvent.touches[0].clientY;
          cameraManager.mouseX = evt.originalEvent.touches[0].clientX;
          cameraManager.mouseY = evt.originalEvent.touches[0].clientY;
          mouseSat = getSatIdFromCoord(cameraManager.mouseX, cameraManager.mouseY);
          settingsManager.cameraMovementSpeed = Math.max(0.005 * cameraManager.zoomLevel, settingsManager.cameraMovementSpeedMin);
          cameraManager.screenDragPoint = [cameraManager.mouseX, cameraManager.mouseY];
          // dragPoint = getEarthScreenPoint(x, y)
          dragPoint = cameraManager.screenDragPoint; // Ignore the earth on mobile
          cameraManager.dragStartPitch = cameraManager.camPitch;
          cameraManager.dragStartYaw = cameraManager.camYaw;
          // debugLine.set(dragPoint, getCamPos())
          cameraManager.isDragging = true;
          touchStartTime = Date.now();
          // If you hit the canvas hide any popups
          _hidePopUps();
          cameraManager.camSnapMode = false;
          if (!settingsManager.disableUI) {
            cameraManager.rotateEarth(false);
          }

          // TODO: Make updateUrl() a setting that is disabled by default
          uiManager.updateURL();
        }
      });
      canvasDOM.on('mouseup', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        if (!dragHasMoved) {
          if (settingsManager.isMobileModeEnabled) {
            mouseSat = getSatIdFromCoord(cameraManager.mouseX, cameraManager.mouseY);
          }
          clickedSat = mouseSat;
          if (evt.button === 0) {
            // Left Mouse Button Clicked
            if (cameraManager.cameraType.current === cameraManager.cameraType.satellite) {
              if (clickedSat !== -1 && !satSet.getSatExtraOnly(clickedSat).static) {
                objectManager.setSelectedSat(clickedSat);
              }
            } else {
              objectManager.setSelectedSat(clickedSat);
            }
          }
          if (evt.button === 2) {
            // Right Mouse Button Clicked
            if (!cameraManager.isCtrlPressed && !cameraManager.isShiftPressed) {
              _openRmbMenu();
            }
          }
        }
        // Repaint the theme to ensure it is the right color
        settingsManager.themes.retheme();
        // Force the serach bar to get repainted because it gets overwrote a lot
        settingsManager.themes.redThemeSearch();
        dragHasMoved = false;
        cameraManager.isDragging = false;
        if (!settingsManager.disableUI) {
          cameraManager.rotateEarth(false);
        }
      });
    }

    var _openRmbMenu = () => {
      let numMenuItems = 0;
      $('#clear-lines-rmb').hide();

      // View
      $('#view-info-rmb').hide();
      $('#view-sensor-info-rmb').hide();
      $('#view-sat-info-rmb').hide();
      $('#view-related-sats-rmb').hide();
      $('#view-curdops-rmb').hide();
      $('#view-24dops-rmb').hide();

      // Edit
      $('#edit-sat-rmb').hide();

      // Create
      $('#create-observer-rmb ').hide();
      $('#create-sensor-rmb').hide();

      // Draw
      $('#line-eci-axis-rmb').hide();
      $('#line-sensor-sat-rmb').hide();
      $('#line-earth-sat-rmb').hide();
      $('#line-sat-sat-rmb').hide();

      // Earth
      $('#earth-low-rmb').hide();
      $('#earth-high-rmb').hide();
      $('#earth-vec-rmb').hide();

      // Reset Camera
      // $('#reset-camera-rmb').hide();

      // Colors Always Present

      var isViewDOM = false;
      var isCreateDOM = false;
      var isDrawDOM = false;
      var isEarthDOM = false;

      rightBtnSaveDOM.show();
      rightBtnViewDOM.hide();
      rightBtnEditDOM.hide();
      rightBtnCreateDOM.hide();
      rightBtnDrawDOM.hide();
      rightBtnEarthDOM.hide();

      if (lineManager.getLineListLen() > 0) {
        $('#clear-lines-rmb').show();
      }

      if (mouseSat !== -1) {
        if (typeof clickedSat == 'undefined') return;
        let sat = satSet.getSat(clickedSat);
        if (typeof sat == 'undefined' || sat == null) return;
        if (typeof satSet.getSat(clickedSat).type == 'undefined' || satSet.getSat(clickedSat).type !== 'Star') {
          rightBtnViewDOM.show();
          isViewDOM = true;
          numMenuItems++;
        }
        if (!satSet.getSat(clickedSat).static) {
          $('#edit-sat-rmb').show();
          rightBtnEditDOM.show();
          numMenuItems++;

          $('#view-sat-info-rmb').show();
          $('#view-related-sats-rmb').show();

          if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null && sensorManager.whichRadar !== 'CUSTOM') {
            $('#line-sensor-sat-rmb').show();
          }
          $('#line-earth-sat-rmb').show();
          $('#line-sat-sat-rmb').show();
          rightBtnDrawDOM.show();
          isDrawDOM = true;
          numMenuItems++;
        } else {
          if (satSet.getSat(clickedSat).type === 'Optical' || satSet.getSat(clickedSat).type === 'Mechanical' || satSet.getSat(clickedSat).type === 'Ground Sensor Station' || satSet.getSat(clickedSat).type === 'Phased Array Radar') {
            $('#view-sensor-info-rmb').show();
          }
        }
      } else {
        // Intentional
      }

      // Is this the Earth?
      //
      // This not the Earth

      if (typeof latLon == 'undefined' || isNaN(latLon.latitude) || isNaN(latLon.longitude)) {
        // Intentional
      } else {
        // This is the Earth
        if (!isViewDOM) {
          rightBtnViewDOM.show();
          ++numMenuItems;
        }
        $('#view-info-rmb').show();
        $('#view-curdops-rmb').show();
        $('#view-24dops-rmb').show();

        if (!isCreateDOM) {
          rightBtnCreateDOM.show();
          ++numMenuItems;
        }
        $('#create-observer-rmb ').show();
        $('#create-sensor-rmb').show();

        if (!isDrawDOM) {
          rightBtnDrawDOM.show();
          ++numMenuItems;
        }
        $('#line-eci-axis-rmb').show();

        if (!isEarthDOM) {
          rightBtnEarthDOM.show();
          ++numMenuItems;
        }

        $('#earth-nasa-rmb').show();
        $('#earth-blue-rmb').show();
        $('#earth-low-rmb').show();
        $('#earth-high-no-clouds-rmb').show();
        $('#earth-vec-rmb').show();
        if (settingsManager.nasaImages == true) $('#earth-nasa-rmb').hide();
        if (settingsManager.trusatImages == true) $('#earth-trusat-rmb').hide();
        if (settingsManager.blueImages == true) $('#earth-blue-rmb').hide();
        if (settingsManager.lowresImages == true) $('#earth-low-rmb').hide();
        if (settingsManager.hiresNoCloudsImages == true) $('#earth-high-no-clouds-rmb').hide();
        if (settingsManager.vectorImages == true) $('#earth-vec-rmb').hide();
      }

      rightBtnMenuDOM.show();
      satHoverBoxDOM.hide();
      // Might need to be adjusted if number of menus change
      var offsetX = cameraManager.mouseX < canvasDOM.innerWidth() / 2 ? 0 : -100;
      var offsetY = cameraManager.mouseY < canvasDOM.innerHeight() / 2 ? 0 : numMenuItems * -50;
      rightBtnMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': cameraManager.mouseX + offsetX,
        'top': cameraManager.mouseY + offsetY,
      });
    };

    canvasDOM.on('touchend', function () {
      let touchTime = Date.now() - touchStartTime;

      if (touchTime > 150 && !isPinching && Math.abs(mobile.startMouseX - cameraManager.mouseX) < 50 && Math.abs(mobile.startMouseY - cameraManager.mouseY) < 50) {
        _openRmbMenu();
        mouseSat = -1;
      }

      if (isPinching) {
        // pinchEnd(e)
        isPinching = false;
      }
      cameraManager.mouseX = 0;
      cameraManager.mouseY = 0;
      dragHasMoved = false;
      cameraManager.isDragging = false;
      if (!settingsManager.disableUI) {
        cameraManager.rotateEarth(false);
      }
    });

    $('#nav-wrapper *').on('click', function () {
      _hidePopUps();
    });
    $('#nav-wrapper').on('click', function () {
      _hidePopUps();
    });
    $('#nav-footer *').on('click', function () {
      _hidePopUps();
    });
    $('#nav-footer').on('click', function () {
      _hidePopUps();
    });
    $('#ui-wrapper *').on('click', function () {
      _hidePopUps();
    });
    var _hidePopUps = () => {
      if (settingsManager.isPreventColorboxClose == true) return;
      rightBtnMenuDOM.hide();
      uiManager.clearRMBSubMenu();
      if ($('#colorbox').css('display') === 'block') {
        $.colorbox.close(); // Close colorbox if it was open
      }
    };

    if (settingsManager.startWithFocus) {
      canvasDOM.attr('tabIndex', 0);
      canvasDOM.trigger('focus');
    }

    if (!settingsManager.disableUI) {
      bodyDOM.on('keypress', (e) => {
        uiManager.keyHandler(e);
      }); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keydown', (e) => {
        if (uiManager.isCurrentlyTyping) return;
        cameraManager.keyDownHandler(e);
      }); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keyup', (e) => {
        if (uiManager.isCurrentlyTyping) return;
        cameraManager.keyUpHandler(e);
      }); // On Key Press Event Run _keyHandler Function

      rightBtnSaveMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnViewMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnEditMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnCreateMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnDrawMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnColorsMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnEarthMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      $('#reset-camera-rmb').on('click', function (e) {
        _rmbMenuActions(e);
      });
      $('#clear-screen-rmb').on('click', function (e) {
        _rmbMenuActions(e);
      });
      $('#clear-lines-rmb').on('click', function (e) {
        _rmbMenuActions(e);
      });

      rightBtnSaveDOM.hover(() => {
        rightBtnSaveDOMDropdown();
      });
      rightBtnSaveDOM.click(() => {
        rightBtnSaveDOMDropdown();
      });
      rightBtnSaveMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnSaveMenuDOM.hide();
      });

      rightBtnViewDOM.hover(() => {
        rightBtnViewDOMDropdown();
      });
      rightBtnViewDOM.click(() => {
        rightBtnViewDOMDropdown();
      });
      rightBtnViewMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnViewMenuDOM.hide();
      });

      rightBtnEditDOM.hover(() => {
        rightBtnEditDOMDropdown();
      });
      rightBtnEditDOM.click(() => {
        rightBtnEditDOMDropdown();
      });
      rightBtnEditMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnEditMenuDOM.hide();
      });

      rightBtnCreateDOM.hover(() => {
        rightBtnCreateDOMDropdown();
      });
      rightBtnCreateDOM.click(() => {
        rightBtnCreateDOMDropdown();
      });
      rightBtnCreateMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnCreateMenuDOM.hide();
      });

      rightBtnDrawDOM.hover(() => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawDOM.click(() => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnDrawMenuDOM.hide();
      });

      rightBtnColorsDOM.hover(() => {
        rightBtnColorsDOMDropdown();
      });
      rightBtnColorsDOM.click(() => {
        rightBtnColorsDOMDropdown();
      });
      rightBtnEarthMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnEarthMenuDOM.hide();
      });

      rightBtnEarthDOM.hover(() => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthDOM.click(() => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnEarthMenuDOM.hide();
      });
    }
    var rightBtnSaveDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnSaveDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnSaveMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnSaveDOM.offset().left + offsetX,
        'top': rightBtnSaveDOM.offset().top,
      });
      if (rightBtnSaveDOM.offset().top !== 0) {
        rightBtnSaveMenuDOM.show();
      } else {
        rightBtnSaveMenuDOM.hide();
      }
    };
    var rightBtnViewDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnViewDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnViewMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnViewDOM.offset().left + offsetX,
        'top': rightBtnViewDOM.offset().top,
      });
      if (rightBtnViewDOM.offset().top !== 0) {
        rightBtnViewMenuDOM.show();
      } else {
        rightBtnViewMenuDOM.hide();
      }
    };
    var rightBtnEditDOMDropdown = () => {
      uiManager.clearRMBSubMenu();

      var offsetX = rightBtnEditDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnEditMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnEditDOM.offset().left + offsetX,
        'top': rightBtnEditDOM.offset().top,
      });
      if (rightBtnEditMenuDOM.offset().top !== 0) {
        rightBtnEditMenuDOM.show();
      } else {
        rightBtnEditMenuDOM.hide();
      }
    };
    var rightBtnCreateDOMDropdown = () => {
      uiManager.clearRMBSubMenu();

      var offsetX = rightBtnCreateDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnCreateMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnCreateDOM.offset().left + offsetX,
        'top': rightBtnCreateDOM.offset().top,
      });
      if (rightBtnCreateMenuDOM.offset().top !== 0) {
        rightBtnCreateMenuDOM.show();
      } else {
        rightBtnCreateMenuDOM.hide();
      }
    };
    var rightBtnDrawDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnDrawDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnDrawMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnDrawDOM.offset().left + offsetX,
        'top': rightBtnDrawDOM.offset().top,
      });
      if (rightBtnDrawDOM.offset().top !== 0) {
        rightBtnDrawMenuDOM.show();
      } else {
        rightBtnDrawMenuDOM.hide();
      }
    };
    var rightBtnColorsDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnColorsDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnColorsMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnColorsDOM.offset().left + offsetX,
        'top': rightBtnColorsDOM.offset().top,
      });
      if (rightBtnColorsDOM.offset().top !== 0) {
        rightBtnColorsMenuDOM.show();
      } else {
        rightBtnColorsMenuDOM.hide();
      }
    };
    var rightBtnEarthDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnEarthDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnEarthMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnEarthDOM.offset().left + offsetX,
        'top': rightBtnEarthDOM.offset().top,
      });
      if (rightBtnEarthDOM.offset().top !== 0) {
        rightBtnEarthMenuDOM.show();
      } else {
        rightBtnEarthMenuDOM.hide();
      }
    };
    var _rmbMenuActions = (e) => {
      // No Right Click Without UI
      if (settingsManager.disableUI) return;

      var targetId = e.target.id;
      if (e.target.tagName == 'A') {
        targetId = e.target.parentNode.id;
      }
      if (e.target.tagName == 'UL') {
        targetId = e.target.firstChild.id;
      }
      switch (targetId) {
        case 'save-hd-rmb':
          uiManager.saveHiResPhoto('hd');
          break;
        case 'save-4k-rmb':
          uiManager.saveHiResPhoto('4k');
          break;
        case 'save-8k-rmb':
          uiManager.saveHiResPhoto('8k');
          break;
        case 'view-info-rmb':
          M.toast({
            html: 'Lat: ' + latLon.latitude.toFixed(3) + '<br/>Lon: ' + latLon.longitude.toFixed(3),
          });
          break;
        case 'view-sat-info-rmb':
          objectManager.setSelectedSat(clickedSat);
          break;
        case 'view-sensor-info-rmb':
          objectManager.setSelectedSat(clickedSat);
          $('#menu-sensor-info').on('click', () => {});
          break;
        case 'view-related-sats-rmb':
          var intldes = satSet.getSatExtraOnly(clickedSat).intlDes;
          var searchStr = intldes.slice(0, 8);
          uiManager.doSearch(searchStr);
          break;
        case 'view-curdops-rmb':
          var gpsDOP = satellite.getDOPs(latLon.latitude, latLon.longitude, 0);
          M.toast({
            html: 'HDOP: ' + gpsDOP.HDOP + '<br/>VDOP: ' + gpsDOP.VDOP + '<br/>PDOP: ' + gpsDOP.PDOP + '<br/>GDOP: ' + gpsDOP.GDOP + '<br/>TDOP: ' + gpsDOP.TDOP,
          });
          break;
        case 'view-24dops-rmb':
          if (!isDOPMenuOpen) {
            $('#dops-lat').val(latLon.latitude.toFixed(3));
            $('#dops-lon').val(latLon.longitude.toFixed(3));
            $('#dops-alt').val(0);
            $('#dops-el').val(settingsManager.gpsElevationMask);
            uiManager.bottomIconPress({
              currentTarget: { id: 'menu-dops' },
            });
          } else {
            uiManager.hideSideMenus();
            isDOPMenuOpen = true;
            $('#loading-screen').fadeIn(1000, function () {
              $('#dops-lat').val(latLon.latitude.toFixed(3));
              $('#dops-lon').val(latLon.longitude.toFixed(3));
              $('#dops-alt').val(0);
              $('#dops-el').val(settingsManager.gpsElevationMask);
              var lat = $('#dops-lat').val() * 1;
              var lon = $('#dops-lon').val() * 1;
              var alt = $('#dops-alt').val() * 1;
              // var el = $('#dops-el').val() * 1;
              satellite.getDOPsTable(lat, lon, alt);
              $('#menu-dops').addClass('bmenu-item-selected');
              $('#loading-screen').fadeOut('slow');
              $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            });
          }
          break;
        case 'edit-sat-rmb':
          objectManager.setSelectedSat(clickedSat);
          if (!sMM.isEditSatMenuOpen()) {
            uiManager.bottomIconPress({
              currentTarget: { id: 'menu-editSat' },
            });
          }
          break;
        case 'create-sensor-rmb':
          $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-customSensor').addClass('bmenu-item-selected');
          sMM.isCustomSensorMenuOpen(true);
          $('#cs-telescope').on('click', () => {});
          $('#cs-lat').val(latLon.latitude);
          $('#cs-lon').val(latLon.longitude);
          $('#cs-hei').val(0);
          $('#cs-type').val('Optical');
          // $('#cs-telescope').prop('checked', false)
          $('#cs-minaz').val(0);
          $('#cs-maxaz').val(360);
          $('#cs-minel').val(10);
          $('#cs-maxel').val(90);
          $('#cs-minrange').val(0);
          $('#cs-maxrange').val(1000000);
          $('#customSensor').on('submit', () => {});
          break;
        case 'reset-camera-rmb':
          // if (cameraManager.cameraType.current == cameraManager.cameraType.fixedToSat) {
          //   // NOTE: Maybe a reset flag to move back to original position over time?
          //   cameraManager.camPitch = 0;
          //   cameraManager.camYaw = 0;
          // }
          cameraManager.panReset = true;
          cameraManager.localRotateReset = true;
          cameraManager.ftsRotateReset = true;
          break;
        case 'clear-lines-rmb':
          lineManager.clear();
          if (objectManager.isStarManagerLoaded) {
            starManager.isAllConstellationVisible = false;
          }
          break;
        case 'line-eci-axis-rmb':
          lineManager.create('ref', [10000, 0, 0], 'r');
          lineManager.create('ref', [0, 10000, 0], 'g');
          lineManager.create('ref', [0, 0, 10000], 'b');
          break;
        case 'line-earth-sat-rmb':
          lineManager.create('sat', clickedSat, 'p');
          break;
        case 'line-sensor-sat-rmb':
          // Sensor always has to be #2
          lineManager.create('sat5', [clickedSat, satSet.getIdFromSensorName(sensorManager.currentSensor.name)], 'p');
          break;
        case 'line-sat-sat-rmb':
          lineManager.create('sat3', [clickedSat, objectManager.selectedSat], 'p');
          break;
        case 'create-observer-rmb':
          $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-customSensor').addClass('bmenu-item-selected');
          sMM.setCustomSensorMenuOpen(true);
          $('#cs-lat').val(latLon.latitude);
          $('#cs-lon').val(latLon.longitude);
          $('#cs-hei').val(0);
          $('#cs-type').val('Observer');
          $('#customSensor').on('submit', () => {});
          uiManager.legendMenuChange('sunlight');
          satSet.setColorScheme(ColorScheme.sunlight, true);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          settingsManager.isForceColorScheme = true;
          satCruncher.postMessage({
            isSunlightView: true,
          });
          break;
        case 'colors-default-rmb':
          if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
            uiManager.legendMenuChange('default');
          } else {
            uiManager.legendMenuChange('default');
          }
          satSet.setColorScheme(ColorScheme.default, true);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'colors-sunlight-rmb':
          uiManager.legendMenuChange('sunlight');
          satSet.setColorScheme(ColorScheme.sunlight, true);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          settingsManager.isForceColorScheme = true;
          satCruncher.postMessage({
            isSunlightView: true,
          });
          break;
        case 'colors-country-rmb':
          uiManager.legendMenuChange('countries');
          satSet.setColorScheme(ColorScheme.countries);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'colors-velocity-rmb':
          uiManager.legendMenuChange('velocity');
          satSet.setColorScheme(ColorScheme.velocity);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'colors-ageOfElset-rmb':
          uiManager.legendMenuChange('ageOfElset');
          satSet.setColorScheme(ColorScheme.ageOfElset);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'earth-blue-rmb':
          settingsManager.blueImages = true;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'blue');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-nasa-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = true;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'nasa');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-trusat-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = true;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'trusat');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-low-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = true;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'low');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-high-rmb':
          $('#loading-screen').fadeIn(1000, function () {
            settingsManager.blueImages = false;
            settingsManager.nasaImages = false;
            settingsManager.trusatImages = false;
            settingsManager.lowresImages = false;
            settingsManager.hiresImages = true;
            settingsManager.hiresNoCloudsImages = false;
            settingsManager.vectorImages = false;
            localStorage.setItem('lastMap', 'high');
            earth.init(gl);
            earth.loadHiRes();
            earth.loadHiResNight();
            $('#loading-screen').fadeOut('slow');
          });
          break;
        case 'earth-high-no-clouds-rmb':
          $('#loading-screen').fadeIn(1000, function () {
            settingsManager.blueImages = false;
            settingsManager.nasaImages = false;
            settingsManager.trusatImages = false;
            settingsManager.lowresImages = false;
            settingsManager.hiresImages = false;
            settingsManager.hiresNoCloudsImages = true;
            settingsManager.vectorImages = false;
            localStorage.setItem('lastMap', 'high-nc');
            earth.init(gl);
            earth.loadHiRes();
            earth.loadHiResNight();
            $('#loading-screen').fadeOut('slow');
          });
          break;
        case 'earth-vec-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = true;
          localStorage.setItem('lastMap', 'vec');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'clear-screen-rmb':
          (function clearScreenRMB() {
            // Clear Lines first
            lineManager.clear();
            if (objectManager.isStarManagerLoaded) {
              starManager.isAllConstellationVisible = false;
            }

            // Now clear everything else
            uiManager.doSearch('');
            uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#menu-space-stations').removeClass('bmenu-item-selected');

            if (
              (!objectManager.isSensorManagerLoaded || sensorManager.currentSensor.lat != null) &&
              cameraManager.cameraType.current !== cameraManager.cameraType.planetarium &&
              cameraManager.cameraType.current !== cameraManager.cameraType.astronomy
            ) {
              uiManager.legendMenuChange('default');
            }

            objectManager.setSelectedSat(-1);
          })();
          break;
      }
      rightBtnMenuDOM.hide();
      uiManager.clearRMBSubMenu();
    };
  })();
});

// Enable the Limited UI
if (settingsManager.disableUI && settingsManager.enableLimitedUI) {
  async () => {
    const { default: satSet } = await import('@app/js/satSet.js');
    const { default: ColorScheme } = await import('@app/js/color-scheme.js');
    const { default: orbitManager } = await import('@app/js/orbitManager.js');

    if (document.getElementById('keeptrack-canvas').tagName !== 'CANVAS') {
      console.warn('There is no canvas with id "keeptrack-canvas!!!"');
      console.log('Here is a list of canvas found:');
      console.log(document.getElementsByTagName('canvas'));
      if (document.getElementById('keeptrack-canvas').tagName == 'DIV') {
        console.warn('There IS a div with id "keeptrack-canvas"!!!');
      }
    } else {
      console.log('Found the keeptrack canvas:');
      console.log(document.getElementById('keeptrack-canvas'));
    }

    // Add Required DOMs
    document.getElementById('keeptrack-canvas').parentElement.innerHTML += `
    <div id="countries-btn">
    </div>
    <div id="orbit-btn">
    </div>
    <div id="time-machine-btn">
    </div>`;
    $(document).ready(function () {
      M.AutoInit();
      var countriesBtnDOM = $('#countries-btn');
      countriesBtnDOM.on('click', function () {
        if (settingsManager.currentColorScheme == ColorScheme.countries) {
          satSet.setColorScheme(ColorScheme.default);
        } else {
          satSet.setColorScheme(ColorScheme.countries);
        }
      });
      var orbitBtnDOM = $('#orbit-btn');
      settingsManager.isOrbitOverlayVisible = false;
      orbitBtnDOM.on('click', function () {
        if (!settingsManager.isOrbitOverlayVisible) {
          orbitManager.isTimeMachineVisible = false;
          isTimeMachine = false;
          groupsManager.debris = groupsManager.createGroup('all', '');
          groupsManager.selectGroup(groupsManager.debris, orbitManager);
          // satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
          // groupsManager.debris.updateOrbits(orbitManager);
          settingsManager.isOrbitOverlayVisible = true;
        } else {
          orbitManager.isTimeMachineVisible = false;
          isTimeMachine = false;
          groupsManager.clearSelect();
          orbitManager.clearHoverOrbit();
          satSet.setColorScheme(ColorScheme.default, true);
          settingsManager.isOrbitOverlayVisible = false;
        }
      });
      var timeMachineDOM = $('#time-machine-btn');
      var isTimeMachine = false;
      timeMachineDOM.on('click', function () {
        if (isTimeMachine) {
          isTimeMachine = false;
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = false;
          orbitManager.isTimeMachineVisible = false;

          settingsManager.colors.transparent = orbitManager.tempTransColor;
          groupsManager.clearSelect();
          satSet.setColorScheme(ColorScheme.default, true); // force color recalc

          $('#menu-time-machine').removeClass('bmenu-item-selected');
        } else {
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = true;
          orbitManager.isTimeMachineVisible = true;
          $('#menu-time-machine').addClass('bmenu-item-selected');
          orbitManager.historyOfSatellitesPlay();
          isTimeMachine = true;
        }
      });
    });
  };
}

export { dlManager, gl, webGlInit };

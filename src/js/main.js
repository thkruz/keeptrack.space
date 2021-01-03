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

/**
 * @todo Remove jQuery
 * @body Removing as Many jQuery references as possible will make testing easier REF: https://tobiasahlin.com/blog/move-from-jquery-to-vanilla-javascript/
 */

import * as $ from 'jquery';
// eslint-disable-next-line sort-imports
import 'jquery-ui-bundle';
import '@app/js/keeptrack-foot.js';
import 'materialize-css';
import * as glm from '@app/js/lib/gl-matrix.js';
import { Atmosphere, LineFactory, Moon, earth, sun } from '@app/js/sceneManager/sceneManager.js';
import { getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly, satSet } from '@app/js/satSet.js';
import { uiInput, uiManager } from '@app/js/uiManager/uiManager.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { Dots } from './dots';
import { GroupFactory } from '@app/js/groupsManager/group-factory.js';
import { dlManager } from '@app/js/dlManager/dlManager.js';
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

// Common Variables
var gl, lineManager, groupsManager;
var pMatrix = glm.mat4.create();

var cameraManager, dotsManager;
// EVERYTHING SHOULD START HERE
$(document).ready(async function initalizeKeepTrack() {
  timeManager.propRealTime = Date.now(); // assumed same as value in Worker, not passing
  // A lot of things rely on a satellite catalog
  await mobile.checkMobileMode();
  await webGlInit();
  settingsManager.loadStr('dots');
  cameraManager = new Camera();
  dotsManager = new Dots(gl);
  satSet.init(dotsManager);
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

  groupsManager = new GroupFactory(satSet, ColorScheme, settingsManager);
  await orbitManager.init(cameraManager, groupsManager);
  searchBox.init(satSet, groupsManager, orbitManager, dotsManager);
  lineManager = new LineFactory(gl, orbitManager.shader, getIdFromSensorName, getIdFromStarName, getSat, getSatPosOnly);
  satLinkManager.init(lineManager, satSet, sensorManager);
  starManager.init(lineManager, getIdFromStarName);
  uiManager.init(cameraManager, lineManager, starManager, groupsManager, satSet, orbitManager, groupsManager, ColorScheme);
  await satellite.initLookangles(satSet, satCruncher, sensorManager, groupsManager);
  dotsManager.updateSizeBuffer(satSet.satData);
  await radarDataManager.init(sensorManager, timeManager, satSet, satCruncher, satellite);
  satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
  satLinkManager.idToSatnum(satSet);
  startWithOrbits();

  uiInput.init(cameraManager, webGlInit, mobile, objectManager, satellite, satSet, lineManager, sensorManager, starManager, ColorScheme, satCruncher, earth, gl, uiManager, pMatrix, dotsManager);

  await dlManager.init(
    uiInput,
    moon,
    pMatrix,
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
    webGlInit,
    timeManager,
    dotsManager
  );
  dlManager.drawLoop();
});

var startWithOrbits = async () => {
  if (settingsManager.startWithOrbitsDisplayed) {
    // All Orbits
    groupsManager.debris = groupsManager.createGroup('all', '');
    groupsManager.selectGroup(groupsManager.debris, orbitManager);
    satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
    groupsManager.debris.updateOrbits(orbitManager);
    settingsManager.isOrbitOverlayVisible = true;
  }
};

/* WebGl Code */
var webGlInit = async () => {
  const canvasDOM = $('#keeptrack-canvas');
  const can = canvasDOM[0];
  const dpi = typeof settingsManager.dpi != 'undefined' ? settingsManager.dpi : window.devicePixelRatio;
  settingsManager.dpi = dpi;

  // Using minimum allows the canvas to be full screen without fighting with scrollbars
  let cw = document.documentElement.clientWidth || 0;
  let iw = window.innerWidth || 0;
  let vw = Math.min.apply(null, [cw, iw].filter(Boolean));
  let vh = Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0);

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
    $('#canvas-holder').hide();
    $('#no-webgl').css('display', 'block');
  }

  gl.getExtension('EXT_frag_depth');
  gl.getExtension('OES_vertex_array_object');

  gl.viewport(0, 0, can.width, can.height);

  gl.enable(gl.DEPTH_TEST);

  pMatrix = glm.mat4.create();
  glm.mat4.perspective(pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);

  // This converts everything from 3D space to ECI (z and y planes are swapped)
  const eciToOpenGlMat = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
  glm.mat4.mul(pMatrix, pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat

  window.gl = gl;
};

export { gl, webGlInit };

import * as $ from 'jquery';
import { isselectedSatNegativeOne, selectSatManager } from '@app/js/selectSat.js';
import { mathValue, watermarkedDataURL } from '@app/js/helpers.js';
import { satScreenPositionArray, satSet } from '@app/js/satSet.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { missileManager } from '@app/modules/missileManager.js';

const canvasDOM = $('#keeptrack-canvas');
const satHoverBoxNode1 = document.getElementById('sat-hoverbox1');
const satHoverBoxNode2 = document.getElementById('sat-hoverbox2');
const satHoverBoxNode3 = document.getElementById('sat-hoverbox3');
const satHoverBoxDOM = $('#sat-hoverbox');
const satMiniBox = document.querySelector('#sat-minibox');

var updateHoverDelay = 0;
var updateHoverDelayLimit = 1;
var satLabelModeLastTime = 0;
var isSatMiniBoxInUse = false;
var labelCount;
var hoverBoxOnSatMiniElements = [];
var satHoverMiniDOM;
var isShowNextPass = false;
let updateHoverSatId;
let isHoverBoxVisible = false;
let isShowDistance = true;

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

var uiInput, moon, pMatrix, sun, searchBox, atmosphere, starManager, satellite, ColorScheme, cameraManager, objectManager, orbitManager, meshManager, earth, sensorManager, uiManager, lineManager, gl, webGlInit, timeManager, dotsManager;
dlManager.init = (
  uiInputRef,
  moonRef,
  pMatrixRef,
  sunRef,
  searchBoxRef,
  atmosphereRef,
  starManagerRef,
  satelliteRef,
  ColorSchemeRef,
  cameraManagerRef,
  objectManagerRef,
  orbitManagerRef,
  meshManagerRef,
  earthRef,
  sensorManagerRef,
  uiManagerRef,
  lineManagerRef,
  glRef,
  webGlInitRef,
  timeManagerRef,
  dotsManagerRef
) => {
  uiInput = uiInputRef;
  moon = moonRef;
  pMatrix = pMatrixRef;
  sun = sunRef;
  searchBox = searchBoxRef;
  atmosphere = atmosphereRef;
  starManager = starManagerRef;
  satellite = satelliteRef;
  ColorScheme = ColorSchemeRef;
  cameraManager = cameraManagerRef;
  objectManager = objectManagerRef;
  orbitManager = orbitManagerRef;
  meshManager = meshManagerRef;
  earth = earthRef;
  sensorManager = sensorManagerRef;
  uiManager = uiManagerRef;
  lineManager = lineManagerRef;
  gl = glRef;
  webGlInit = webGlInitRef;
  timeManager = timeManagerRef;
  dotsManager = dotsManagerRef;
};

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
  if (settingsManager.isDemoModeOn) dlManager.demoMode();

  // If in the process of taking a screenshot complete work for that
  if (settingsManager.screenshotMode) dlManager.screenShot();
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
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  dlManager.orbitsAbove();

  cameraManager.update(dlManager.sat, dlManager.sensorPos);

  // This should be moved TODO
  gl.useProgram(dotsManager.pickingProgram);
  gl.uniformMatrix4fv(dotsManager.pickingProgram.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(dotsManager.pickingProgram.camMatrix, false, cameraManager.camMatrix);

  // gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (1000 / timeManager.dt > settingsManager.fpsThrottle1) {
    if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess) {
      sun.draw(pMatrix, cameraManager.camMatrix);
      moon.draw(pMatrix, cameraManager.camMatrix);
    }
  }
  if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess && cameraManager.cameraType.current !== cameraManager.cameraType.planetarium && cameraManager.cameraType.current !== cameraManager.cameraType.astronomy) {
    atmosphere.draw(pMatrix, cameraManager);
  }
  earth.draw(pMatrix, cameraManager.camMatrix, dotsManager);

  // Update Draw Positions
  dotsManager.updatePositionBuffer(satSet, timeManager);

  // Draw Dots
  dotsManager.draw(pMatrix, cameraManager, settingsManager.currentColorScheme);

  // Draw GPU Picking Overlay -- This is what lets us pick a satellite
  dotsManager.drawPicking(pMatrix, cameraManager);

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
    if (!uiInput.isMouseMoving || cameraManager.isDragging || settingsManager.isMobileModeEnabled) {
      return;
    }

    // gl.readPixels in uiInput.getSatIdFromCoord creates a lot of jank
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
      uiInput.mouseSat = uiInput.getSatIdFromCoord(cameraManager.mouseX, cameraManager.mouseY);
    }

    if (settingsManager.enableHoverOrbits) {
      if (uiInput.mouseSat !== -1) {
        orbitManager.setHoverOrbit(uiInput.mouseSat);
      } else {
        orbitManager.clearHoverOrbit();
      }
      satSet.setHover(uiInput.mouseSat);
    }
    if (settingsManager.enableHoverOverlay) {
      _hoverBoxOnSat(uiInput.mouseSat, cameraManager.mouseX, cameraManager.mouseY);
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
  if (typeof cb == 'undefined' || cb == null) return;
  cb();
};

var demoModeLastTime = 0;
dlManager.demoMode = () => {
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

export { dlManager };

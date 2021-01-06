import * as glm from '@app/js/lib/external/gl-matrix.js';
import { isselectedSatNegativeOne, selectSatManager } from '@app/js/selectSat.js';
import { satScreenPositionArray, satSet } from '@app/js/satSet/satSet.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { meshManager } from '@app/js/dlManager/meshManager.js';
import { missileManager } from '@app/js/missileManager/missileManager.js';
import { pPM as postProcessingManager } from '@app/js/dlManager/post-processing.js';
import { sceneManager } from '@app/js/dlManager/sceneManager/sceneManager.js';
import { timeManager } from '@app/js/timeManager.js';

const satHoverBoxNode1 = document.getElementById('sat-hoverbox1');
const satHoverBoxNode2 = document.getElementById('sat-hoverbox2');
const satHoverBoxNode3 = document.getElementById('sat-hoverbox3');
const satHoverBoxDOM = document.getElementById('sat-hoverbox');
const satMiniBox = document.getElementById('sat-minibox');

var updateHoverDelay = 0;
var updateHoverDelayLimit = 3;
var satLabelModeLastTime = 0;
var isSatMiniBoxInUse = false;
var labelCount;
var hoverBoxOnSatMiniElements = [];
var satHoverMiniDOM;
var isShowNextPass = false;
let updateHoverSatId;
let isHoverBoxVisible = false;
let isShowDistance = true;
var gl;

var dlManager = {
  i: 0,
  demoModeSatellite: 0,
  demoModeLastTime: 0,
  dt: null,
  t0: 0,
  isShowFPS: false,
  drawLoopCallback: null,
  gaussianAmt: 0,
  setDrawLoopCallback: (cb) => {
    dlManager.drawLoopCallback = cb;
  },
};

var groupsManager, uiInput, starManager, satellite, ColorScheme, cameraManager, objectManager, orbitManager, sensorManager, uiManager, lineManager, dotsManager;
dlManager.init = (groupsManagerRef, uiInputRef, starManagerRef, satelliteRef, ColorSchemeRef, cameraManagerRef, objectManagerRef, orbitManagerRef, sensorManagerRef, uiManagerRef, lineManagerRef, dotsManagerRef) => {
  uiInput = uiInputRef;
  starManager = starManagerRef;
  satellite = satelliteRef;
  ColorScheme = ColorSchemeRef;
  cameraManager = cameraManagerRef;
  objectManager = objectManagerRef;
  orbitManager = orbitManagerRef;
  sensorManager = sensorManagerRef;
  uiManager = uiManagerRef;
  lineManager = lineManagerRef;
  dotsManager = dotsManagerRef;
  groupsManager = groupsManagerRef;

  startWithOrbits();
};

// Reinitialize the canvas on mobile rotation
window.addEventListener('orientationchange', function () {
  // console.log('rotate');
  dlManager.isRotationEvent = true;
});

dlManager.canvas = document.getElementById('keeptrack-canvas');
dlManager.glInit = async () => {
  // dlManager Scope
  gl = dlManager.canvas.getContext('webgl', {
    alpha: false,
    premultipliedAlpha: false,
    desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
    stencil: false,
  });

  dlManager.resizeCanvas();

  gl.getExtension('EXT_frag_depth');
  gl.enable(gl.DEPTH_TEST);

  postProcessingManager.init(gl);

  dlManager.postProcessingManager = postProcessingManager;
  dlManager.gl = gl;
  return gl;
};

dlManager.loadScene = async () => {
  await sceneManager.earth.init(gl);
  sceneManager.earth.loadHiRes();
  sceneManager.earth.loadHiResNight();
  meshManager.init(gl, sceneManager.earth);
  sceneManager.atmosphere = new sceneManager.classes.Atmosphere(gl, sceneManager.earth, settingsManager);
  await sceneManager.sun.init(gl, sceneManager.earth);
  sceneManager.moon = new sceneManager.classes.Moon(gl, sceneManager.sun);

  // Make this public
  dlManager.sceneManager = sceneManager;
};

dlManager.resizeCanvas = () => {
  // Using minimum allows the canvas to be full screen without fighting with scrollbars
  let cw = document.documentElement.clientWidth || 0;
  let iw = window.innerWidth || 0;
  let vw = Math.min.apply(null, [cw, iw].filter(Boolean));
  let vh = Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  // If taking a screenshot then resize no matter what to get high resolution
  if (gl.canvas.width != vw || gl.canvas.height != vh) {
    // If not autoresizing then don't do anything to the canvas
    if (settingsManager.isAutoResizeCanvas) {
      // If this is a cellphone avoid the keyboard forcing resizes but
      // always resize on rotation
      if (settingsManager.isMobileModeEnabled) {
        // Changes more than 35% of height but not due to rotation are likely
        // the keyboard! Ignore them
        if ((((vw - dlManager.canvas.width) / dlManager.canvas.width) * 100 < 1 && ((vh - dlManager.canvas.height) / dlManager.canvas.height) * 100 < 1) || dlManager.isRotationEvent) {
          dlManager.canvas.width = vw;
          dlManager.canvas.height = vh;
          dlManager.isRotationEvent = false;
        }
        // No Canvas Change
        return;
      } else {
        dlManager.canvas.width = vw;
        dlManager.canvas.height = vh;
      }
    }
  } else {
    if (settingsManager.screenshotMode) {
      dlManager.canvas.width = settingsManager.hiResWidth;
      dlManager.canvas.height = settingsManager.hiResHeight;
    } else {
      // No screen size change and not taking a photo
      return;
    }
  }

  gl.viewport(0, 0, dlManager.canvas.width, dlManager.canvas.height);
  dlManager.calculatePMatrix(settingsManager);
  dlManager.isPostProcessingResizeNeeded = true;
};

dlManager.calculatePMatrix = (settingsManager) => {
  dlManager.pMatrix = glm.mat4.create();
  glm.mat4.perspective(dlManager.pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);

  // This converts everything from 3D space to ECI (z and y planes are swapped)
  const eciToOpenGlMat = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
  glm.mat4.mul(dlManager.pMatrix, dlManager.pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat
};

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

dlManager.drawLoop = (preciseDt) => {
  // Restart the draw loop when ready to draw again
  requestAnimationFrame(dlManager.drawLoop);
  if (dlManager.sceneManager.earth.isUseHiRes && dlManager.sceneManager.earth.isHiResReady !== true) return;

  // Record milliseconds since last drawLoop - default is 0
  dlManager.dt = preciseDt - dlManager.t0 || 0;
  // Record last Draw Time for Calculating Difference
  dlManager.t0 = preciseDt;
  // Display it if that settings is enabled
  if (dlManager.isShowFPS) console.log(1000 / timeManager.dt);
  // Update official time for everyone else
  if (!dlManager.isUpdateTimeThrottle) {
    dlManager.isUpdateTimeThrottle = true;
    timeManager.setNow(Date.now(), dlManager.dt);
    setTimeout(() => {
      dlManager.isUpdateTimeThrottle = false;
    }, 500);
  }

  dlManager.checkIfPostProcessingRequired();

  // Do any per frame calculations
  dlManager.updateLoop();

  // Actually draw things now that math is done
  dlManager.resizeCanvas();
  dlManager.clearFrameBuffers();

  // Sun, Moon, and Atmosphere
  dlManager.drawOptionalScenery();

  sceneManager.earth.draw(dlManager.pMatrix, cameraManager.camMatrix, dotsManager, postProcessingManager.curBuffer);

  // Update Draw Positions
  dotsManager.updatePositionBuffer(satSet, timeManager);

  // Draw Dots
  dotsManager.draw(dlManager.pMatrix, cameraManager, settingsManager.currentColorScheme, postProcessingManager.curBuffer);

  // Draw GPU Picking Overlay -- This is what lets us pick a satellite
  dotsManager.drawGpuPickingFrameBuffer(dlManager.pMatrix, cameraManager, settingsManager.currentColorScheme);

  orbitManager.draw(dlManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer);

  lineManager.draw();

  if (objectManager.selectedSat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
    orbitManager.clearSelectOrbit();
    orbitManager.setSelectOrbit(objectManager.selectedSat);
  }

  // Draw Satellite Model if a satellite is selected and meshManager is loaded
  // if (!settingsManager.modelsOnSatelliteViewOverride && cameraManager.cameraType.current !== cameraManager.cameraType.satellite) {
  if (!settingsManager.modelsOnSatelliteViewOverride) {
    meshManager.draw(dlManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer);
  }

  // Update orbit currently being hovered over
  // Only if last frame was 50 FPS or more readpixels used to determine which satellite is hovered
  // is the biggest performance hit and we should throttle that. Maybe we should limit the picking frame buffer too?
  if (1000 / timeManager.dt > 50) {
    dlManager.updateHover();
  }

  // Do Post Processing
  if (dlManager.isNeedPostProcessing) {
    if (postProcessingManager.isGaussianNeeded) {
      postProcessingManager.programs.gaussian.uniformValues.radius = Math.min(0.5, dlManager.gaussianAmt / 500);
      postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
      postProcessingManager.switchFrameBuffer();
      postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, null);
    } else {
      // Test
    }
  }

  // callbacks at the end of the draw loop (this should be used more!)
  dlManager.onDrawLoopComplete(dlManager.drawLoopCallback);

  // If Demo Mode do stuff
  if (settingsManager.isDemoModeOn) dlManager.demoMode();

  // If in the process of taking a screenshot complete work for that
  if (settingsManager.screenshotMode) dlManager.screenShot();
};

dlManager.updateLoop = () => {
  // Calculate changes related to satellites objects
  dlManager.satCalculate();

  // Calculate camera changes needed since last draw
  cameraManager.calculate(objectManager.selectedSat, dlManager.dt);

  // Missile oribts have to be updated every draw or they quickly become innacurate
  dlManager.updateMissileOrbits();

  // If in satellite view the orbit buffer needs to be updated every time
  if (cameraManager.cameraType.current == cameraManager.cameraType.satellite) orbitManager.updateOrbitBuffer(objectManager.lastSelectedSat());

  sceneManager.sun.update();

  // Update Earth Direction
  sceneManager.earth.update();

  satSet.sunECI = sceneManager.sun.realXyz;

  dlManager.orbitsAbove(); //dlManager.sensorPos is set here for the Camera Manager

  cameraManager.update(dlManager.sat, dlManager.sensorPos);
};

dlManager.drawOptionalScenery = () => {
  if (1000 / timeManager.dt > settingsManager.fpsThrottle1) {
    if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess) {
      if (dlManager.isPostProcessingResizeNeeded) dlManager.resizePostProcessingTexture(sceneManager.sun);
      // Draw the Sun to the Godrays Frame Buffer
      sceneManager.sun.draw(dlManager.pMatrix, cameraManager.camMatrix, sceneManager.sun.godraysFrameBuffer);

      // Draw a black earth and possible black satellite mesh on top of the sun in the godrays frame buffer
      sceneManager.earth.drawOcclusion(dlManager.pMatrix, cameraManager.camMatrix, postProcessingManager.programs.occlusion, sceneManager.sun.godraysFrameBuffer);
      // if (!settingsManager.modelsOnSatelliteViewOverride && cameraManager.cameraType.current !== cameraManager.cameraType.satellite) {
      if (!settingsManager.modelsOnSatelliteViewOverride) {
        meshManager.drawOcclusion(dlManager.pMatrix, cameraManager.camMatrix, postProcessingManager.programs.occlusion, sceneManager.sun.godraysFrameBuffer);
      }
      // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
      // todo: this should be a dynamic buffer not hardcoded to bufffer two
      sceneManager.sun.godraysPostProcessing(gl, postProcessingManager.frameBufferInfos.two.frameBuffer);

      if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess && cameraManager.cameraType.current !== cameraManager.cameraType.planetarium && cameraManager.cameraType.current !== cameraManager.cameraType.astronomy) {
        sceneManager.atmosphere.draw(dlManager.pMatrix, cameraManager);
      }

      // Apply two pass gaussian blur to the godrays to smooth them out
      postProcessingManager.programs.gaussian.uniformValues.radius = 2.0;
      postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.frameBufferInfos.two.frameBuffer, postProcessingManager.frameBufferInfos.one.frameBuffer);
      postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
      // After second pass apply the results to the canvas
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.frameBufferInfos.one.frameBuffer, postProcessingManager.curBuffer);

      // Draw the moon
      sceneManager.moon.draw(dlManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer);

      sceneManager.atmosphere.draw(dlManager.pMatrix, cameraManager);
    }
  }
};

dlManager.satCalculate = () => {
  if (objectManager.selectedSat !== -1) {
    dlManager.sat = satSet.getSat(objectManager.selectedSat);
    if (!dlManager.sat.static) {
      cameraManager.camSnapToSat(dlManager.sat);

      // if (dlManager.sat.missile || typeof meshManager == 'undefined') {
      //   settingsManager.selectedColor = [1.0, 0.0, 0.0, 1.0];
      // } else {
      //   settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];
      // }

      // if (!settingsManager.modelsOnSatelliteViewOverride && cameraManager.cameraType.current !== cameraManager.cameraType.satellite) {
      if (!settingsManager.modelsOnSatelliteViewOverride) {
        meshManager.update(Camera, cameraManager, dlManager.sat, timeManager);
      }
    }
    if (dlManager.sat.missile) orbitManager.setSelectOrbit(dlManager.sat.satId);
  }
  if (objectManager.selectedSat !== dlManager.lastSelectedSat) {
    if (objectManager.selectedSat === -1 && !isselectedSatNegativeOne) {
      orbitManager.clearSelectOrbit();
    }
    selectSatManager.selectSat(objectManager.selectedSat, cameraManager);
    if (objectManager.selectedSat !== -1) {
      orbitManager.setSelectOrbit(objectManager.selectedSat);
      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
        lineManager.updateLineToSat(objectManager.selectedSat, satSet.getIdFromSensorName(sensorManager.currentSensor.name));
      }
      uiManager.updateMap();
    }
    if (objectManager.selectedSat !== -1 || (objectManager.selectedSat == -1 && !isselectedSatNegativeOne)) {
      lineManager.drawWhenSelected();
    }
    dlManager.lastSelectedSat = objectManager.selectedSat;
    objectManager.lastSelectedSat(objectManager.selectedSat);
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
  if (!settingsManager.queuedScreenshot) {
    dlManager.resizeCanvas();
    settingsManager.queuedScreenshot = true;
  } else {
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

    link.href = dlManager.watermarkedDataUrl(dlManager.canvas, copyrightStr);
    link.click();
    settingsManager.screenshotMode = false;
    settingsManager.queuedScreenshot = false;
    dlManager.resizeCanvas();
  }
};

dlManager.watermarkedDataUrl = (canvas, text) => {
  var tempCanvas = document.createElement('canvas');
  var tempCtx = tempCanvas.getContext('2d');
  var cw, ch;
  cw = tempCanvas.width = canvas.width;
  ch = tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);
  tempCtx.font = '24px nasalization';
  var textWidth = tempCtx.measureText(text).width;
  tempCtx.globalAlpha = 1.0;
  tempCtx.fillStyle = 'white';
  tempCtx.fillText(text, cw - textWidth - 30, ch - 30);
  // tempCtx.fillStyle ='black'
  // tempCtx.fillText(text,cw-textWidth-10+2,ch-20+2)
  // just testing by adding tempCanvas to document
  document.body.appendChild(tempCanvas);
  let image = tempCanvas.toDataURL();
  tempCanvas.parentNode.removeChild(tempCanvas);
  return image;
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
        hoverBoxOnSatMiniElements = document.getElementById('sat-minibox');
        hoverBoxOnSatMiniElements.innerHTML = '';
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

      satSet.getScreenCoords(i, dlManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer, sat.position);
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

      satHoverMiniDOM.style.display = 'block';
      satHoverMiniDOM.style.position = 'absolute';
      satHoverMiniDOM.style.left = `${satScreenPositionArray.x + 20}px`;
      satHoverMiniDOM.style.top = `${satScreenPositionArray.y}px`;

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
    currentSearchSats = uiManager.searchBox.getLastResultGroup();
    if (typeof currentSearchSats !== 'undefined') {
      currentSearchSats = currentSearchSats['sats'];
      for (dlManager.i = 0; dlManager.i < currentSearchSats.length; dlManager.i++) {
        orbitManager.updateOrbitBuffer(currentSearchSats[dlManager.i].satId);
      }
    }
  }
  if (!settingsManager.disableUI && uiManager.searchBox.isHovering()) {
    updateHoverSatId = uiManager.searchBox.getHoverSat();
    satSet.getScreenCoords(updateHoverSatId, dlManager.pMatrix, cameraManager.camMatrix);
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
    // gl.readPixels in uiInput.getSatIdFromCoord creates a lot of jank
    // Earlier in the loop we decided how much to throttle updateHover
    // if we skip it this loop, we want to still draw the last thing
    // it was looking at

    if (1000 / timeManager.dt < 30) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitBig;
    } else if (1000 / timeManager.dt < 50) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitSmall;
    } else {
      if (updateHoverDelayLimit > 3) --updateHoverDelayLimit;
    }

    if (!uiInput.isMouseMoving || cameraManager.isDragging || settingsManager.isMobileModeEnabled) {
      return;
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
    satHoverBoxDOM.style.display = 'none';
    if (satId === -1) {
      dlManager.canvas.style.cursor = 'default';
    } else {
      dlManager.canvas.style.cursor = 'pointer';
    }
    return;
  }
  if (satId === -1) {
    if (!isHoverBoxVisible || !settingsManager.enableHoverOverlay) return;
    if (objectManager.isStarManagerLoaded) {
      if (starManager.isConstellationVisible === true && !starManager.isAllConstellationVisible) starManager.clearConstellations();
    }
    // satHoverBoxDOM.html('(none)')
    satHoverBoxDOM.style.display = 'none';
    dlManager.canvas.style.cursor = 'default';
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

    satHoverBoxDOM.style.display = 'block';
    satHoverBoxDOM.style.textAlign = 'center';
    satHoverBoxDOM.style.position = 'fixed';
    satHoverBoxDOM.style.left = `${satX + 20}px`;
    satHoverBoxDOM.style.top = `${satY - 10}px`;
    dlManager.canvas.style.cursor = 'pointer';
  }
};
dlManager.onDrawLoopComplete = (cb) => {
  if (typeof cb == 'undefined' || cb == null) return;
  cb();
};

dlManager.resizePostProcessingTexture = (sun) => {
  // Post Processing Texture Needs Scaled
  sun.setupGodrays(dlManager.gl);
  postProcessingManager.init(dlManager.gl);
  dlManager.isPostProcessingResizeNeeded = false;
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
    satSet.getScreenCoords(dlManager.i, dlManager.pMatrix, cameraManager.camMatrix);
    if (satScreenPositionArray.error) continue;
    if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
    if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;
    _hoverBoxOnSat(dlManager.i, satScreenPositionArray.x, satScreenPositionArray.y);
    orbitManager.setSelectOrbit(dlManager.i);
    dlManager.demoModeSatellite = dlManager.i + 1;
    return;
  }
};

dlManager.checkIfPostProcessingRequired = () => {
  // if (cameraManager.camPitchAccel > 0.0002 || cameraManager.camPitchAccel < -0.0002 || cameraManager.camYawAccel > 0.0002 || cameraManager.camYawAccel < -0.0002) {
  //   // dlManager.gaussianAmt += dlManager.dt * 2;
  //   // dlManager.gaussianAmt = Math.min(500, Math.max(dlManager.gaussianAmt, 0));
  //   dlManager.gaussianAmt = 500;
  // }

  // if (dlManager.gaussianAmt > 0) {
  //   dlManager.gaussianAmt -= dlManager.dt * 2;
  //   dlManager.isNeedPostProcessing = true;
  //   postProcessingManager.isGaussianNeeded = true;
  // } else {
  //   postProcessingManager.isGaussianNeeded = false;
  // }

  if (postProcessingManager.isGaussianNeeded) {
    dlManager.isNeedPostProcessing = true;
    postProcessingManager.switchFrameBuffer();
  } else {
    postProcessingManager.curBuffer = null;
    dlManager.isNeedPostProcessing = false;
  }
};

dlManager.clearFrameBuffers = () => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Clear all post processing frame buffers
  // if (dlManager.isNeedPostProcessing) {
  postProcessingManager.clearAll();
  // }
  // Clear the godraysPostProcessing Frame Buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneManager.sun.godraysFrameBuffer);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Switch back to the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Setup Initial Frame Buffer for Offscreen Drawing
  gl.bindFramebuffer(gl.FRAMEBUFFER, postProcessingManager.curBuffer);
};

export { dlManager };

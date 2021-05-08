import * as glm from '@app/js/lib/external/gl-matrix.js';
import { isselectedSatNegativeOne, selectSatManager } from '@app/js/drawManager/selectSatManager.js';
import { satScreenPositionArray, satSet } from '@app/js/satSet/satSet.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { Dots } from '@app/js/drawManager/dots.js';
import { meshManager } from '@app/js/drawManager/meshManager.js';
import { missileManager } from '@app/js/missileManager/missileManager.js';
import { pPM as postProcessingManager } from '@app/js/drawManager/post-processing.js';
import { sceneManager } from '@app/js/drawManager/sceneManager/sceneManager.js';
import { timeManager } from '@app/js/timeManager/timeManager.js';

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

var drawManager = {
  selectSatManager: selectSatManager,
  i: 0,
  demoModeSatellite: 0,
  demoModeLastTime: 0,
  dt: null,
  t0: 0,
  isShowFPS: false,
  drawLoopCallback: null,
  gaussianAmt: 0,
  setDrawLoopCallback: (cb) => {
    drawManager.drawLoopCallback = cb;
  },
};

var groupsManager, uiInput, starManager, satellite, ColorScheme, cameraManager, objectManager, orbitManager, sensorManager, uiManager, lineManager, dotsManager;
drawManager.init = (groupsManagerRef, uiInputRef, starManagerRef, satelliteRef, ColorSchemeRef, cameraManagerRef, objectManagerRef, orbitManagerRef, sensorManagerRef, uiManagerRef, lineManagerRef, dotsManagerRef) => {
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
  drawManager.isRotationEvent = true;
});

// See if we are running jest right now for testing
if (typeof process !== 'undefined') {
  drawManager.canvas = document.canvas;
} else {
  drawManager.canvas = document.getElementById('keeptrack-canvas');
}

// Try to prevent crashes
drawManager.canvas.addEventListener('webglcontextlost', (e) => {
  console.debug(e);
  e.preventDefault(); // allows the context to be restored
});
drawManager.canvas.addEventListener('webglcontextrestored', (e) => {
  console.debug(e);
  drawManager.glInit();
});

drawManager.glInit = async () => {
  // drawManager Scope
  gl = drawManager.canvas.getContext('webgl', {
    alpha: false,
    premultipliedAlpha: false,
    desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
    stencil: false,
  });

  drawManager.resizeCanvas();

  gl.getExtension('EXT_frag_depth');
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  postProcessingManager.init(gl);

  drawManager.postProcessingManager = postProcessingManager;
  drawManager.gl = gl;
  return gl;
};

drawManager.createDotsManager = () => {
  drawManager.dotsManager = new Dots(drawManager.gl);
  return drawManager.dotsManager;
};

drawManager.loadScene = async () => {
  try {
    await sceneManager.earth.init(gl);
    sceneManager.earth.loadHiRes();
    sceneManager.earth.loadHiResNight();
    meshManager.init(gl, sceneManager.earth);
    sceneManager.atmosphere = new sceneManager.classes.Atmosphere(gl, sceneManager.earth, settingsManager);
    await sceneManager.sun.init(gl, sceneManager.earth, timeManager);
    sceneManager.moon = new sceneManager.classes.Moon(gl, sceneManager.sun);

    // Make this public
    drawManager.sceneManager = sceneManager;
  } catch (error) {
    console.error(error);
  }
};

drawManager.resizeCanvas = () => {
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
        // But Make sure we have set this at least once to trigger
        if ((Math.abs((vw - drawManager.canvas.width) / drawManager.canvas.width) < 0.35 && Math.abs((vh - drawManager.canvas.height) / drawManager.canvas.height > 0.35)) || drawManager.isRotationEvent || typeof drawManager.pMatrix == 'undefined') {
          drawManager.canvas.width = vw;
          drawManager.canvas.height = vh;
          drawManager.isRotationEvent = false;
        } else {
          // No Canvas Change
          return;
        }
      } else {
        drawManager.canvas.width = vw;
        drawManager.canvas.height = vh;
      }
    }
  } else {
    if (settingsManager.screenshotMode) {
      drawManager.canvas.width = settingsManager.hiResWidth;
      drawManager.canvas.height = settingsManager.hiResHeight;
    } else {
      // No screen size change and not taking a photo
      return;
    }
  }

  gl.viewport(0, 0, drawManager.canvas.width, drawManager.canvas.height);
  drawManager.calculatePMatrix(settingsManager);
  drawManager.isPostProcessingResizeNeeded = true;
  // Fix the gpu picker texture size if it has already been created
  if (typeof dotsManager !== 'undefined') dotsManager.createPickingProgram(drawManager.gl);
};

drawManager.calculatePMatrix = (settingsManager) => {
  drawManager.pMatrix = glm.mat4.create();
  glm.mat4.perspective(drawManager.pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);

  // This converts everything from 3D space to ECI (z and y planes are swapped)
  const eciToOpenGlMat = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
  glm.mat4.mul(drawManager.pMatrix, drawManager.pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat
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

drawManager.drawLoop = (preciseDt) => {
  // Restart the draw loop when ready to draw again
  requestAnimationFrame(drawManager.drawLoop);
  // if (drawManager.sceneManager.earth.isUseHiRes && drawManager.sceneManager.earth.isHiResReady !== true) return;

  // Record milliseconds since last drawLoop - default is 0
  drawManager.dt = preciseDt - drawManager.t0 || 0;
  // Record last Draw Time for Calculating Difference
  drawManager.t0 = preciseDt;
  // Display it if that settings is enabled
  if (drawManager.isShowFPS) console.log(1000 / timeManager.dt);
  // Update official time for everyone else
  if (!drawManager.isUpdateTimeThrottle) {
    drawManager.isUpdateTimeThrottle = true;
    timeManager.setNow(Date.now(), drawManager.dt);
    setTimeout(() => {
      drawManager.isUpdateTimeThrottle = false;
    }, 500);
  }

  // Unused currently
  // drawManager.checkIfPostProcessingRequired();

  // Do any per frame calculations
  var start = window.performance.now();
  // PERFORMANCE: 0.110 ms
  drawManager.updateLoop();
  settingsManager.pTime.push(window.performance.now() - start);

  // Actually draw things now that math is done
  // PERFORMANCE: 0.0337ms
  drawManager.resizeCanvas();
  drawManager.clearFrameBuffers();

  // Sun, Moon, and Atmosphere
  // PERFORMANCE: 0.106 ms
  drawManager.drawOptionalScenery();

  sceneManager.earth.draw(drawManager.pMatrix, cameraManager.camMatrix, dotsManager, postProcessingManager.curBuffer);

  // Update Draw Positions
  // PERFORMANCE: 0.281 ms - minor increase with stars disabled
  dotsManager.updatePositionBuffer(satSet.satData.length, satSet.orbitalSats, timeManager);

  dotsManager.updatePMvCamMatrix(drawManager.pMatrix, cameraManager);

  // Draw Dots
  // PERFORMANCE: 0.6813 ms
  dotsManager.draw(drawManager.pMatrix, cameraManager, settingsManager.currentColorScheme, postProcessingManager.curBuffer);

  // Draw GPU Picking Overlay -- This is what lets us pick a satellite
  // Only if last frame was 30 FPS or more. readpixels used to determine which satellite is hovered
  // is the biggest performance hit and we should throttle that.
  if (1000 / timeManager.dt > 30 && !settingsManager.lowPerf) {
    dotsManager.drawGpuPickingFrameBuffer(drawManager.pMatrix, cameraManager, settingsManager.currentColorScheme);
  }

  orbitManager.draw(drawManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer);

  lineManager.draw();

  if (objectManager.selectedSat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
    orbitManager.clearSelectOrbit();
    orbitManager.setSelectOrbit(objectManager.selectedSat);
  }

  // Draw Satellite Model if a satellite is selected and meshManager is loaded
  // if (!settingsManager.modelsOnSatelliteViewOverride && cameraManager.cameraType.current !== cameraManager.cameraType.satellite) {
  if (!settingsManager.modelsOnSatelliteViewOverride && objectManager.selectedSat !== -1) {
    meshManager.draw(drawManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer);
  }

  // Update orbit currently being hovered over
  // Only if last frame was 30 FPS or more. readpixels used to determine which satellite is hovered
  // is the biggest performance hit and we should throttle that.
  if (1000 / timeManager.dt > 30 && !settingsManager.lowPerf) {
    drawManager.updateHover();
  }

  // Do Post Processing
  /* istanbul ignore next */
  if (drawManager.isNeedPostProcessing) {
    if (postProcessingManager.isGaussianNeeded) {
      postProcessingManager.programs.gaussian.uniformValues.radius = Math.min(0.5, drawManager.gaussianAmt / 500);
      postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
      postProcessingManager.switchFrameBuffer();
      postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
      postProcessingManager.switchFrameBuffer();
    }

    // Makes small amount of blur that isn't helpful
    if (postProcessingManager.isFxaaNeeded) {
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.fxaa, postProcessingManager.curBuffer, null);
      postProcessingManager.switchFrameBuffer();
    }

    // SMAA Makes this noticeablly blurry.
    if (postProcessingManager.isSmaaNeeded) {
      // Reuse godrays frame buffer to reduce GPU Memory Requirements
      // Clear it first
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneManager.sun.godraysFrameBuffer);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // postProcessingManager.switchFrameBuffer();
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.hdr, postProcessingManager.curBuffer, sceneManager.sun.godraysFrameBuffer);

      // Load input into edges
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaEdges, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
      postProcessingManager.switchFrameBuffer();
      // Load edges into weights
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaWeights, postProcessingManager.curBuffer, postProcessingManager.curBuffer);

      // Load weights into blend along with original
      postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaBlend, postProcessingManager.curBuffer, null, sceneManager.sun);
    }

    // if (!postProcessingManager.isSmaaNeeded) {
    // NOTE: HDR makes jagged edges on images
    //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.hdr, postProcessingManager.curBuffer, null);
    // }
  }

  // callbacks at the end of the draw loop (this should be used more!)
  drawManager.onDrawLoopComplete(drawManager.drawLoopCallback);

  // If Demo Mode do stuff
  if (settingsManager.isDemoModeOn) drawManager.demoMode();

  // If in the process of taking a screenshot complete work for that
  if (settingsManager.screenshotMode) drawManager.screenShot();
};

drawManager.updateLoop = () => {
  // Calculate changes related to satellites objects
  drawManager.satCalculate();

  // Calculate camera changes needed since last draw
  cameraManager.calculate(objectManager.selectedSat, drawManager.dt);

  // Missile oribts have to be updated every draw or they quickly become innacurate
  drawManager.updateMissileOrbits();

  // If in satellite view the orbit buffer needs to be updated every time
  if (cameraManager.cameraType.current == cameraManager.cameraType.satellite) orbitManager.updateOrbitBuffer(objectManager.lastSelectedSat());

  sceneManager.sun.update();

  // Update Earth Direction
  sceneManager.earth.update();

  satSet.sunECI = sceneManager.sun.realXyz;

  drawManager.orbitsAbove(); //drawManager.sensorPos is set here for the Camera Manager

  cameraManager.update(drawManager.sat, drawManager.sensorPos);
};

drawManager.drawOptionalScenery = () => {
  if (1000 / timeManager.dt > settingsManager.fpsThrottle1) {
    if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess) {
      if (drawManager.isPostProcessingResizeNeeded) drawManager.resizePostProcessingTexture(sceneManager.sun);
      // Draw the Sun to the Godrays Frame Buffer
      sceneManager.sun.draw(drawManager.pMatrix, cameraManager.camMatrix, sceneManager.sun.godraysFrameBuffer);

      // Draw a black earth and possible black satellite mesh on top of the sun in the godrays frame buffer
      sceneManager.earth.drawOcclusion(drawManager.pMatrix, cameraManager.camMatrix, postProcessingManager.programs.occlusion, sceneManager.sun.godraysFrameBuffer);
      // if (!settingsManager.modelsOnSatelliteViewOverride && cameraManager.cameraType.current !== cameraManager.cameraType.satellite) {
      if (!settingsManager.modelsOnSatelliteViewOverride && objectManager.selectedSat !== -1) {
        meshManager.drawOcclusion(drawManager.pMatrix, cameraManager.camMatrix, postProcessingManager.programs.occlusion, sceneManager.sun.godraysFrameBuffer);
      }
      // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
      // todo: this should be a dynamic buffer not hardcoded to bufffer two
      postProcessingManager.curBuffer = null;
      sceneManager.sun.godraysPostProcessing(gl, postProcessingManager.curBuffer);

      // Apply two pass gaussian blur to the godrays to smooth them out
      // postProcessingManager.programs.gaussian.uniformValues.radius = 2.0;
      // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
      // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
      // postProcessingManager.switchFrameBuffer();
      // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
      // // After second pass apply the results to the canvas
      // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, null);

      // Draw the moon
      sceneManager.moon.draw(drawManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer);

      if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess && cameraManager.cameraType.current !== cameraManager.cameraType.planetarium && cameraManager.cameraType.current !== cameraManager.cameraType.astronomy) {
        sceneManager.atmosphere.draw(drawManager.pMatrix, cameraManager);
      }
    }
  }
  postProcessingManager.curBuffer = null;
};

drawManager.satCalculate = () => {
  if (objectManager.selectedSat !== -1) {
    drawManager.sat = satSet.getSat(objectManager.selectedSat);
    if (!drawManager.sat.static) {
      cameraManager.camSnapToSat(drawManager.sat);

      // if (drawManager.sat.missile || typeof meshManager == 'undefined') {
      //   settingsManager.selectedColor = [1.0, 0.0, 0.0, 1.0];
      // } else {
      //   settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];
      // }

      // if (!settingsManager.modelsOnSatelliteViewOverride && cameraManager.cameraType.current !== cameraManager.cameraType.satellite) {
    }
    if (drawManager.sat.missile) orbitManager.setSelectOrbit(drawManager.sat.satId);
  } else {
    // Reset the selected satellite if no satellite is selected
    drawManager.sat = { id: -1 };
  }
  meshManager.update(Camera, cameraManager, timeManager, drawManager.sat);
  if (objectManager.selectedSat !== drawManager.lastSelectedSat) {
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
    if (objectManager.selectedSat == -1) {
      lineManager.drawWhenSelected();
    }
    drawManager.lastSelectedSat = objectManager.selectedSat;
    objectManager.lastSelectedSat(objectManager.selectedSat);
  }
};

drawManager.updateMissileOrbits = () => {
  if (typeof missileManager != 'undefined' && missileManager.missileArray.length > 0) {
    for (drawManager.i = 0; drawManager.i < missileManager.missileArray.length; drawManager.i++) {
      orbitManager.updateOrbitBuffer(missileManager.missileArray[drawManager.i].id);
    }
  }
};

drawManager.screenShot = () => {
  if (!settingsManager.queuedScreenshot) {
    drawManager.resizeCanvas();
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

    link.href = drawManager.watermarkedDataUrl(drawManager.canvas, copyrightStr);
    link.click();
    settingsManager.screenshotMode = false;
    settingsManager.queuedScreenshot = false;
    drawManager.resizeCanvas();
  }
};

drawManager.watermarkedDataUrl = (canvas, text) => {
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

drawManager.isDrawOrbitsAbove = false;
drawManager.orbitsAbove = () => {
  if (cameraManager.cameraType.current == cameraManager.cameraType.astronomy || cameraManager.cameraType.current == cameraManager.cameraType.planetarium) {
    drawManager.sensorPos = satellite.calculateSensorPos(sensorManager.currentSensor);
    if (!drawManager.isDrawOrbitsAbove) {
      // Don't do this until the scene is redrawn with a new camera or thousands of satellites will
      // appear to be in the field of view
      drawManager.isDrawOrbitsAbove = true;
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

      satSet.getScreenCoords(i, drawManager.pMatrix, cameraManager.camMatrix, postProcessingManager.curBuffer, sat.position);
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
    drawManager.sensorPos = null;
    drawManager.isDrawOrbitsAbove = false;
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
drawManager.updateHover = () => {
  if (!settingsManager.disableUI && !settingsManager.lowPerf) {
    currentSearchSats = uiManager.searchBox.getLastResultGroup();
    if (typeof currentSearchSats !== 'undefined') {
      currentSearchSats = currentSearchSats['sats'];
      for (drawManager.i = 0; drawManager.i < currentSearchSats.length; drawManager.i++) {
        orbitManager.updateOrbitBuffer(currentSearchSats[drawManager.i].satId);
      }
    }
  }
  if (!settingsManager.disableUI && uiManager.searchBox.isHovering()) {
    updateHoverSatId = uiManager.searchBox.getHoverSat();
    satSet.getScreenCoords(updateHoverSatId, drawManager.pMatrix, cameraManager.camMatrix);
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
      drawManager.canvas.style.cursor = 'default';
    } else {
      drawManager.canvas.style.cursor = 'pointer';
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
    drawManager.canvas.style.cursor = 'default';
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
    drawManager.canvas.style.cursor = 'pointer';
  }
};
drawManager.onDrawLoopComplete = (cb) => {
  if (typeof cb == 'undefined' || cb == null) return;
  cb();
};

drawManager.resizePostProcessingTexture = (sun) => {
  // Post Processing Texture Needs Scaled
  sun.setupGodrays(drawManager.gl);
  postProcessingManager.init(drawManager.gl);
  drawManager.isPostProcessingResizeNeeded = false;
};

var demoModeLastTime = 0;
drawManager.demoMode = () => {
  if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat == null) return;
  if (timeManager.now - demoModeLastTime < settingsManager.demoModeInterval) return;

  drawManager.demoModeLast = timeManager.now;

  if (drawManager.demoModeSatellite === satSet.getSatData().length) drawManager.demoModeSatellite = 0;
  let satData = satSet.getSatData();
  for (drawManager.i = drawManager.demoModeSatellite; drawManager.i < satData.length; drawManager.i++) {
    try {
      drawManager.sat = satData[drawManager.i];
      if (drawManager.sat.static) continue;
      if (drawManager.sat.missile) continue;
      // if (!drawManager.sat.inview) continue
      if (drawManager.sat.OT === 1 && ColorScheme.objectTypeFlags.payload === false) continue;
      if (drawManager.sat.OT === 2 && ColorScheme.objectTypeFlags.rocketBody === false) continue;
      if (drawManager.sat.OT === 3 && ColorScheme.objectTypeFlags.debris === false) continue;
      if (drawManager.sat.inview && ColorScheme.objectTypeFlags.inFOV === false) continue;
      satSet.getScreenCoords(drawManager.i, drawManager.pMatrix, cameraManager.camMatrix);
      if (satScreenPositionArray.error) continue;
      if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
      if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;
      _hoverBoxOnSat(drawManager.i, satScreenPositionArray.x, satScreenPositionArray.y);
      orbitManager.setSelectOrbit(drawManager.i);
      drawManager.demoModeSatellite = drawManager.i + 1;
      return;
    } catch {
      continue;
    }
  }
};

drawManager.checkIfPostProcessingRequired = () => {
  // if (cameraManager.camPitchAccel > 0.0002 || cameraManager.camPitchAccel < -0.0002 || cameraManager.camYawAccel > 0.0002 || cameraManager.camYawAccel < -0.0002) {
  //   // drawManager.gaussianAmt += drawManager.dt * 2;
  //   // drawManager.gaussianAmt = Math.min(500, Math.max(drawManager.gaussianAmt, 0));
  //   drawManager.gaussianAmt = 500;
  // }

  // if (drawManager.gaussianAmt > 0) {
  //   drawManager.gaussianAmt -= drawManager.dt * 2;
  //   drawManager.isNeedPostProcessing = true;
  postProcessingManager.isGaussianNeeded = false;
  // } else {
  //   postProcessingManager.isGaussianNeeded = false;
  // }

  // Slight Blur
  postProcessingManager.isFxaaNeeded = false;
  // Horrible Results
  postProcessingManager.isSmaaNeeded = false;

  if (postProcessingManager.isGaussianNeeded) {
    drawManager.isNeedPostProcessing = true;
    postProcessingManager.switchFrameBuffer();
    return;
  }

  if (postProcessingManager.isFxaaNeeded) {
    drawManager.isNeedPostProcessing = true;
    postProcessingManager.switchFrameBuffer();
    return;
  }

  if (postProcessingManager.isSmaaNeeded) {
    drawManager.isNeedPostProcessing = true;
    postProcessingManager.switchFrameBuffer();
    return;
  }

  // postProcessingManager.switchFrameBuffer();
  drawManager.isNeedPostProcessing = false;
};

drawManager.clearFrameBuffers = () => {
  // NOTE: clearColor is set here because two different colors are used. If you set it during
  // frameBuffer init then the wrong color will be applied (this can break gpuPicking)
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Clear all post processing frame buffers
  /* istanbul ignore next */
  if (drawManager.isNeedPostProcessing) {
    postProcessingManager.clearAll();
  }
  // Clear the godraysPostProcessing Frame Buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneManager.sun.godraysFrameBuffer);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Switch back to the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Only needed when doing post processing - otherwise just stay where we are
  // Setup Initial Frame Buffer for Offscreen Drawing
  // gl.bindFramebuffer(gl.FRAMEBUFFER, postProcessingManager.curBuffer);
};

export { drawManager };

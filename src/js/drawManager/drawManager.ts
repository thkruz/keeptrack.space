import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { meshManager } from '@app/js/drawManager/meshManager';
import { pPM as postProcessingManager } from '@app/js/drawManager/post-processing.js';
import { sceneManager } from '@app/js/drawManager/sceneManager/sceneManager';
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { isselectedSatNegativeOne, selectSatManager } from '@app/js/plugins/selectSatManager/selectSatManager';
import { mat4 } from 'gl-matrix';
import { DrawManager, PostProcessingManager, SatObject, SunObject } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { spaceObjType2Str } from '../lib/spaceObjType2Str';

let satHoverBoxNode1: HTMLDivElement;
let satHoverBoxNode2: HTMLDivElement;
let satHoverBoxNode3: HTMLDivElement;
let satHoverBoxDOM: HTMLDivElement;
let satMiniBox: HTMLDivElement;

var updateHoverDelay = 0;
var updateHoverDelayLimit = 3;
var satLabelModeLastTime = 0;
var isSatMiniBoxInUse = false;
var labelCount;
var hoverBoxOnSatMiniElements = null;
var satHoverMiniDOM;
window.settingsManager.isShowNextPass = false;
let updateHoverSatId;
let isHoverBoxVisible = false;
let isShowDistance = true;
let gl: WebGL2RenderingContext;

export const init = () => {
  satHoverBoxNode1 = <HTMLDivElement>(<unknown>document.getElementById('sat-hoverbox1'));
  satHoverBoxNode2 = <HTMLDivElement>(<unknown>document.getElementById('sat-hoverbox2'));
  satHoverBoxNode3 = <HTMLDivElement>(<unknown>document.getElementById('sat-hoverbox3'));
  satHoverBoxDOM = <HTMLDivElement>(<unknown>document.getElementById('sat-hoverbox'));
  satMiniBox = <HTMLDivElement>(<unknown>document.getElementById('sat-minibox'));

  drawManager.startWithOrbits();
};

// Reinitialize the canvas on mobile rotation
window.addEventListener('orientationchange', function () {
  drawManager.isRotationEvent = true;
});

export const glInit = async () => {
  // Ensure the canvas is available
  if (drawManager.canvas === null) {
    throw new Error(`The canvas DOM is missing. This could be due to a firewall (ex. Menlo). Contact your LAN Office or System Adminstrator.`);
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
  // drawManager Scope
  if (typeof process !== 'undefined') {
    gl = <WebGL2RenderingContext>drawManager.canvas.getContext('webgl', {
      alpha: false,
      premultipliedAlpha: false,
      desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: false,
    });
  } else {
    gl = drawManager.canvas.getContext('webgl2', {
      alpha: false,
      premultipliedAlpha: false,
      desynchronized: true, // Desynchronized Fixed Jitter on Old Computer
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: false,
    });
  }

  // Check for WebGL Issues
  if (gl === null) {
    throw new Error('WebGL is not available. Contact your LAN Office or System Administrator.');
  }

  drawManager.gl = gl;

  drawManager.resizeCanvas();

  gl.getExtension('EXT_frag_depth');
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  postProcessingManager.init(gl);

  drawManager.postProcessingManager = postProcessingManager;
  return gl;
};

export const createDotsManager = (gl: WebGL2RenderingContext) => {
  gl ??= drawManager.gl; // use the global gl if not passed in
  if (typeof gl === 'undefined') throw new Error('gl is undefined');

  const dotsManager = keepTrackApi.programs.dotsManager;
  if (typeof dotsManager === 'undefined') throw new Error('dotsManager is undefined');

  dotsManager.init(gl);
  return drawManager.dotsManager;
};

export const loadScene = async () => {
  const { gl } = keepTrackApi.programs.drawManager;
  // Make this public
  drawManager.sceneManager = sceneManager;
  try {
    await sceneManager.earth.init(gl);
    sceneManager.earth.loadHiRes();
    sceneManager.earth.loadHiResNight();
    meshManager.init(gl, sceneManager.earth);
    keepTrackApi.methods.drawManagerLoadScene();
    await sceneManager.sun.init();
    await sceneManager.moon.init();
  } catch (error) {
    console.debug(error);
  }
};

export const resizeCanvas = () => {
  const { gl } = keepTrackApi.programs.drawManager;

  // Using minimum allows the canvas to be full screen without fighting with scrollbars
  const cw = document.documentElement.clientWidth || 0;
  const iw = window.innerWidth || 0;
  const vw = Math.min.apply(null, [cw, iw].filter(Boolean));
  const vh = Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0);

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
        if (
          (Math.abs((vw - drawManager.canvas.width) / drawManager.canvas.width) < 0.35 && Math.abs((vh - drawManager.canvas.height) / drawManager.canvas.height) > 0.35) ||
          drawManager.isRotationEvent ||
          typeof drawManager.pMatrix == 'undefined'
        ) {
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
  calculatePMatrix();
  drawManager.isPostProcessingResizeNeeded = true;

  const { dotsManager } = keepTrackApi.programs;

  // Fix the gpu picker texture size if it has already been created
  if (typeof dotsManager?.pickingProgram !== 'undefined') dotsManager.createPickingProgram(drawManager.gl);
};

export const calculatePMatrix = () => {
  const { gl } = keepTrackApi.programs.drawManager;
  drawManager.pMatrix = <mat4>(<unknown>glm.mat4.create());
  glm.mat4.perspective(<any>drawManager.pMatrix, settingsManager.fieldOfView, gl.drawingBufferWidth / gl.drawingBufferHeight, settingsManager.zNear, settingsManager.zFar);

  // This converts everything from 3D space to ECI (z and y planes are swapped)
  const eciToOpenGlMat = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
  glm.mat4.mul(<any>drawManager.pMatrix, drawManager.pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat
};

export const startWithOrbits = async () => {
  if (settingsManager.startWithOrbitsDisplayed) {
    const { groupsManager, orbitManager, satSet } = keepTrackApi.programs;
    // All Orbits
    groupsManager.debris = groupsManager.createGroup('all', '');
    groupsManager.selectGroup(groupsManager.debris);
    satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
    groupsManager.debris.updateOrbits(orbitManager);
    settingsManager.isOrbitOverlayVisible = true;
  }
};

export const drawLoop = (preciseDt: number) => {
  // Restart the draw loop when ready to draw again
  requestAnimationFrame(drawLoop);
  // if (drawManager.sceneManager.earth.isUseHiRes && drawManager.sceneManager.earth.isHiResReady !== true) return;

  const { satSet, dotsManager, colorSchemeManager, mainCamera, orbitManager, lineManager, objectManager, timeManager } = keepTrackApi.programs;

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
  // var start = window.performance.now();
  // PERFORMANCE: 0.110 ms
  drawManager.updateLoop();
  // settingsManager.pTime.push(window.performance.now() - start);

  // Actually draw things now that math is done
  // PERFORMANCE: 0.0337ms
  // drawManager.resizeCanvas();
  drawManager.clearFrameBuffers(dotsManager.pickingFrameBuffer, sceneManager.sun.godrays.frameBuffer);

  // Sun, and Moon
  // PERFORMANCE: 0.106 ms
  drawManager.drawOptionalScenery();

  sceneManager.earth.draw(drawManager.pMatrix, mainCamera, dotsManager, drawManager.postProcessingManager.curBuffer);

  // Update Draw Positions
  // PERFORMANCE: 0.281 ms - minor increase with stars disabled
  dotsManager.updatePositionBuffer(satSet.satData.length, satSet.orbitalSats, timeManager);

  dotsManager.updatePMvCamMatrix(drawManager.pMatrix, mainCamera);

  // Draw Dots
  // PERFORMANCE: 0.6813 ms
  dotsManager.draw(mainCamera, colorSchemeManager, drawManager.postProcessingManager.curBuffer);

  // Draw GPU Picking Overlay -- This is what lets us pick a satellite
  dotsManager.drawGpuPickingFrameBuffer(mainCamera, colorSchemeManager);

  orbitManager.draw(drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.curBuffer);

  lineManager.draw();

  if (objectManager.selectedSat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
    orbitManager.clearSelectOrbit();
    orbitManager.setSelectOrbit(objectManager.selectedSat);
  }

  // Draw Satellite Model if a satellite is selected and meshManager is loaded
  // if (!settingsManager.modelsOnSatelliteViewOverride && mainCamera.cameraType.current !== mainCamera.cameraType.Satellite) {
  if (!settingsManager.modelsOnSatelliteViewOverride && objectManager.selectedSat !== -1) {
    meshManager.draw(drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.curBuffer);
  }

  // Update orbit currently being hovered over
  // Only if last frame was 30 FPS or more. readpixels used to determine which satellite is hovered
  // is the biggest performance hit and we should throttle that.
  if (1000 / timeManager.dt > 5 && !settingsManager.lowPerf) {
    drawManager.updateHover();
  }

  // Do Post Processing
  // if (drawManager.isNeedPostProcessing) {
  // if (postProcessingManager.isGaussianNeeded) {
  //   postProcessingManager.programs.gaussian.uniformValues.radius = Math.min(0.5, drawManager.gaussianAmt / 500);
  //   postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
  //   postProcessingManager.switchFrameBuffer();
  //   postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
  //   postProcessingManager.switchFrameBuffer();
  // }

  // Makes small amount of blur that isn't helpful
  // if (postProcessingManager.isFxaaNeeded) {
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.fxaa, postProcessingManager.curBuffer, null);
  //   postProcessingManager.switchFrameBuffer();
  // }

  // SMAA Makes this noticeablly blurry.
  // if (postProcessingManager.isSmaaNeeded) {
  //   // Reuse godrays frame buffer to reduce GPU Memory Requirements
  //   // Clear it first
  //   gl.bindFramebuffer(gl.FRAMEBUFFER, sceneManager.sun.godrays.frameBuffer);
  //   gl.clearColor(0.0, 0.0, 0.0, 0.0);
  //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //   // postProcessingManager.switchFrameBuffer();
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.hdr, postProcessingManager.curBuffer, sceneManager.sun.godrays.frameBuffer);

  //   // Load input into edges
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaEdges, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
  //   postProcessingManager.switchFrameBuffer();
  //   // Load edges into weights
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaWeights, postProcessingManager.curBuffer, postProcessingManager.curBuffer);

  //   // Load weights into blend along with original
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaBlend, postProcessingManager.curBuffer, null, sceneManager.sun);
  // }

  // if (!postProcessingManager.isSmaaNeeded) {
  // NOTE: HDR makes jagged edges on images
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.hdr, postProcessingManager.curBuffer, null);
  // }
  // }

  keepTrackApi.methods.onDrawLoopComplete(drawManager.drawLoopCallback);

  // If Demo Mode do stuff
  if (settingsManager.isDemoModeOn) drawManager.demoMode();

  // If in the process of taking a screenshot complete work for that
  if (settingsManager.screenshotMode) drawManager.screenShot();
};

export const updateLoop = () => {
  // Calculate changes related to satellites objects
  satCalculate();

  const { mainCamera, orbitManager, objectManager, satSet } = keepTrackApi.programs;

  // Calculate camera changes needed since last draw
  mainCamera.calculate(drawManager.dt, objectManager.selectedSat !== -1);

  // If in satellite view the orbit buffer needs to be updated every time
  if (mainCamera.cameraType.current == mainCamera.cameraType.Satellite && objectManager.selectedSat !== -1) orbitManager.updateOrbitBuffer(objectManager.lastSelectedSat());

  sceneManager.sun.update();

  // Update Earth Direction
  sceneManager.earth.update();

  satSet.sunECI = sceneManager.sun.eci;

  drawManager.orbitsAbove(); //drawManager.sensorPos is set here for the Camera Manager

  mainCamera.update(drawManager.sat, drawManager.sensorPos);
  keepTrackApi.methods.updateLoop();
};

export const drawOptionalScenery = () => {
  // const { timeManager } = keepTrackApi.programs;
  // if (1000 / timeManager.dt > settingsManager.fpsThrottle1) {
  if (!settingsManager.enableLimitedUI && !settingsManager.isDrawLess) {
    if (drawManager.isPostProcessingResizeNeeded) drawManager.resizePostProcessingTexture(drawManager.gl, sceneManager.sun, drawManager.postProcessingManager);

    const { mainCamera, objectManager } = keepTrackApi.programs;

    // Draw the Sun to the Godrays Frame Buffer
    sceneManager.sun.draw(drawManager.pMatrix, mainCamera.camMatrix, sceneManager.sun.godrays.frameBuffer);

    // Draw a black earth and possible black satellite mesh on top of the sun in the godrays frame buffer
    sceneManager.earth.drawOcclusion(drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.programs.occlusion, sceneManager.sun.godrays.frameBuffer);
    // if (!settingsManager.modelsOnSatelliteViewOverride && mainCamera.cameraType.current !== mainCamera.cameraType.Satellite) {
    if (!settingsManager.modelsOnSatelliteViewOverride && objectManager.selectedSat !== -1) {
      meshManager.drawOcclusion(drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.programs.occlusion, sceneManager.sun.godrays.frameBuffer);
    }
    // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
    // todo: this should be a dynamic buffer not hardcoded to bufffer two
    drawManager.postProcessingManager.curBuffer = null;
    sceneManager.sun.drawGodrays(gl, drawManager.postProcessingManager.curBuffer);

    // Apply two pass gaussian blur to the godrays to smooth them out
    // postProcessingManager.programs.gaussian.uniformValues.radius = 2.0;
    // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
    // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
    // postProcessingManager.switchFrameBuffer();
    // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
    // // After second pass apply the results to the canvas
    // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, null);

    // Draw the moon
    sceneManager.moon.draw(drawManager.pMatrix, mainCamera.camMatrix);

    keepTrackApi.methods.drawOptionalScenery();
  }
  // }
  keepTrackApi.programs.drawManager.postProcessingManager.curBuffer = null;
};

export const satCalculate = () => {
  const { mainCamera, orbitManager, lineManager, objectManager, sensorManager, satSet, timeManager } = keepTrackApi.programs;

  if (objectManager.selectedSat !== -1) {
    drawManager.sat = satSet.getSat(objectManager.selectedSat);
    // Can't Draw a Star
    if (typeof drawManager.sat === 'undefined') return;

    if (!drawManager.sat.static) {
      mainCamera.snapToSat(drawManager.sat);

      // if (drawManager.sat.missile || typeof meshManager == 'undefined') {
      //   settingsManager.selectedColor = [1.0, 0.0, 0.0, 1.0];
      // } else {
      //   settingsManager.selectedColor = [0.0, 0.0, 0.0, 0.0];
      // }

      // if (!settingsManager.modelsOnSatelliteViewOverride && mainCamera.cameraType.current !== mainCamera.cameraType.Satellite) {
    }
    if (drawManager.sat.missile) orbitManager.setSelectOrbit(drawManager.sat.id);
  } else {
    // Reset the selected satellite if no satellite is selected
    drawManager.sat = <SatObject>{
      id: -1,
      missile: false,
      type: SpaceObjectType.UNKNOWN,
      static: false,
      inView: 0,
    };
  }
  try {
    meshManager.update(timeManager, drawManager.sat);
  } catch {
    // Don't Let meshManager break everything
  }
  if (objectManager.selectedSat !== drawManager.lastSelectedSat) {
    if (objectManager.selectedSat === -1 && !isselectedSatNegativeOne) {
      orbitManager.clearSelectOrbit();
    }
    selectSatManager.selectSat(objectManager.selectedSat, mainCamera);
    if (objectManager.selectedSat !== -1) {
      orbitManager.setSelectOrbit(objectManager.selectedSat);
      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null && drawManager.sat.inView === 1) {
        lineManager.drawWhenSelected();
        lineManager.updateLineToSat(objectManager.selectedSat, satSet.getSensorFromSensorName(sensorManager.currentSensor[0].name));
      }
      // TODO: #281 keepTrackApi.programs.mapManager.updateMap should be a callback
      if (keepTrackApi.programs.mapManager) {
        keepTrackApi.programs.mapManager.updateMap();
      }
    }
    if (objectManager.selectedSat == -1) {
      lineManager.drawWhenSelected();
    }
    drawManager.lastSelectedSat = objectManager.selectedSat;
    objectManager.lastSelectedSat(objectManager.selectedSat);
  }
};

export const screenShot = () => {
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

export const watermarkedDataUrl = (canvas: HTMLCanvasElement, text: string) => {
  try {
    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');
    let cw, ch;
    cw = tempCanvas.width = canvas.width;
    ch = tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.font = '24px nasalization';
    let textWidth = tempCtx.measureText(text).width;
    tempCtx.globalAlpha = 1.0;
    tempCtx.fillStyle = 'white';
    tempCtx.fillText(text, cw - textWidth - 30, ch - 30);
    // tempCtx.fillStyle ='black'
    // tempCtx.fillText(text,cw-textWidth-10+2,ch-20+2)
    // just testing by adding tempCanvas to document

    if (settingsManager.classificationStr !== '') {
      tempCtx.font = '24px nasalization';
      textWidth = tempCtx.measureText('Secret').width;
      tempCtx.globalAlpha = 1.0;
      tempCtx.fillStyle = 'red';
      tempCtx.fillText(settingsManager.classificationStr, cw / 2 - textWidth, ch - 20);
      tempCtx.fillText(settingsManager.classificationStr, cw / 2 - textWidth, 34);
    }

    document.body.appendChild(tempCanvas);
    let image = tempCanvas.toDataURL();
    tempCanvas.parentNode.removeChild(tempCanvas);
    return image;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const orbitsAbove = () => {
  const { mainCamera, orbitManager, sensorManager, satellite, colorSchemeManager, satSet, timeManager } = keepTrackApi.programs;

  if (mainCamera.cameraType.current == mainCamera.cameraType.Astronomy || mainCamera.cameraType.current == mainCamera.cameraType.Planetarium) {
    drawManager.sensorPos = satellite.calculateSensorPos(sensorManager.currentSensor);
    if (!drawManager.isDrawOrbitsAbove) {
      // Don't do this until the scene is redrawn with a new camera or thousands of satellites will
      // appear to be in the field of view
      drawManager.isDrawOrbitsAbove = true;
      return;
    }
    // Previously called showOrbitsAbove();
    if (!settingsManager.isSatLabelModeOn || mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
      if (isSatMiniBoxInUse) {
        hoverBoxOnSatMiniElements = document.getElementById('sat-minibox');
        hoverBoxOnSatMiniElements.innerHTML = '';
      }
      isSatMiniBoxInUse = false;
      return;
    }

    if (sensorManager?.currentSensor[0]?.lat === null) return;
    if (timeManager.realTime - satLabelModeLastTime < settingsManager.satLabelInterval) return;

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
      if (sat.OT === 1 && colorSchemeManager.objectTypeFlags.payload === false) continue;
      if (sat.OT === 2 && colorSchemeManager.objectTypeFlags.rocketBody === false) continue;
      if (sat.OT === 3 && colorSchemeManager.objectTypeFlags.debris === false) continue;
      if (sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === false) continue;

      const satScreenPositionArray = satSet.getScreenCoords(i, drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.curBuffer, sat.position);
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
      satHoverMiniDOM.textContent = sat.sccNum;

      satHoverMiniDOM.style.display = 'block';
      satHoverMiniDOM.style.position = 'absolute';
      satHoverMiniDOM.style.left = `${satScreenPositionArray.x + 20}px`;
      satHoverMiniDOM.style.top = `${satScreenPositionArray.y}px`;

      hoverBoxOnSatMiniElements.appendChild(satHoverMiniDOM);
      labelCount++;
    }
    isSatMiniBoxInUse = true;
    satLabelModeLastTime = timeManager.realTime;
  } else {
    drawManager.sensorPos = null;
    drawManager.isDrawOrbitsAbove = false;
  }

  // Hide satMiniBoxes When Not in Use
  if (!settingsManager.isSatLabelModeOn || mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium) {
    if (isSatMiniBoxInUse) {
      satMiniBox.innerHTML = '';
    }
    isSatMiniBoxInUse = false;
  }
};

var currentSearchSats;
export const updateHover = () => {
  const { mainCamera, orbitManager, uiManager, searchBox, satSet, timeManager } = keepTrackApi.programs;

  if (searchBox.isResultBoxOpen() && !settingsManager.disableUI && !settingsManager.lowPerf) {
    currentSearchSats = searchBox.getLastResultGroup();
    if (typeof currentSearchSats !== 'undefined') {
      currentSearchSats = currentSearchSats['sats'];
      if (drawManager.updateHoverI >= currentSearchSats.length) drawManager.updateHoverI = 0;
      for (let i = 0; drawManager.updateHoverI < currentSearchSats.length && i < 5; drawManager.updateHoverI++, i++) {
        orbitManager.updateOrbitBuffer(currentSearchSats[drawManager.updateHoverI].satId);
      }
    }
  }
  if (!settingsManager.disableUI && searchBox.isHovering()) {
    updateHoverSatId = uiManager.searchBox.getHoverSat();
    const satScreenPositionArray = satSet.getScreenCoords(updateHoverSatId, drawManager.pMatrix, mainCamera.camMatrix);
    // if (!mainCamera.earthHitTest(gl, pickColorBuf, satScreenPositionArray.x, satScreenPositionArray.y)) {
    try {
      drawManager.hoverBoxOnSat(updateHoverSatId, satScreenPositionArray.x, satScreenPositionArray.y);
    } catch (e) {
      // Intentionally Empty
    }
    // } else {
    //   drawManager.hoverBoxOnSat(-1, 0, 0)
    // }
  } else {
    // gl.readPixels in uiInput.getSatIdFromCoord creates a lot of jank
    // Earlier in the loop we decided how much to throttle updateHover
    // if we skip it this loop, we want to still draw the last thing
    // it was looking at

    if (1000 / timeManager.dt < 15) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitBig;
    } else if (1000 / timeManager.dt < 30) {
      updateHoverDelayLimit = settingsManager.updateHoverDelayLimitSmall;
    } else {
      if (updateHoverDelayLimit > 0) --updateHoverDelayLimit;
    }

    if (mainCamera.isDragging || settingsManager.isMobileModeEnabled) {
      return;
    }

    if (++updateHoverDelay >= updateHoverDelayLimit) {
      updateHoverDelay = 0;
      uiManager.uiInput.mouseSat = uiManager.uiInput.getSatIdFromCoord(mainCamera.mouseX, mainCamera.mouseY);
    }

    if (settingsManager.enableHoverOrbits) {
      if (uiManager.uiInput.mouseSat !== -1 && keepTrackApi.programs.satSet.satData[uiManager.uiInput.mouseSat].type !== SpaceObjectType.STAR) {
        orbitManager.setHoverOrbit(uiManager.uiInput.mouseSat);
      } else {
        orbitManager.clearHoverOrbit();
      }
      satSet.setHover(uiManager.uiInput.mouseSat);
    }
    if (settingsManager.enableHoverOverlay) {
      drawManager.hoverBoxOnSat(uiManager.uiInput.mouseSat, mainCamera.mouseX, mainCamera.mouseY);
    }
  }
};
let sat2;
export const hoverBoxOnSat = (satId: number, satX: number, satY: number) => {
  if (typeof satHoverBoxDOM === 'undefined' || satHoverBoxDOM === null) return;

  const { starManager, mainCamera, objectManager, satellite, sensorManager, satSet, timeManager } = keepTrackApi.programs;

  if (mainCamera.cameraType.current === mainCamera.cameraType.Planetarium && !settingsManager.isDemoModeOn) {
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
  } else if (!mainCamera.isDragging && settingsManager.enableHoverOverlay) {
    // NOTE: The radar mesurement logic breaks if you call it a SatObject
    const sat = <any>satSet.getSat(satId);
    isHoverBoxVisible = true;

    const parentNode = satHoverBoxDOM.parentNode;
    if (parentNode == null) return;
    const nextSibling = satHoverBoxDOM.nextSibling;
    parentNode.removeChild(satHoverBoxDOM); // reflow

    if (sat.static || sat.isRadarData) {
      // TODO: This is a broken mess but only used offline
      if (sat.type === SpaceObjectType.LAUNCH_FACILITY) {
        var launchSite = objectManager.extractLaunchSite(sat.name);
        satHoverBoxNode1.textContent = launchSite.site + ', ' + launchSite.sitec;
        satHoverBoxNode2.innerHTML = spaceObjType2Str(sat.type) + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
        satHoverBoxNode3.textContent = '';
      } else if (sat.isRadarData) {
        satHoverBoxNode1.innerHTML = 'Measurement: ' + sat.mId + '</br>Track: ' + sat.trackId + '</br>Object: ' + sat.objectId;
        if (sat.missileComplex !== -1) {
          satHoverBoxNode1.innerHTML += '</br>Missile Complex: ' + sat.missileComplex;
          satHoverBoxNode1.innerHTML += '</br>Missile Object: ' + sat.missileObject;
        }
        if (parseInt(sat.sccNum) !== -1) satHoverBoxNode1.innerHTML += '</br>Satellite: ' + sat.sccNum;
        if (typeof sat.rae == 'undefined' && sensorManager.currentSensor !== sensorManager.defaultSensor) {
          sat.rae = satellite.eci2Rae(sat.t, sat.position, sensorManager.currentSensor[0]);
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
        satHoverBoxNode3.innerHTML =
          'RCS: ' +
          parseFloat(sat.rcs).toFixed(2) +
          ' m^2 (' +
          (10 ** (parseFloat(sat.rcs) / 10)).toFixed(2) +
          ' dBsm)</br>Az Error: ' +
          sat.azError.toFixed(2) +
          '° El Error: ' +
          sat.elError.toFixed(2) +
          '°';
      } else if (sat.type === SpaceObjectType.CONTORL_FACILITY) {
        satHoverBoxNode1.textContent = sat.name;
        satHoverBoxNode2.innerHTML = sat.country + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
        satHoverBoxNode3.textContent = '';
      } else if (sat.type === SpaceObjectType.STAR) {
        const constellationName = starManager.findStarsConstellation(sat.name);
        if (constellationName !== null) {
          satHoverBoxNode1.innerHTML = sat.name + '</br>' + constellationName;
        } else {
          satHoverBoxNode1.textContent = sat.name;
        }
        satHoverBoxNode2.innerHTML = 'Star';
        satHoverBoxNode3.innerHTML = 'RA: ' + sat.ra.toFixed(3) + ' deg </br> DEC: ' + sat.dec.toFixed(3) + ' deg';
        if (objectManager.lasthoveringSat !== satId && typeof sat !== 'undefined' && constellationName !== null) {
          starManager.drawConstellations(constellationName);
        }
      } else {
        satHoverBoxNode1.textContent = sat.name;
        satHoverBoxNode2.innerHTML = spaceObjType2Str(sat.type) + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
        satHoverBoxNode3.textContent = '';
      }
    } else if (sat.missile) {
      satHoverBoxNode1.innerHTML = sat.name + '<br >' + sat.desc + '';
      satHoverBoxNode2.textContent = '';
      satHoverBoxNode3.textContent = '';
    } else {
      if (!settingsManager.enableHoverOverlay) return;
      // Use this as a default if no UI
      if (settingsManager.disableUI) {
        satHoverBoxNode1.textContent = sat.name;
        satHoverBoxNode2.textContent = sat.sccNum;
        satHoverBoxNode3.textContent = objectManager.extractCountry(sat.country);
      } else {
        if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null && settingsManager.isShowNextPass && isShowDistance) {
          satHoverBoxNode1.textContent = sat.name;
          satHoverBoxNode2.textContent = sat.sccNum;
          satHoverBoxNode3.innerHTML = satellite.nextpass(sat) + satellite.distance(sat, satSet.getSat(objectManager.selectedSat)) + '';
        } else if (isShowDistance) {
          satHoverBoxNode1.textContent = sat.name;
          sat2 = satSet.getSat(objectManager.selectedSat);
          if (typeof sat2 !== 'undefined' && sat2 !== null && sat !== sat2) {
            const ric = satellite.sat2ric(sat, sat2);
            satHoverBoxNode2.innerHTML = `${sat.sccNum}`;
            satHoverBoxNode3.innerHTML =
              `R: ${ric.position[0].toFixed(2)}km I: ${ric.position[1].toFixed(2)}km C: ${ric.position[2].toFixed(2)}km</br>` +
              `ΔR: ${ric.velocity[0].toFixed(2)}km/s ΔI: ${ric.velocity[1].toFixed(2)}km/s ΔC: ${ric.velocity[2].toFixed(2)}km/s</br>`;
          } else {
            satHoverBoxNode2.innerHTML = `${sat.sccNum}${satellite.distance(sat, sat2)}`;
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
        } else if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null && settingsManager.isShowNextPass) {
          satHoverBoxNode1.textContent = sat.name;
          satHoverBoxNode2.textContent = sat.sccNum;
          satHoverBoxNode3.textContent = satellite.nextpass(sat);
        } else {
          satHoverBoxNode1.textContent = sat.name;
          satHoverBoxNode2.textContent = sat.sccNum;
          satHoverBoxNode3.innerHTML =
            'X: ' +
            sat.position.x.toFixed(2) +
            ' Y: ' +
            sat.position.y.toFixed(2) +
            ' Z: ' +
            sat.position.z.toFixed(2) +
            '</br>X: ' +
            sat.velocity.x.toFixed(2) +
            ' Y: ' +
            sat.velocity.y.toFixed(2) +
            ' Z: ' +
            sat.velocity.z.toFixed(2);
        }
      }
    }

    satHoverBoxDOM.style.display = 'block';
    satHoverBoxDOM.style.textAlign = 'center';
    satHoverBoxDOM.style.position = 'fixed';
    satHoverBoxDOM.style.left = `${satX + 20}px`;
    satHoverBoxDOM.style.top = `${satY - 10}px`;
    drawManager.canvas.style.cursor = 'pointer';
    parentNode.insertBefore(satHoverBoxDOM, nextSibling); // reflow
  }
};
export const onDrawLoopComplete = (cb: () => void) => {
  if (typeof cb === 'undefined' || cb === null) {
    console.debug('onDrawLoopComplete: callback is undefined or null');
    return;
  }
  cb();
};

export const resizePostProcessingTexture = (gl: WebGL2RenderingContext, sun: SunObject, postProcessingManager: PostProcessingManager) => {
  if (typeof gl === 'undefined' || gl === null) throw new Error('gl is undefined or null');
  if (typeof sun === 'undefined' || sun === null) throw new Error('sun is undefined or null');
  if (typeof postProcessingManager === 'undefined' || postProcessingManager === null) throw new Error('postProcessingManager is undefined or null');

  // Post Processing Texture Needs Scaled
  sun.initGodrays(gl);
  postProcessingManager.init(gl);

  // Reset Flag now that textures are reinitialized
  drawManager.isPostProcessingResizeNeeded = false;
};

var demoModeLastTime = 0;
export const demoMode = () => {
  const { mainCamera, objectManager, sensorManager, colorSchemeManager, timeManager, orbitManager, satSet } = keepTrackApi.programs;

  if (objectManager?.isSensorManagerLoaded && sensorManager?.currentSensor[0]?.lat === null) return;
  if (timeManager.realTime - demoModeLastTime < settingsManager.demoModeInterval) return;

  drawManager.demoModeLast = timeManager.realTime;

  if (drawManager.demoModeSatellite === satSet.satData.length) drawManager.demoModeSatellite = 0;
  let satData = satSet.satData;
  for (drawManager.i = drawManager.demoModeSatellite; drawManager.i < satData.length; drawManager.i++) {
    try {
      drawManager.sat = satData[drawManager.i];
      if (drawManager.sat.static) continue;
      if (drawManager.sat.missile) continue;
      // if (!drawManager.sat.inView === 1) continue
      if (drawManager.sat.type === 1 && colorSchemeManager.objectTypeFlags.payload === false) continue;
      if (drawManager.sat.type === 2 && colorSchemeManager.objectTypeFlags.rocketBody === false) continue;
      if (drawManager.sat.type === 3 && colorSchemeManager.objectTypeFlags.debris === false) continue;
      if (drawManager.sat.inView === 1 && colorSchemeManager.objectTypeFlags.inFOV === false) continue;
      const satScreenPositionArray = satSet.getScreenCoords(drawManager.i, drawManager.pMatrix, mainCamera.camMatrix);
      if (satScreenPositionArray.error) continue;
      if (typeof satScreenPositionArray.x == 'undefined' || typeof satScreenPositionArray.y == 'undefined') continue;
      if (satScreenPositionArray.x > window.innerWidth || satScreenPositionArray.y > window.innerHeight) continue;
      drawManager.hoverBoxOnSat(drawManager.i, satScreenPositionArray.x, satScreenPositionArray.y);
      orbitManager.setSelectOrbit(drawManager.i);
      drawManager.demoModeSatellite = drawManager.i + 1;
      return;
    } catch {
      continue;
    }
  }
};

// export const checkIfPostProcessingRequired = (postProcessingManagerOverride?) => {
//   if (postProcessingManagerOverride) drawManager.postProcessingManager = postProcessingManagerOverride;

//   // if (mainCamera.camPitchAccel > 0.0002 || mainCamera.camPitchAccel < -0.0002 || mainCamera.camYawAccel > 0.0002 || mainCamera.camYawAccel < -0.0002) {
//   //   // drawManager.gaussianAmt += drawManager.dt * 2;
//   //   // drawManager.gaussianAmt = Math.min(500, Math.max(drawManager.gaussianAmt, 0));
//   //   drawManager.gaussianAmt = 500;
//   // }

//   // if (drawManager.gaussianAmt > 0) {
//   //   drawManager.gaussianAmt -= drawManager.dt * 2;
//   //   drawManager.isNeedPostProcessing = true;
//   drawManager.postProcessingManager.isGaussianNeeded = false;
//   // } else {
//   //   drawManager.postProcessingManager.isGaussianNeeded = false;
//   // }

//   // Slight Blur
//   drawManager.postProcessingManager.isFxaaNeeded = false;
//   // Horrible Results
//   drawManager.postProcessingManager.isSmaaNeeded = false;

//   if (drawManager.postProcessingManager.isGaussianNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

//   if (drawManager.postProcessingManager.isFxaaNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

//   if (drawManager.postProcessingManager.isSmaaNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

//   // drawManager.postProcessingManager.switchFrameBuffer();
//   drawManager.isNeedPostProcessing = false;
// };

export const clearFrameBuffers = (pickFb: WebGLFramebuffer, godFb: WebGLFramebuffer) => {
  const { gl } = keepTrackApi.programs.drawManager;
  // NOTE: clearColor is set here because two different colors are used. If you set it during
  // frameBuffer init then the wrong color will be applied (this can break gpuPicking)
  gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Clear all post processing frame buffers
  /* istanbul ignore next */
  if (drawManager.isNeedPostProcessing) {
    postProcessingManager.clearAll();
  }
  // Clear the godrays Frame Buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, godFb);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Switch back to the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Only needed when doing post processing - otherwise just stay where we are
  // Setup Initial Frame Buffer for Offscreen Drawing
  // gl.bindFramebuffer(gl.FRAMEBUFFER, postProcessingManager.curBuffer);
};

export const drawManager: DrawManager = {
  init: init,
  glInit: glInit,
  createDotsManager: createDotsManager,
  loadScene: loadScene,
  resizeCanvas: resizeCanvas,
  calculatePMatrix: calculatePMatrix,
  startWithOrbits: startWithOrbits,
  drawLoop: drawLoop,
  updateLoop: updateLoop,
  demoMode: demoMode,
  hoverBoxOnSat: hoverBoxOnSat,
  drawOptionalScenery: drawOptionalScenery,
  onDrawLoopComplete: onDrawLoopComplete,
  updateHover: updateHover,
  updateHoverI: 0,
  isDrawOrbitsAbove: false,
  orbitsAbove: orbitsAbove,
  screenShot: screenShot,
  satCalculate: satCalculate,
  watermarkedDataUrl: watermarkedDataUrl,
  resizePostProcessingTexture: resizePostProcessingTexture,
  clearFrameBuffers: clearFrameBuffers,
  selectSatManager: selectSatManager,
  i: 0,
  demoModeSatellite: 0,
  demoModeLastTime: 0,
  demoModeLast: 0,
  dt: 0,
  t0: 0,
  isShowFPS: false,
  drawLoopCallback: null,
  gaussianAmt: 2,
  setDrawLoopCallback: (cb: any) => {
    drawManager.drawLoopCallback = cb;
  },
  sat: <SatObject>(<unknown>{
    id: -1,
    missile: false,
    OT: 0,
    static: false,
    inView: false,
    satId: -1,
  }),
  canvas: <HTMLCanvasElement>null,
  sceneManager: null,
  gl: <WebGL2RenderingContext>null,
  isNeedPostProcessing: false,
  isRotationEvent: false,
  pMatrix: null,
  postProcessingManager: <PostProcessingManager>null,
  isPostProcessingResizeNeeded: false,
  isUpdateTimeThrottle: false,
  sensorPos: null,
  lastSelectedSat: -1,
  dotsManager: null,
};

// See if we are running jest right now for testing
if (typeof process !== 'undefined') {
  drawManager.canvas = (<any>document).canvas;
} else {
  drawManager.canvas = <HTMLCanvasElement>document.getElementById('keeptrack-canvas');
}

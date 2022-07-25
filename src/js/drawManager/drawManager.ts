import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { meshManager } from '@app/js/drawManager/meshManager';
import { pPM as postProcessingManager } from '@app/js/drawManager/post-processing.js';
import { sceneManager } from '@app/js/drawManager/sceneManager/sceneManager';
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { getEl } from '@app/js/lib/helpers';
import { isselectedSatNegativeOne, selectSatManager } from '@app/js/plugins';
import { mat4 } from 'gl-matrix';
import { DrawManager, PostProcessingManager, SatObject, SunObject } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { demoMode } from './demoMode';
import { hoverBoxOnSat, hoverManager, updateHover } from './hoverManager/hoverManager';
import { screenShot, watermarkedDataUrl } from './screenShot';

let satMiniBox: HTMLDivElement;
let satLabelModeLastTime = 0;
let isSatMiniBoxInUse = false;
let labelCount;
let hoverBoxOnSatMiniElements = null;
let satHoverMiniDOM;
settingsManager.isShowNextPass = false;

export const init = () => {
  satMiniBox = <HTMLDivElement>(<unknown>getEl('sat-minibox'));
  hoverManager.init();
  drawManager.startWithOrbits();

  // Reinitialize the canvas on mobile rotation
  window.addEventListener('orientationchange', function () {
    drawManager.isRotationEvent = true;
  });
};
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

  let gl: WebGL2RenderingContext;
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
    // await tools.init();
    await sceneManager.earth.init(gl);
    keepTrackApi.methods.drawManagerLoadScene();
    await sceneManager.sun.init();
    await sceneManager.moon.init();
    await sceneManager.skybox.init();
  } catch (error) {
    console.debug(error);
  }
};

export const loadHiRes = async () => {
  const { gl } = keepTrackApi.programs.drawManager;
  try {
    sceneManager.earth.loadHiRes();
    sceneManager.earth.loadHiResNight();
    meshManager.init(gl, sceneManager.earth);
  } catch (error) {
    console.debug(error);
  }
};

export const getCanvasInfo = () => {
  // Using minimum allows the canvas to be full screen without fighting with scrollbars
  const cw = document.documentElement.clientWidth || 0;
  const iw = window.innerWidth || 0;
  const vw = Math.min.apply(null, [cw, iw].filter(Boolean));
  const vh = Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  return { vw, vh };
};
export const setCanvasSize = (height: number, width: number) => {
  drawManager.canvas.width = width;
  drawManager.canvas.height = height;
};
export const resizeCanvas = () => {
  const { gl } = keepTrackApi.programs.drawManager;
  const { vw, vh } = getCanvasInfo();

  // If taking a screenshot then resize no matter what to get high resolution
  if (gl.canvas.width != vw || gl.canvas.height != vh) {
    // If not autoresizing then don't do anything to the canvas
    if (settingsManager.isAutoResizeCanvas) {
      // If this is a cellphone avoid the keyboard forcing resizes but
      // always resize on rotation
      const oldWidth = drawManager.canvas.width;
      const oldHeight = drawManager.canvas.height;
      // Changes more than 35% of height but not due to rotation are likely the keyboard! Ignore them
      // but make sure we have set this at least once to trigger
      const isKeyboardOut = Math.abs((vw - oldWidth) / oldWidth) < 0.35 && Math.abs((vh - oldHeight) / oldHeight) > 0.35;

      if (!settingsManager.isMobileModeEnabled || isKeyboardOut || drawManager.isRotationEvent || typeof drawManager.pMatrix == 'undefined') {
        setCanvasSize(vh, vw);
        drawManager.isRotationEvent = false;
      } else {
        // No Canvas Change
        return;
      }
    }
  } else {
    if (!settingsManager.screenshotMode) return;
    setCanvasSize(settingsManager.hiResWidth, settingsManager.hiResHeight);
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
    const { groupsManager, orbitManager, satSet, colorSchemeManager } = keepTrackApi.programs;
    // All Orbits
    groupsManager.debris = groupsManager.createGroup('all', '');
    groupsManager.selectGroup(groupsManager.debris);
    satSet.setColorScheme(colorSchemeManager.currentColorScheme, true); // force color recalc
    groupsManager.debris.updateOrbits(orbitManager);
    settingsManager.isOrbitOverlayVisible = true;
  }
};
export const drawLoop = (preciseDt: number) => {
  // Restart the draw loop when ready to draw again
  requestAnimationFrame(drawLoop);
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
  drawManager.updateLoop();

  // Actually draw things now that math is done
  drawManager.clearFrameBuffers(dotsManager.pickingFrameBuffer, sceneManager.sun.godrays.frameBuffer);

  // Sun, and Moon
  drawManager.drawOptionalScenery();

  sceneManager.earth.draw(drawManager.pMatrix, mainCamera, dotsManager, drawManager.postProcessingManager.curBuffer);

  // Update Colors
  // NOTE: We used to skip this when isDragging was true, but its so efficient that doesn't seem necessary anymore
  satSet.setColorScheme(colorSchemeManager.currentColorScheme); // avoid recalculating ALL colors

  // Update Draw Positions
  dotsManager.updatePositionBuffer(satSet.satData.length, satSet.orbitalSats, timeManager);

  dotsManager.updatePMvCamMatrix(drawManager.pMatrix, mainCamera);

  // Draw Dots
  dotsManager.draw(mainCamera, colorSchemeManager, drawManager.postProcessingManager.curBuffer);

  // Draw GPU Picking Overlay -- This is what lets us pick a satellite
  dotsManager.drawGpuPickingFrameBuffer(mainCamera, colorSchemeManager);

  orbitManager.draw(drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.curBuffer);

  lineManager.draw();

  if (objectManager.selectedSat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
    orbitManager.clearSelectOrbit(false);
    orbitManager.setSelectOrbit(objectManager.selectedSat, false);
  }

  if (objectManager.secondarySat !== -1 && settingsManager.enableConstantSelectedSatRedraw) {
    orbitManager.clearSelectOrbit(true);
    orbitManager.setSelectOrbit(objectManager.secondarySat, true);
  }

  // Draw Satellite Model if a satellite is selected and meshManager is loaded
  // if (!settingsManager.modelsOnSatelliteViewOverride && mainCamera.cameraType.current !== mainCamera.cameraType.Satellite) {
  if (!settingsManager.modelsOnSatelliteViewOverride && objectManager.selectedSat !== -1) {
    meshManager.draw(drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.curBuffer);
  }

  // Update orbit currently being hovered over
  // Only if last frame was 30 FPS or more. readpixels used to determine which satellite is hovered
  // is the biggest performance hit and we should throttle that.
  if (1000 / timeManager.dt > 5 && !settingsManager.lowPerf && !settingsManager.isDragging && !settingsManager.isDemoModeOn) {
    updateHover();
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

  // DEBUG: Kept for future use
  //   // postProcessingManager.switchFrameBuffer();
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.hdr, postProcessingManager.curBuffer, sceneManager.sun.godrays.frameBuffer);

  // DEBUG: Kept for future use
  //   // Load input into edges
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaEdges, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
  //   postProcessingManager.switchFrameBuffer();
  //   // Load edges into weights
  //   postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.smaaWeights, postProcessingManager.curBuffer, postProcessingManager.curBuffer);

  // DEBUG: Kept for future use
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
  if (settingsManager.screenshotMode) screenShot();
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
export const drawOptionalScenery = (drawManagerOverride?: DrawManager) => {
  drawManager = drawManagerOverride || drawManager;
  const { gl } = keepTrackApi.programs.drawManager;

  if (!settingsManager.isDrawLess) {
    if (drawManager.isPostProcessingResizeNeeded) drawManager.resizePostProcessingTexture(drawManager.gl, sceneManager.sun, drawManager.postProcessingManager);
    const { mainCamera, objectManager } = keepTrackApi.programs;

    if (settingsManager.isDrawSun) {
      // Draw the Sun to the Godrays Frame Buffer
      sceneManager.sun.draw(drawManager.pMatrix, mainCamera.camMatrix, sceneManager.sun.godrays.frameBuffer);

      // Draw a black earth and possible black satellite mesh on top of the sun in the godrays frame buffer
      sceneManager.earth.drawOcclusion(drawManager.pMatrix, mainCamera.camMatrix, drawManager?.postProcessingManager?.programs?.occlusion, sceneManager?.sun?.godrays?.frameBuffer);
      if (!settingsManager.modelsOnSatelliteViewOverride && objectManager.selectedSat !== -1) {
        meshManager.drawOcclusion(drawManager.pMatrix, mainCamera.camMatrix, drawManager.postProcessingManager.programs.occlusion, sceneManager.sun.godrays.frameBuffer);
      }
      // Add the godrays effect to the godrays frame buffer and then apply it to the postprocessing buffer two
      // todo: this should be a dynamic buffer not hardcoded to bufffer two
      drawManager.postProcessingManager.curBuffer = null;
      drawManager.sceneManager.sun.drawGodrays(gl, drawManager.postProcessingManager.curBuffer);
    }

    drawManager.sceneManager.skybox.draw(drawManager.pMatrix, mainCamera.camMatrix, postProcessingManager.curBuffer);

    // Apply two pass gaussian blur to the godrays to smooth them out
    // postProcessingManager.programs.gaussian.uniformValues.radius = 2.0;
    // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 1.0, y: 0.0 };
    // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, postProcessingManager.secBuffer);
    // postProcessingManager.switchFrameBuffer();
    // postProcessingManager.programs.gaussian.uniformValues.dir = { x: 0.0, y: 1.0 };
    // // After second pass apply the results to the canvas
    // postProcessingManager.doPostProcessing(gl, postProcessingManager.programs.gaussian, postProcessingManager.curBuffer, null);

    // Draw the moon
    drawManager.sceneManager.moon.draw(drawManager.pMatrix, mainCamera.camMatrix);

    keepTrackApi.methods.drawOptionalScenery();
  }
  keepTrackApi.programs.drawManager.postProcessingManager.curBuffer = null;
};
export const satCalculate = () => {
  const { mainCamera, orbitManager, lineManager, objectManager, sensorManager, satSet, timeManager, dotsManager } = keepTrackApi.programs;

  if (objectManager.selectedSat !== -1) {
    drawManager.sat = satSet.getSat(objectManager.selectedSat);
    mainCamera.snapToSat(drawManager.sat);
    if (drawManager.sat.missile) orbitManager.setSelectOrbit(drawManager.sat.id);
  } else {
    // Reset the selected satellite if no satellite is selected
    drawManager.sat = <SatObject>{
      id: -1,
      missile: false,
      type: SpaceObjectType.UNKNOWN,
      static: false,
    };
  }

  meshManager.update(timeManager, drawManager.sat);

  if (objectManager.selectedSat !== drawManager.lastSelectedSat) {
    if (objectManager.selectedSat === -1 && !isselectedSatNegativeOne) orbitManager.clearSelectOrbit();
    selectSatManager.selectSat(objectManager.selectedSat, mainCamera);
    if (objectManager.selectedSat !== -1) {
      orbitManager.setSelectOrbit(objectManager.selectedSat);
      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null && dotsManager.inViewData[drawManager.sat.id] === 1) {
        lineManager.drawWhenSelected();
        lineManager.updateLineToSat(objectManager.selectedSat, satSet.getSensorFromSensorName(sensorManager.currentSensor[0].name));
      }
      if (settingsManager.plugins.stereoMap) keepTrackApi.programs.mapManager?.updateMap();
    } else {
      lineManager.drawWhenSelected();
    }
    drawManager.lastSelectedSat = objectManager.selectedSat;
    objectManager.lastSelectedSat(objectManager.selectedSat);
  }
};
// This is intentionally complex to reduce object creation and GC
// Splitting it into subfunctions would not be optimal
// prettier-ignore
export const orbitsAbove = () => { // NOSONAR
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
        hoverBoxOnSatMiniElements = getEl('sat-minibox');
        hoverBoxOnSatMiniElements.innerHTML = '';
      }
      isSatMiniBoxInUse = false;
      return;
    }

    if (sensorManager?.currentSensor[0]?.lat === null) return;
    if (timeManager.realTime - satLabelModeLastTime < settingsManager.satLabelInterval) return;

    orbitManager.clearInViewOrbit();

    let sat;
    labelCount = 0;
    drawManager.isHoverBoxVisible = true;

    hoverBoxOnSatMiniElements = getEl('sat-minibox');

    /**
     * @todo Reuse hoverBoxOnSatMini DOM Elements
     * @body Currently are writing and deleting the nodes every draw element. Reusuing them with a transition effect will make it smoother
     */
    hoverBoxOnSatMiniElements.innerHTML = '';
    for (let i = 0; i < satSet.orbitalSats && labelCount < settingsManager.maxLabels; i++) {
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
export const onDrawLoopComplete = (cb: () => void) => {
  if (typeof cb === 'undefined' || cb === null) {
    console.debug('onDrawLoopComplete: callback is undefined or null');
    return;
  }
  cb();
};
export const resizePostProcessingTexture = (gl: WebGL2RenderingContext, sun: SunObject, postProcessingManagerRef: PostProcessingManager) => {
  if (typeof gl === 'undefined' || gl === null) throw new Error('gl is undefined or null');
  if (typeof sun === 'undefined' || sun === null) throw new Error('sun is undefined or null');
  if (typeof postProcessingManagerRef === 'undefined' || postProcessingManagerRef === null) throw new Error('postProcessingManager is undefined or null');

  // Post Processing Texture Needs Scaled
  sun.initGodrays(gl);
  postProcessingManagerRef.init(gl);

  // Reset Flag now that textures are reinitialized
  drawManager.isPostProcessingResizeNeeded = false;
};
// DEBUG: Kept for future use
// export const checkIfPostProcessingRequired = (postProcessingManagerOverride?) => {
//   if (postProcessingManagerOverride) drawManager.postProcessingManager = postProcessingManagerOverride;

//   // if (mainCamera.camPitchAccel > 0.0002 || mainCamera.camPitchAccel < -0.0002 || mainCamera.camYawAccel > 0.0002 || mainCamera.camYawAccel < -0.0002) {
//   //   // drawManager.gaussianAmt += drawManager.dt * 2;
//   //   // drawManager.gaussianAmt = Math.min(500, Math.max(drawManager.gaussianAmt, 0));
//   //   drawManager.gaussianAmt = 500;
//   // }

// DEBUG: Kept for future use
//   // if (drawManager.gaussianAmt > 0) {
//   //   drawManager.gaussianAmt -= drawManager.dt * 2;
//   //   drawManager.isNeedPostProcessing = true;
//   drawManager.postProcessingManager.isGaussianNeeded = false;
//   // } else {
//   //   drawManager.postProcessingManager.isGaussianNeeded = false;
//   // }

// DEBUG: Kept for future use
//   // Slight Blur
//   drawManager.postProcessingManager.isFxaaNeeded = false;
//   // Horrible Results
//   drawManager.postProcessingManager.isSmaaNeeded = false;

// DEBUG: Kept for future use
//   if (drawManager.postProcessingManager.isGaussianNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

// DEBUG: Kept for future use
//   if (drawManager.postProcessingManager.isFxaaNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

// DEBUG: Kept for future use
//   if (drawManager.postProcessingManager.isSmaaNeeded) {
//     drawManager.isNeedPostProcessing = true;
//     drawManager.postProcessingManager.switchFrameBuffer();
//     return;
//   }

// DEBUG: Kept for future use
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

export let drawManager: DrawManager = {
  init: init,
  glInit: glInit,
  createDotsManager: createDotsManager,
  loadScene: loadScene,
  loadHiRes,
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
  // Canvas needs to account for jest
  canvas: typeof process !== 'undefined' ? <HTMLCanvasElement>(<any>document).canvas : <HTMLCanvasElement>getEl('keeptrack-canvas'),
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
  isHoverBoxVisible: false,
  isShowDistance: true,
  sat2: null,
};

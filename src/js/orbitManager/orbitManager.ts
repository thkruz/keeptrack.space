/* */

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as glm from 'gl-matrix';
import { MissileParams } from '../api/keepTrackTypes';
import { Camera } from '../camera/camera';
import { GroupsManager } from '../groupsManager/groupsManager';
import { getEl } from '../lib/helpers';
import { CatalogManager } from '../satSet/satSet';

const glBuffers = <WebGLBuffer[]>[];
const inProgress = <boolean[]>[];
let pathShader: any;
let selectOrbitBuf: WebGLBuffer;
let secondaryOrbitBuf: WebGLBuffer;
let hoverOrbitBuf: WebGLBuffer;
let currentHoverId = -1;
let currentSelectId = -1;
let secondarySelectId = -1;
let currentInView = <number[]>[];
let gl: WebGL2RenderingContext;
let mainCamera: Camera;
let groupsManager: GroupsManager;
let initialized = false;

export const workerOnMessage: any = (m: any) => {
  let satId = m.data.satId;
  let pointsOut = new Float32Array(m.data.pointsOut);
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[satId]);
  gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);
  inProgress[satId] = false;
};
export const init = (orbitWorker?: Worker): void => {
  // See if we are running jest right now for testing
  if (typeof process !== 'undefined') {
    if (typeof orbitWorker !== 'undefined') {
      orbitManager.orbitWorker = orbitWorker;
    } else {
      orbitManager.orbitWorker = {
        postMessage: () => {
          // This is intentional
        },
      } as any;
    }
  } else {
    if (typeof Worker === 'undefined') {
      throw new Error('Your browser does not support web workers.');
    }
    try {
      orbitManager.orbitWorker = new Worker(settingsManager.installDirectory + 'js/orbitCruncher.js');
    } catch (error) {
      // If you are trying to run this off the desktop you might have forgotten --allow-file-access-from-files
      if (window.location.href.indexOf('file://') === 0) {
        getEl('loader-text').innerText =
          'Critical Error: You need to allow access to files from your computer! Ensure "--allow-file-access-from-files" is added to your chrome shortcut and that no other copies of chrome are running when you start it.';
      } else {
        console.error(error);
      }
    }
  }

  const { satSet } = keepTrackApi.programs;

  orbitManager.orbitWorker.onmessage = workerOnMessage;

  gl = keepTrackApi.programs.drawManager.gl;
  mainCamera = keepTrackApi.programs.mainCamera;
  groupsManager = keepTrackApi.programs.groupsManager;

  let vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, orbitManager.shader.vert);
  gl.compileShader(vs);

  let fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, orbitManager.shader.frag);
  gl.compileShader(fs);

  pathShader = gl.createProgram();
  gl.attachShader(pathShader, vs);
  gl.attachShader(pathShader, fs);
  gl.linkProgram(pathShader);

  pathShader.aPos = gl.getAttribLocation(pathShader, 'aPos');
  pathShader.uMvMatrix = gl.getUniformLocation(pathShader, 'uMvMatrix');
  pathShader.uCamMatrix = gl.getUniformLocation(pathShader, 'uCamMatrix');
  pathShader.uPMatrix = gl.getUniformLocation(pathShader, 'uPMatrix');
  pathShader.uColor = gl.getUniformLocation(pathShader, 'uColor');

  selectOrbitBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, selectOrbitBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);

  secondaryOrbitBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, secondaryOrbitBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);

  hoverOrbitBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, hoverOrbitBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);

  for (let i = 0; i < satSet.missileSats; i++) {
    glBuffers.push(allocateBuffer());
  }
  orbitManager.orbitWorker.postMessage({
    isInit: true,
    orbitFadeFactor: settingsManager.orbitFadeFactor,
    satData: JSON.stringify(satSet.satData),
    numSegs: settingsManager.orbitSegments,
  });
  initialized = true;

  orbitManager.shader = pathShader;
  keepTrackApi.methods.orbitManagerInit();
};

/* export const setOrbit = function (satId: number) {
let sat = satSet.getSat(satId: number);
glm.mat4.identity(glm.mat4.create());
//apply steps in reverse order because matrix multiplication
// (last multiplied in is first applied to vertex)

//step 5. rotate to RAAN
glm.mat4.rotateZ(glm.mat4.create(), glm.mat4.create(), sat.raan + Math.PI/2);
//step 4. incline the plane
glm.mat4.rotateY(glm.mat4.create(), glm.mat4.create(), -sat.inclination);
//step 3. rotate to argument of periapsis
glm.mat4.rotateZ(glm.mat4.create(), glm.mat4.create(), sat.argPe - Math.PI/2);
//step 2. put earth at the focus
glm.mat4.translate(glm.mat4.create(), glm.mat4.create(), [sat.semiMajorAxis - sat.apogee - RADIUS_OF_EARTH, 0, 0]);
//step 1. stretch to ellipse
glm.mat4.scale(glm.mat4.create(), glm.mat4.create(), [sat.semiMajorAxis, sat.semiMinorAxis, 0]);

};

orbitManager.clearOrbit = function () {
glm.mat4.identity(glm.mat4.create());
} */

export const setSelectOrbit = (satId: number, isSecondary: boolean = false): void => {
  if (isSecondary) {
    secondarySelectId = satId;
  } else {
    currentSelectId = satId;
  }
  orbitManager.updateOrbitBuffer(satId);
};

export const clearSelectOrbit = (isSecondary: boolean = false): void => {
  if (isSecondary) {
    secondarySelectId = -1;
    gl.bindBuffer(gl.ARRAY_BUFFER, secondaryOrbitBuf);
  } else {
    currentSelectId = -1;
    gl.bindBuffer(gl.ARRAY_BUFFER, selectOrbitBuf);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
};

export const addInViewOrbit = (satId: number): void => {
  for (let i = 0; i < currentInView.length; i++) {
    if (satId === currentInView[i]) return;
  }
  currentInView.push(satId);
  orbitManager.updateOrbitBuffer(satId);
};

export const removeInViewOrbit = (satId: number): void => {
  let r = null;
  for (let i = 0; i < currentInView.length; i++) {
    if (satId === currentInView[i]) {
      r = i;
    }
  }
  if (r === null) return;
  currentInView.splice(r, 1);
  orbitManager.updateOrbitBuffer(satId);
};

export const clearInViewOrbit = (): void => {
  if (currentInView.length === 0) return;
  currentInView = [];
};

export const setHoverOrbit = (satId: number): void => {
  if (satId === currentHoverId) return;

  // set new hover object
  currentHoverId = satId;
  orbitManager.updateOrbitBuffer(satId);
};

export const clearHoverOrbit = (): void => {
  if (currentHoverId === -1) return;
  currentHoverId = -1;

  gl.bindBuffer(gl.ARRAY_BUFFER, hoverOrbitBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
};

export const draw = (pMatrix: glm.mat4, camMatrix: glm.mat4, tgtBuffer: WebGLFramebuffer): boolean => {
  if (!initialized) return false;

  const { satSet } = keepTrackApi.programs;

  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
  gl.useProgram(pathShader);

  gl.enable(gl.BLEND);
  if (settingsManager.showOrbitThroughEarth) {
    gl.disable(gl.DEPTH_TEST);
  } else {
    gl.enable(gl.DEPTH_TEST);
  }

  gl.uniformMatrix4fv(pathShader.uMvMatrix, false, glm.mat4.create());
  gl.uniformMatrix4fv(pathShader.uCamMatrix, false, camMatrix);
  gl.uniformMatrix4fv(pathShader.uPMatrix, false, pMatrix);

  if (settingsManager.isDrawOrbits) {
    drawGroupObjectOrbit();
    drawInViewObjectOrbit();
    drawPrimaryObjectOrbit(satSet);
    drawSecondaryObjectOrbit(satSet);
    drawHoverObjectOrbit(satSet);
  }

  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);

  // Done drawing
  return true;
};

export const allocateBuffer = () => {
  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((settingsManager.orbitSegments + 1) * 4), gl.DYNAMIC_DRAW);
  return buf;
};

export const updateOrbitBuffer = (satId: number, force?: boolean, TLE1?: string, TLE2?: string, missileParams: MissileParams = {}) => {
  const { satSet, timeManager } = keepTrackApi.programs;
  const { missile, latList, lonList, altList } = missileParams;
  const sat = satSet.getSat(satId);
  if (typeof sat === 'undefined') return;

  force ??= false;
  if (force) {
    orbitManager.orbitWorker.postMessage({
      isInit: false,
      isUpdate: true,
      satId: satId,
      dynamicOffsetEpoch: timeManager.dynamicOffsetEpoch,
      staticOffset: timeManager.staticOffset,
      rate: timeManager.propRate,
      TLE1: TLE1,
      TLE2: TLE2,
      isEcfOutput: settingsManager.isOrbitCruncherInEcf,
    });
  } else if (!inProgress[satId] && !sat.static) {
    if (missile) {
      orbitManager.orbitWorker.postMessage({
        isInit: false,
        isUpdate: true,
        missile: true,
        satId: satId,
        latList: latList,
        lonList: lonList,
        altList: altList,
      });
    } else {
      orbitManager.orbitWorker.postMessage({
        isInit: false,
        satId: satId,
        dynamicOffsetEpoch: timeManager.dynamicOffsetEpoch,
        staticOffset: timeManager.staticOffset,
        rate: timeManager.propRate,
        isEcfOutput: settingsManager.isOrbitCruncherInEcf,
      });
      inProgress[satId] = true;
    }
  }
};

export type OrbitManager = typeof orbitManager;
export const orbitManager = {
  init: init,
  draw: draw,
  orbitWorker: null,
  clearHoverOrbit: clearHoverOrbit,
  setHoverOrbit: setHoverOrbit,
  clearInViewOrbit: clearInViewOrbit,
  addInViewOrbit: addInViewOrbit,
  removeInViewOrbit: removeInViewOrbit,
  setSelectOrbit: setSelectOrbit,
  clearSelectOrbit: clearSelectOrbit,
  updateOrbitBuffer: updateOrbitBuffer,
  shader: {
    frag: `#version 300 es
      precision mediump float;
  
      in vec4 vColor;
      in float vAlpha;
  
      out vec4 fragColor;
  
      void main(void) {
        fragColor = vec4(vColor[0],vColor[1],vColor[2], vColor[3] * vAlpha);
      }
      `,
    vert: `#version 300 es
      in vec4 aPos;
  
      uniform mat4 uCamMatrix;
      uniform mat4 uMvMatrix;
      uniform mat4 uPMatrix;
      uniform vec4 uColor;
  
      out vec4 vColor;
      out float vAlpha;
  
      void main(void) {
          vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos[0],aPos[1],aPos[2], 1.0);
          gl_Position = position;
          vColor = uColor;
          vAlpha = aPos[3];
      }
      `,
  },
  isTimeMachineRunning: false,
  isTimeMachineVisible: false,
  tempTransColor: <[number, number, number, number]>[0, 0, 0, 0],
  historyOfSatellitesPlay: null,
  playNextSatellite: null,
  historyOfSatellitesRunCount: 0,
};
const writePathToGpu = (id: number) => {
  if (id === -1) return; // no hover object
  if (typeof glBuffers[id] === 'undefined') throw new Error(`orbit buffer ${id} not allocated`);
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[id]);
  gl.vertexAttribPointer(pathShader.aPos, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(pathShader.aPos);
  gl.drawArrays(gl.LINE_STRIP, 0, settingsManager.orbitSegments + 1);
};
const drawPrimaryObjectOrbit = (satSet: CatalogManager) => {
  if (currentSelectId !== -1 && !satSet.getSatExtraOnly(currentSelectId).static) {
    gl.uniform4fv(pathShader.uColor, settingsManager.orbitSelectColor);
    writePathToGpu(currentSelectId);
  }
};

const drawGroupObjectOrbit = (): void => {
  if (groupsManager.selectedGroup !== null && !settingsManager.isGroupOverlayDisabled) {
    const { colorSchemeManager } = keepTrackApi.programs;
    // DEBUG: Planned future feature
    // if (sensorManager.currentSensor?.lat) {
    //   groupsManager.selectedGroup.forEach(function (id) {
    //     let isInViewSoon = false;
    //     for (let i = 0; i < orbitManager.inViewSoon.length; i++) {
    //       if (id === orbitManager.inViewSoon[i]) {
    //         isInViewSoon = true;
    //         break;
    //       }
    //     }
    //     if (isInViewSoon) {
    //       gl.uniform4fv(pathShader.uColor, settingsManager.orbitInViewColor);
    //     } else {
    //       gl.uniform4fv(pathShader.uColor, settingsManager.orbitGroupColor);
    //     }
    //     gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[id]);
    //     gl.vertexAttribPointer(pathShader.aPos, 4, gl.FLOAT, false, 0, 0);
    //     gl.enableVertexAttribArray(pathShader.aPos);
    //     gl.drawArrays(gl.LINE_STRIP, 0, settingsManager.orbitSegments + 1);
    //   });
    // }
    // gl.uniform4fv(pathShader.uColor, settingsManager.orbitGroupColor);
    groupsManager.selectedGroup.forEach((id: number) => {
      if (id === currentHoverId || id === currentSelectId) return; // Skip hover and select objects
      if (typeof colorSchemeManager.colorData[id * 4] === 'undefined') throw new Error(`color buffer for ${id} not valid`);
      if (typeof colorSchemeManager.colorData[id * 4 + 1] === 'undefined') throw new Error(`color buffer for ${id} not valid`);
      if (typeof colorSchemeManager.colorData[id * 4 + 2] === 'undefined') throw new Error(`color buffer for ${id} not valid`);
      if (typeof colorSchemeManager.colorData[id * 4 + 3] === 'undefined') throw new Error(`color buffer for ${id} not valid`);
      if (keepTrackApi.programs.objectManager.selectedSat !== id) {
        // if color is black, we probably have old data, so recalculate color buffers
        if (colorSchemeManager.colorData[id * 4] <= 0 && colorSchemeManager.colorData[id * 4 + 1] <= 0 && colorSchemeManager.colorData[id * 4 + 2] <= 0) {
          colorSchemeManager.calculateColorBuffers(true);
          // Fix: Crued workaround to getting dots to show up when loading with search parameter
          setTimeout(() => {
            colorSchemeManager.calculateColorBuffers(true);
          }, 500);
        }
        if (colorSchemeManager.colorData[id * 4 + 3] <= 0) {
          return; // Skip transparent objects
          // Debug: This is useful when all objects are supposed to be visible but groups can filter out objects
          // throw new Error(`color buffer for ${id} isn't visible`);
        }
      }
      gl.uniform4fv(pathShader.uColor, [
        colorSchemeManager.colorData[id * 4],
        colorSchemeManager.colorData[id * 4 + 1],
        colorSchemeManager.colorData[id * 4 + 2],
        colorSchemeManager.colorData[id * 4 + 3] * settingsManager.orbitGroupAlpha,
      ]);
      writePathToGpu(id);
    });
  }
};

const drawInViewObjectOrbit = (): void => {
  if (currentInView.length >= 1) {
    // There might be some z-fighting
    if (mainCamera.cameraType.current == mainCamera.cameraType.Planetarium) {
      gl.uniform4fv(pathShader.uColor, settingsManager.orbitPlanetariumColor);
    } else {
      gl.uniform4fv(pathShader.uColor, settingsManager.orbitInViewColor);
    }
    currentInView.forEach((id) => {
      writePathToGpu(id);
    });
  }
};

const drawHoverObjectOrbit = (satSet: CatalogManager): void => {
  if (currentHoverId !== -1 && currentHoverId !== currentSelectId && !satSet.getSatExtraOnly(currentHoverId).static) {
    const { colorSchemeManager } = keepTrackApi.programs;
    // avoid z-fighting
    if (typeof colorSchemeManager.colorData[currentHoverId * 4] === 'undefined') throw new Error(`color buffer for ${currentHoverId} not valid`);
    if (typeof colorSchemeManager.colorData[currentHoverId * 4 + 1] === 'undefined') throw new Error(`color buffer for ${currentHoverId} not valid`);
    if (typeof colorSchemeManager.colorData[currentHoverId * 4 + 2] === 'undefined') throw new Error(`color buffer for ${currentHoverId} not valid`);
    if (typeof colorSchemeManager.colorData[currentHoverId * 4 + 3] === 'undefined') throw new Error(`color buffer for ${currentHoverId} not valid`);
    gl.uniform4fv(pathShader.uColor, settingsManager.orbitHoverColor);
    writePathToGpu(currentHoverId);
  }
};

const drawSecondaryObjectOrbit = (satSet: CatalogManager): void => {
  if (secondarySelectId !== -1 && !satSet.getSatExtraOnly(secondarySelectId).static) {
    gl.uniform4fv(pathShader.uColor, settingsManager.orbitSelectColor2);
    writePathToGpu(secondarySelectId);
  }
};

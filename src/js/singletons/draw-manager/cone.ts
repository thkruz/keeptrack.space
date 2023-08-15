import { keepTrackApi } from '@app/js/keepTrackApi';
import { CatalogManager, SatObject, Singletons } from '@app/js/interfaces';
import { DEG2RAD, RADIUS_OF_EARTH } from '@app/js/lib/constants';
import { lon2yaw } from '@app/js/lib/transforms';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { Kilometers } from 'ootk';
import { keepTrackContainer } from '../../container';

import { TimeManager } from '../time-manager';
import { GlUtils } from '../../static/gl-utils';
import { DrawManager } from '../draw-manager';
import { DotsManager } from '../dots-manager';
import { CoordinateTransforms } from '../../static/coordinate-transforms';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

/* ***************************************************************************
 * Initialization Code
 * ***************************************************************************/
const offsetDistance = RADIUS_OF_EARTH + 80 + 1;

export const init = async () => {
  const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
  const { gl } = drawManagerInstance;

  initProgram(gl);
  initBuffers(gl);
  initVao(gl);

  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'coneInit',
    cb: (sat: SatObject | null, satId: number) => {
      if (!sat) return;
      const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
      cone.pos = [dotsManagerInstance.positionData[satId * 3], dotsManagerInstance.positionData[satId * 3 + 1], dotsManagerInstance.positionData[satId * 3 + 2]];
      init();
    },
  });

  cone.isLoaded = true;
};
export const initProgram = (gl: WebGL2RenderingContext) => {
  cone.program = <any>GlUtils.createProgramFromCode(gl, shaders.cone.vert, shaders.cone.frag);
  gl.useProgram(cone.program);

  // Assign Attributes
  cone.program.a_position = gl.getAttribLocation(cone.program, 'a_position');
  cone.program.a_normal = gl.getAttribLocation(cone.program, 'a_normal');
  cone.program.u_pMatrix = gl.getUniformLocation(cone.program, 'u_pMatrix');
  cone.program.u_camMatrix = gl.getUniformLocation(cone.program, 'u_camMatrix');
  cone.program.u_mvMatrix = gl.getUniformLocation(cone.program, 'u_mvMatrix');
  cone.program.u_nMatrix = gl.getUniformLocation(cone.program, 'u_nMatrix');
  // cone.program.u_drawPosition = gl.getUniformLocation(cone.program, 'u_drawPosition');
};

export const initBuffers = (gl: WebGL2RenderingContext) => {
  // height is the distance from the center of the earth ([0,0,0]) to the cone.pos
  const h = vec3.distance([0, 0, 0], vec3.fromValues(cone.pos[0], cone.pos[1], cone.pos[2])) - offsetDistance;

  // Calculate the width of the cone based on the angle given and the height of the cone
  const r1 = h * Math.tan((cone.angle * Math.PI) / 180);
  const r2 = 1;
  const nPhi = 100;

  const vertPos = [];
  const vertNorm = [];
  const vertIndex = [];

  let Phi = 0;
  const dPhi = (2 * Math.PI) / (nPhi - 1);
  Phi += dPhi;
  let Nx = r1 - r2;
  let Ny = h;
  const N = Math.sqrt(Nx * Nx + Ny * Ny);

  Nx /= N;
  Ny /= N;

  for (let i = 0; i < nPhi + 1; i++) {
    const cosPhi = Math.cos(Phi);
    const sinPhi = Math.sin(Phi);
    const cosPhi2 = Math.cos(Phi + dPhi / 2);
    const sinPhi2 = Math.sin(Phi + dPhi / 2);
    if (i !== nPhi) {
      vertPos.push(-h / 2, cosPhi * r1, sinPhi * r1); // points
      vertNorm.push(Nx, Ny * cosPhi, Ny * sinPhi); // normals
      vertIndex.push(2 * i, 2 * i + 1, 2 * i + 2);
    }
    vertPos.push(h / 2, cosPhi2 * r2, sinPhi2 * r2); // points
    vertNorm.push(Nx, Ny * cosPhi2, Ny * sinPhi2); // normals
    vertIndex.push(2 * i + 1, 2 * i + 3, 2 * i + 2);
    Phi += dPhi;
  }

  cone.buffers.vertCount = vertIndex.length;

  cone.buffers.vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cone.buffers.vertPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

  cone.buffers.vertNormBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cone.buffers.vertNormBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

  cone.buffers.vertIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cone.buffers.vertIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);
};
export const initVao = (gl: WebGL2RenderingContext) => {
  // Make New Vertex Array Objects
  cone.vao = gl.createVertexArray();
  gl.bindVertexArray(cone.vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, cone.buffers.vertPosBuf);
  gl.enableVertexAttribArray(cone.program.a_position);
  gl.vertexAttribPointer(cone.program.a_position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, cone.buffers.vertNormBuf);
  gl.enableVertexAttribArray(cone.program.a_normal);
  gl.vertexAttribPointer(cone.program.a_normal, 3, gl.FLOAT, false, 0, 0);

  // Select the vertex indicies buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cone.buffers.vertIndexBuf);

  gl.bindVertexArray(null);
};

/* ***************************************************************************
 * Render Loop Code
 * ***************************************************************************/
export const update = (position: Kilometers[]) => {
  const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
  const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);

  if (catalogManagerInstance.selectedSat === -1) return;

  cone.mvMatrix = mat4.create();
  cone.nMatrix = mat3.create();
  mat4.identity(cone.mvMatrix);

  // Translate to halfway between cone.pos and the center of the earth
  const h = vec3.distance([0, 0, 0], vec3.fromValues(cone.pos[0], cone.pos[1], cone.pos[2])) - offsetDistance;
  const halfwayPosition = vec3.scale(vec3.create(), vec3.fromValues(h + offsetDistance * 2, 0, 0), 0.5);
  // Rotate to face the center of the earth
  const { lat, lon } = CoordinateTransforms.eci2lla({ x: position[0], y: position[1], z: position[2] }, timeManagerInstance.simulationTimeObj);

  mat4.rotateZ(cone.mvMatrix, cone.mvMatrix, lon2yaw(lon, timeManagerInstance.selectedDate));
  mat4.rotateZ(cone.mvMatrix, cone.mvMatrix, -91.2 * DEG2RAD);
  mat4.rotateY(cone.mvMatrix, cone.mvMatrix, -lat * DEG2RAD);
  mat4.translate(cone.mvMatrix, cone.mvMatrix, halfwayPosition);

  mat3.normalFromMat4(cone.nMatrix, cone.mvMatrix);
};

export const draw = function (pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
  const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
  const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

  if (catalogManagerInstance.selectedSat === -1) return;

  const { gl } = drawManagerInstance;

  cone.pMatrix = pMatrix;
  cone.camMatrix = camMatrix;
  if (!cone.isLoaded) return;

  gl.useProgram(cone.program);
  if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  // Set the uniforms
  gl.uniformMatrix3fv(cone.program.u_nMatrix, false, cone.nMatrix);
  gl.uniformMatrix4fv(cone.program.u_mvMatrix, false, cone.mvMatrix);
  gl.uniformMatrix4fv(cone.program.u_pMatrix, false, pMatrix);
  gl.uniformMatrix4fv(cone.program.u_camMatrix, false, camMatrix);

  gl.bindVertexArray(cone.vao);

  gl.enable(gl.BLEND);

  gl.drawElements(gl.TRIANGLES, cone.buffers.vertCount, gl.UNSIGNED_SHORT, 0);

  gl.disable(gl.BLEND);

  gl.bindVertexArray(null);
};

/* ***************************************************************************
 * Export Code
 * ***************************************************************************/
const shaders = {
  cone: {
    frag: `#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      in vec4 v_color;

      out vec4 fragColor;

      void main(void) {
        fragColor = v_color;
      }
      `,
    vert: `#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;

      in vec3 a_position;
      in vec3 a_normal;

      out vec4 v_color;

      void main(void) {
          gl_Position = u_pMatrix * u_camMatrix * u_mvMatrix * vec4(a_position, 1.0);
          vec4 color = vec4(a_normal, 0.5);
          // v_color = vec4(a_normal, 0.5);
          v_color = vec4(0.0, 1.0, 0.4, 0.2);
      }
      `,
  },
};
export type ConeObject = typeof cone;
export const cone = {
  vao: <WebGLVertexArrayObject>null,
  buffers: {
    vertCount: 0,
    texCoordBuf: <WebGLBuffer>null,
    vertPosBuf: <WebGLBuffer>null,
    vertNormBuf: <WebGLBuffer>null,
    vertIndexBuf: <WebGLBuffer>null,
  },
  program: {
    a_position: <number>null,
    a_normal: <number>null,
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_nMatrix: <WebGLUniformLocation>null,
    u_drawPosition: <WebGLUniformLocation>null,
  },
  camMatrix: mat4.create(),
  mvMatrix: mat4.create(),
  pMatrix: mat4.create(),
  nMatrix: mat3.create(),
  init: init,
  update: update,
  draw: draw,
  pos: [40000, 0, 0],
  angle: 3,
  isLoaded: false,
};

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SunObject } from '@app/js/api/keepTrackTypes';
import { MILLISECONDS_PER_DAY, RAD2DEG } from '@app/js/lib/constants';
import { satellite } from '@app/js/satMath/satMath';
import { jday } from '@app/js/timeManager/transforms';
import * as glm from 'gl-matrix';
import { A } from '../../lib/external/meuusjs';

/* eslint-disable camelcase */
/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

const NUM_LAT_SEGS = 32;
const NUM_LON_SEGS = 32;
const RADIUS_OF_DRAW_SUN = 6500;
const SUN_SCALAR_DISTANCE = 220000;

/* ***************************************************************************
 * Initialization Code
 * ***************************************************************************/
export const init = async (): Promise<void> => {
  const { gl } = keepTrackApi.programs.drawManager;

  initProgram(gl);
  initBuffers(gl);
  initVao(gl);

  initGodrays(gl);

  sun.isLoaded = true;
};
export const initGodrays = (gl: WebGL2RenderingContext): void => {
  initGodraysProgram(gl);
  initGodraysBuffers(gl);
  initGodraysVao(gl);
  initGodraysTextures(gl);
  initGodraysFrameBuffer(gl);
};
export const initProgram = (gl: WebGL2RenderingContext): void => {
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, shaders.sun.frag);
  gl.compileShader(fragShader);

  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, shaders.sun.vert);
  gl.compileShader(vertShader);

  sun.program = <any>gl.createProgram();
  gl.attachShader(sun.program, vertShader);
  gl.attachShader(sun.program, fragShader);
  gl.linkProgram(sun.program);

  sun.program.a_position = gl.getAttribLocation(sun.program, 'a_position');
  sun.program.a_normal = gl.getAttribLocation(sun.program, 'a_normal');
  sun.program.u_pMatrix = gl.getUniformLocation(sun.program, 'u_pMatrix');
  sun.program.u_camMatrix = gl.getUniformLocation(sun.program, 'u_camMatrix');
  sun.program.u_mvMatrix = gl.getUniformLocation(sun.program, 'u_mvMatrix');
  sun.program.u_nMatrix = gl.getUniformLocation(sun.program, 'u_nMatrix');
  sun.program.u_lightDir = gl.getUniformLocation(sun.program, 'u_lightDir');
  sun.program.u_sunDistance = gl.getUniformLocation(sun.program, 'u_sunDistance');
};
export const initBuffers = (gl: WebGL2RenderingContext): void => {
  // generate a uvsphere bottom up, CCW order
  const vertPos = [];
  const vertNorm = [];
  for (let lat = 0; lat <= NUM_LAT_SEGS; lat++) {
    const latAngle = (Math.PI / NUM_LAT_SEGS) * lat - Math.PI / 2;
    const diskRadius = Math.cos(Math.abs(latAngle));
    const z = Math.sin(latAngle);
    for (let lon = 0; lon <= NUM_LON_SEGS; lon++) {
      // add an extra vertex for texture funness
      const lonAngle = ((Math.PI * 2) / NUM_LON_SEGS) * lon;
      const x = Math.cos(lonAngle) * diskRadius;
      const y = Math.sin(lonAngle) * diskRadius;

      vertPos.push(x * RADIUS_OF_DRAW_SUN);
      vertPos.push(y * RADIUS_OF_DRAW_SUN);
      vertPos.push(z * RADIUS_OF_DRAW_SUN);
      vertNorm.push(x);
      vertNorm.push(y);
      vertNorm.push(z);
    }
  }

  // ok let's calculate vertex draw orders.... indiv triangles
  const vertIndex = [];
  for (let lat = 0; lat < NUM_LAT_SEGS; lat++) {
    // this is for each QUAD, not each vertex, so <
    for (let lon = 0; lon < NUM_LON_SEGS; lon++) {
      const blVert = lat * (NUM_LON_SEGS + 1) + lon; // there's NUM_LON_SEGS + 1 verts in each horizontal band
      const brVert = blVert + 1;
      const tlVert = (lat + 1) * (NUM_LON_SEGS + 1) + lon;
      const trVert = tlVert + 1;
      vertIndex.push(blVert);
      vertIndex.push(brVert);
      vertIndex.push(tlVert);

      vertIndex.push(tlVert);
      vertIndex.push(trVert);
      vertIndex.push(brVert);
    }
  }
  sun.buffers.vertCount = vertIndex.length;

  sun.buffers.vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.buffers.vertPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

  sun.buffers.vertNormBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.buffers.vertNormBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

  sun.buffers.vertIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sun.buffers.vertIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);
};
export const initVao = (gl: WebGL2RenderingContext) => {
  // Make New Vertex Array Objects
  sun.vao = gl.createVertexArray();
  gl.bindVertexArray(sun.vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.buffers.vertPosBuf);
  gl.enableVertexAttribArray(sun.program.a_position);
  gl.vertexAttribPointer(sun.program.a_position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.buffers.vertNormBuf);
  gl.enableVertexAttribArray(sun.program.a_normal);
  gl.vertexAttribPointer(sun.program.a_normal, 3, gl.FLOAT, false, 0, 0);

  // Select the vertex indicies buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sun.buffers.vertIndexBuf);

  gl.bindVertexArray(null);
};
export const initGodraysFrameBuffer = (gl: WebGL2RenderingContext): void => {
  sun.godrays.frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, sun.godrays.frameBuffer);

  sun.godrays.renderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
  gl.bindRenderbuffer(gl.RENDERBUFFER, sun.godrays.renderBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sun.godrays.textureMap.texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, sun.godrays.renderBuffer);
};
export const initGodraysTextures = (gl: WebGL2RenderingContext): void => {
  sun.godrays.textureMap.texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, sun.godrays.textureMap.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
};
export const initGodraysVao = (gl: WebGL2RenderingContext) => {
  sun.godrays.vao = gl.createVertexArray();
  gl.bindVertexArray(sun.godrays.vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.godrays.buffers.vertPosBuf);
  gl.enableVertexAttribArray(sun.godrays.program.a_position);
  gl.vertexAttribPointer(sun.godrays.program.a_position, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sun.godrays.buffers.texCoordBuf);
  gl.enableVertexAttribArray(sun.godrays.program.a_texCoord);
  gl.vertexAttribPointer(sun.godrays.program.a_texCoord, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
};
export const initGodraysBuffers = (gl: WebGL2RenderingContext): void => {
  sun.godrays.buffers.vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.godrays.buffers.vertPosBuf);
  const x1 = 0;
  const x2 = 0 + gl.drawingBufferWidth;
  const y1 = 0;
  const y2 = 0 + gl.drawingBufferHeight;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);

  // provide texture coordinates for the rectangle.
  sun.godrays.buffers.texCoordBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.godrays.buffers.texCoordBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
};
export const initGodraysProgram = (gl: WebGL2RenderingContext): void => {
  sun.godrays.program = <any>gl.createProgram();
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, shaders.godrays.vert);
  gl.compileShader(vertShader);

  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, shaders.godrays.frag);
  gl.compileShader(fragShader);

  gl.attachShader(sun.godrays.program, vertShader);
  gl.attachShader(sun.godrays.program, fragShader);
  gl.linkProgram(sun.godrays.program);

  sun.godrays.program.a_position = gl.getAttribLocation(sun.godrays.program, 'a_position');
  sun.godrays.program.a_texCoord = gl.getAttribLocation(sun.godrays.program, 'a_texCoord');
  sun.godrays.program.u_sunPosition = gl.getUniformLocation(sun.godrays.program, 'u_sunPosition');
  sun.godrays.program.u_sampler = gl.getUniformLocation(sun.godrays.program, 'u_sampler');
  sun.godrays.program.u_resolution = gl.getUniformLocation(sun.godrays.program, 'u_resolution');
};

/* ***************************************************************************
 * Render Loop Code
 * ***************************************************************************/
export const update = () => {
  const { timeManager } = keepTrackApi.programs;
  sun.now = timeManager.simulationTimeObj;

  sun.sunvar.j = jday(
    sun.now.getUTCFullYear(),
    sun.now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    sun.now.getUTCDate(),
    sun.now.getUTCHours(),
    sun.now.getUTCMinutes(),
    sun.now.getUTCSeconds()
  );
  sun.sunvar.j += sun.now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  sun.sunvar.gmst = satellite.gstime(sun.sunvar.j);
  sun.sunvar.jdo = new A.JulianDay(sun.sunvar.j); // now
  sun.sunvar.coord = A.EclCoordfromWgs84(0, 0, 0);

  // AZ / EL Calculation
  sun.sunvar.tp = <any>A.Solar.topocentricPosition(sun.sunvar.jdo, sun.sunvar.coord, false);
  sun.sunvar.azimuth = sun.sunvar.tp.hz.az * RAD2DEG + (180 % 360);
  sun.sunvar.elevation = (sun.sunvar.tp.hz.alt * RAD2DEG) % 360;

  // Range Calculation
  const T = new A.JulianDay(A.JulianDay.dateToJD(sun.now)).jdJ2000Century();
  sun.sunvar.g = (A.Solar.meanAnomaly(T) * 180) / Math.PI;
  sun.sunvar.g = sun.sunvar.g % 360.0;
  sun.sunvar.R = 1.00014 - 0.01671 * Math.cos(sun.sunvar.g) - 0.00014 * Math.cos(2 * sun.sunvar.g);
  sun.sunvar.range = (sun.sunvar.R * 149597870700) / 1000; // au to km conversion

  // RAE to ECI
  sun.eci = satellite.ecfToEci(satellite.lookAngles2Ecf(sun.sunvar.azimuth, sun.sunvar.elevation, sun.sunvar.range, 0, 0, 0), sun.sunvar.gmst);

  const sunMaxDist = Math.max(Math.max(Math.abs(sun.eci.x), Math.abs(sun.eci.y)), Math.abs(sun.eci.z));
  sun.pos[0] = (sun.eci.x / sunMaxDist) * SUN_SCALAR_DISTANCE;
  sun.pos[1] = (sun.eci.y / sunMaxDist) * SUN_SCALAR_DISTANCE;
  sun.pos[2] = (sun.eci.z / sunMaxDist) * SUN_SCALAR_DISTANCE;

  sun.mvMatrix = glm.mat4.create();
  sun.nMatrix = glm.mat3.create();
  glm.mat4.identity(sun.mvMatrix);
  glm.mat4.translate(sun.mvMatrix, sun.mvMatrix, glm.vec3.fromValues(sun.pos[0], sun.pos[1], sun.pos[2]));
  glm.mat3.normalFromMat4(sun.nMatrix, sun.mvMatrix);
};
export const draw = function (pMatrix: glm.mat4, camMatrix: glm.mat4, tgtBuffer: WebGLFramebuffer) {
  const { earth } = keepTrackApi.programs.drawManager.sceneManager;
  const { gl } = keepTrackApi.programs.drawManager;
  sun.pMatrix = pMatrix;
  sun.camMatrix = camMatrix;

  if (!sun.isLoaded) return;

  gl.useProgram(sun.program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  gl.uniformMatrix3fv(sun.program.u_nMatrix, false, sun.nMatrix);
  gl.uniformMatrix4fv(sun.program.u_mvMatrix, false, sun.mvMatrix);
  gl.uniformMatrix4fv(sun.program.u_pMatrix, false, pMatrix);
  gl.uniformMatrix4fv(sun.program.u_camMatrix, false, camMatrix);
  gl.uniform3fv(sun.program.u_lightDir, earth.lightDirection);
  gl.uniform1f(sun.program.u_sunDistance, Math.sqrt(sun.pos[0] ** 2 + sun.pos[1] ** 2 + sun.pos[2] ** 2));

  gl.bindVertexArray(sun.vao);
  gl.drawElements(gl.TRIANGLES, sun.buffers.vertCount, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);
};
export const drawGodrays = (gl: WebGL2RenderingContext, tgtBuffer: WebGLFramebuffer) => {
  gl.useProgram(sun.godrays.program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  gl.depthMask(false);

  gl.uniform1i(sun.godrays.program.u_sampler, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sun.godrays.textureMap.texture);

  // Calculate sun position immediately before drawing godrays
  sun.screenPosition = _getScreenCoords(sun.pMatrix, sun.camMatrix);
  gl.uniform2f(sun.godrays.program.u_sunPosition, sun.screenPosition.x, sun.screenPosition.y);
  gl.uniform2f(sun.godrays.program.u_resolution, gl.canvas.width, gl.canvas.height);

  gl.bindVertexArray(sun.godrays.vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Future writing needs to have a depth test
  gl.depthMask(true);
};
export const _getScreenCoords = (pMatrix: glm.mat4, camMatrix: glm.mat4) => {
  const posVec4 = glm.vec4.fromValues(sun.pos[0], sun.pos[1], sun.pos[2], 1);

  glm.vec4.transformMat4(posVec4, posVec4, camMatrix);
  glm.vec4.transformMat4(posVec4, posVec4, pMatrix);

  // In 0.0 to 1.0 space
  const screenPosition = {
    x: posVec4[0] / posVec4[3],
    y: posVec4[1] / posVec4[3],
  };

  screenPosition.x = (screenPosition.x + 1) * 0.5; // * window.innerWidth;
  screenPosition.y = (-screenPosition.y + 1) * 0.5; // * window.innerHeight;

  return screenPosition;
};

/* ***************************************************************************
 * Export Code
 * ***************************************************************************/
const shaders = {
  sun: {
    frag: `#version 300 es
      precision highp float;
      uniform vec3 u_lightDir;
  
      in vec3 v_normal;    
      in float v_dist2;
  
      out vec4 fragColor;
  
      void main(void) {
          // Hide the Back Side of the Sphere to prevent duplicate suns
          float a = max(dot(v_normal, -u_lightDir), 0.1);                        
          // Set colors
          float r = 1.0 * a;
          float g = 1.0 * a;
          float b = 0.9 * a;
  
          if (v_dist2 > 1.0) {
          discard;
          }
  
          fragColor = vec4(vec3(r,g,b), a);
      }  
      `,
    vert: `#version 300 es
      in vec3 a_position;
      in vec3 a_normal;

      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;
      uniform float u_sunDistance;
  
      out vec3 v_normal;    
      out float v_dist2;
  
      void main(void) {
          vec4 position = u_mvMatrix * vec4(a_position / 1.6, 1.0);        
          gl_Position = u_pMatrix * u_camMatrix * position;         
          v_dist2 = distance(position.xyz,vec3(0.0,0.0,0.0)) / u_sunDistance;
          v_normal = u_nMatrix * a_normal;
      }
    `,
  },
  godrays: {
    frag: `#version 300 es    
    precision mediump float;

    // our texture
    uniform sampler2D u_sampler;

    uniform vec2 u_sunPosition;
    
    // the texCoords passed in from the vertex shader.
  in vec2 v_texCoord;

  out vec4 fragColor;
    
    void main() {
      float decay=1.0;
      float exposure=1.0;
      float density=1.0;
      float weight=0.021;
      vec2 lightPositionOnScreen = vec2(u_sunPosition.x,1.0 - u_sunPosition.y);      
      vec2 texCoord = v_texCoord;

      /// samples will describe the rays quality, you can play with
      const int samples = 75;      

      vec2 deltaTexCoord = (v_texCoord - lightPositionOnScreen.xy);
      deltaTexCoord *= 1.0 / float(samples) * density;
      float illuminationDecay = 1.0;
    vec4 color = texture(u_sampler, texCoord.xy);
      
      for(int i= 0; i <= samples ; i++)
      {
          if(samples < i) {
            break;
          }
          texCoord -= deltaTexCoord;
        vec4 texSample = texture(u_sampler, texCoord);
        texSample *= illuminationDecay * weight;
        color += texSample;
          illuminationDecay *= decay;
      }
        color *= exposure;
    fragColor = color;
    }
  `,
    vert: `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;

    uniform vec2 u_resolution;
    
    out vec2 v_texCoord;
    
    void main() {
      // convert the rectangle from pixels to 0.0 to 1.0
      vec2 zeroToOne = a_position / u_resolution;
    
      // convert from 0->1 to 0->2
      vec2 zeroToTwo = zeroToOne * 2.0;
    
      // convert from 0->2 to -1->+1 (clipspace)
      vec2 clipSpace = zeroToTwo - 1.0;
    
      gl_Position = vec4(clipSpace, 0, 1);
    
      // pass the texCoord to the fragment shader
      // The GPU will interpolate this value between points.
      v_texCoord = a_texCoord;
    }
  `,
  },
};
export const sun = <SunObject>{
  vao: <WebGLVertexArrayObject>null,
  buffers: {
    vertCount: 0,
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
    u_sunDistance: <WebGLUniformLocation>null,
    u_lightDir: <WebGLUniformLocation>null,
  },
  godrays: {
    vao: <WebGLVertexArrayObject>null,
    textureMap: {
      texture: <WebGLTexture>null,
    },
    renderBuffer: <WebGLRenderbuffer>null,
    frameBuffer: <WebGLFramebuffer>null,
    buffers: {
      vertCount: 0,
      vertPosBuf: <WebGLBuffer>null,
      texCoordBuf: <WebGLBuffer>null,
      vertNormBuf: <WebGLBuffer>null,
      vertIndexBuf: <WebGLBuffer>null,
    },
    program: {
      a_position: <number>null,
      a_texCoord: <number>null,
      a_normal: <number>null,
      u_pMatrix: <WebGLUniformLocation>null,
      u_camMatrix: <WebGLUniformLocation>null,
      u_mvMatrix: <WebGLUniformLocation>null,
      u_nMatrix: <WebGLUniformLocation>null,
      u_sunPosition: <WebGLUniformLocation>null,
      u_sampler: <WebGLUniformLocation>null,
      u_resolution: <WebGLUniformLocation>null,
    },
  },
  camMatrix: glm.mat4.create(),
  mvMatrix: glm.mat4.create(),
  pMatrix: glm.mat4.create(),
  nMatrix: glm.mat3.create(),
  init: init,
  initGodrays: initGodrays,
  update: update,
  draw: draw,
  drawGodrays: drawGodrays,
  screenPosition: {
    x: 0,
    y: 0,
  },
  eci: {
    x: 0,
    y: 0,
    z: 0,
  },
  sunvar: {
    gmst: 0,
    coord: 0,
    j: 0,
    jdo: 0,
    tp: {
      hz: {
        az: 0,
        alt: 0,
      },
    },
    g: 0,
    range: 0,
    azimuth: 0,
    elevation: 0,
    hz: 0,
    R: 0,
  },
  pos: [0, 0, 0],
  now: new Date(),
  isLoaded: false,
};

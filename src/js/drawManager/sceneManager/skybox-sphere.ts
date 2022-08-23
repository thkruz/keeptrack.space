import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { DEG2RAD } from '@app/js/lib/constants';
import * as glm from 'gl-matrix';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

/* ***************************************************************************
 * Initialization Code
 * ***************************************************************************/
const NUM_LAT_SEGS = 16;
const NUM_LON_SEGS = 16;
const DRAW_RADIUS = 260000;
export const init = async () => {
  const { gl } = keepTrackApi.programs.drawManager;

  initProgram(gl);
  initTextures(gl);
  initBuffers(gl);
  initVao(gl);

  skyboxSphere.isLoaded = true;
};
export const initProgram = (gl: WebGL2RenderingContext) => {
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, shaders.skyboxSphere.frag);
  gl.compileShader(fragShader);

  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, shaders.skyboxSphere.vert);
  gl.compileShader(vertShader);

  skyboxSphere.program = <any>gl.createProgram();
  gl.attachShader(skyboxSphere.program, vertShader);
  gl.attachShader(skyboxSphere.program, fragShader);
  gl.linkProgram(skyboxSphere.program);

  // Assign Attributes
  skyboxSphere.program.a_position = gl.getAttribLocation(skyboxSphere.program, 'a_position');
  skyboxSphere.program.a_normal = gl.getAttribLocation(skyboxSphere.program, 'a_normal');
  skyboxSphere.program.a_texCoord = gl.getAttribLocation(skyboxSphere.program, 'a_texCoord');
  skyboxSphere.program.u_pMatrix = gl.getUniformLocation(skyboxSphere.program, 'u_pMatrix');
  skyboxSphere.program.u_camMatrix = gl.getUniformLocation(skyboxSphere.program, 'u_camMatrix');
  skyboxSphere.program.u_mvMatrix = gl.getUniformLocation(skyboxSphere.program, 'u_mvMatrix');
  skyboxSphere.program.u_nMatrix = gl.getUniformLocation(skyboxSphere.program, 'u_nMatrix');
  skyboxSphere.program.u_texMilkyWay = gl.getUniformLocation(skyboxSphere.program, 'u_texMilkyWay');
  skyboxSphere.program.u_texBoundaries = gl.getUniformLocation(skyboxSphere.program, 'u_texBoundaries');
  skyboxSphere.program.u_texConstellations = gl.getUniformLocation(skyboxSphere.program, 'u_texConstellations');
  skyboxSphere.program.u_fMilkyWay = gl.getUniformLocation(skyboxSphere.program, 'u_fMilkyWay');
};
export const initTextures = (gl: WebGL2RenderingContext) => {
  if (settingsManager.isDrawMilkyWay && !skyboxSphere.textureMilkyWay.loaded) {
    initTexture(gl, skyboxSphere.textureMilkyWay);
  }
  if (settingsManager.isDrawConstellationBoundaries && !skyboxSphere.textureBoundaries.loaded) {
    initTexture(gl, skyboxSphere.textureBoundaries);
  }
  if (settingsManager.isDrawNasaConstellations && !skyboxSphere.textureConstellations.loaded) {
    initTexture(gl, skyboxSphere.textureConstellations);
  }
};

export const initTexture = (gl: WebGL2RenderingContext, textureObj: any): void => {
  textureObj.texture = gl.createTexture();
  textureObj.img = new Image();
  textureObj.img.onload = function () {
    onTextureLoaded(gl, textureObj.texture, textureObj.img);
    textureObj.loaded = true;
  };
  textureObj.img.src = textureObj.src;
};

// TODO: TexImageSource note defined?
export const onTextureLoaded = (gl: WebGL2RenderingContext, texture: WebGLTexture, image: any): any => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
};

export const initBuffers = (gl: WebGL2RenderingContext) => {
  // generate a uvsphere bottom up, CCW order
  const vertPos = [];
  const vertNorm = [];
  const texCoord = [];
  for (let lat = 0; lat <= NUM_LAT_SEGS; lat++) {
    const latAngle = (Math.PI / NUM_LAT_SEGS) * lat - Math.PI / 2;
    const diskRadius = Math.cos(Math.abs(latAngle));
    const z = Math.sin(latAngle);
    for (let lon = 0; lon <= NUM_LON_SEGS; lon++) {
      // add an extra vertex for texture funness
      const lonAngle = ((Math.PI * 2) / NUM_LON_SEGS) * lon;
      const x = Math.cos(lonAngle) * diskRadius;
      const y = Math.sin(lonAngle) * diskRadius;
      const v = 1 - lat / NUM_LAT_SEGS;
      const u = 0.5 + lon / NUM_LON_SEGS; // may need to change to move map
      vertPos.push(x * DRAW_RADIUS);
      vertPos.push(y * DRAW_RADIUS);
      vertPos.push(z * DRAW_RADIUS);
      texCoord.push(u);
      texCoord.push(v);
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
  skyboxSphere.buffers.vertCount = vertIndex.length;

  skyboxSphere.buffers.texCoordBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyboxSphere.buffers.texCoordBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

  skyboxSphere.buffers.vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyboxSphere.buffers.vertPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

  skyboxSphere.buffers.vertNormBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyboxSphere.buffers.vertNormBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

  skyboxSphere.buffers.vertIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxSphere.buffers.vertIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);
};
export const initVao = (gl: WebGL2RenderingContext) => {
  // Make New Vertex Array Objects
  skyboxSphere.vao = gl.createVertexArray();
  gl.bindVertexArray(skyboxSphere.vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, skyboxSphere.buffers.vertPosBuf);
  gl.enableVertexAttribArray(skyboxSphere.program.a_position);
  gl.vertexAttribPointer(skyboxSphere.program.a_position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, skyboxSphere.buffers.vertNormBuf);
  gl.enableVertexAttribArray(skyboxSphere.program.a_normal);
  gl.vertexAttribPointer(skyboxSphere.program.a_normal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, skyboxSphere.buffers.texCoordBuf);
  gl.enableVertexAttribArray(skyboxSphere.program.a_texCoord);
  gl.vertexAttribPointer(skyboxSphere.program.a_texCoord, 2, gl.FLOAT, false, 0, 0);

  // Select the vertex indicies buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxSphere.buffers.vertIndexBuf);

  gl.bindVertexArray(null);
};

/* ***************************************************************************
 * Render Loop Code
 * ***************************************************************************/
export const update = () => {
  skyboxSphere.mvMatrix = glm.mat4.create();
  skyboxSphere.nMatrix = glm.mat3.create();
  glm.mat4.identity(skyboxSphere.mvMatrix);
  glm.mat4.rotateZ(skyboxSphere.mvMatrix, skyboxSphere.mvMatrix, -90 * DEG2RAD);
  glm.mat3.normalFromMat4(skyboxSphere.nMatrix, skyboxSphere.mvMatrix);
};
export const draw = function (pMatrix: glm.mat4, camMatrix: glm.mat4, tgtBuffer?: WebGLFramebuffer) {
  // Make sure there is something to draw
  if (!settingsManager.isDrawMilkyWay && !settingsManager.isDrawConstellationBoundaries && !settingsManager.isDrawNasaConstellations) return;

  const { gl } = keepTrackApi.programs.drawManager;
  skyboxSphere.pMatrix = pMatrix;
  skyboxSphere.camMatrix = camMatrix;
  if (!skyboxSphere.isLoaded) return;

  update();

  gl.useProgram(skyboxSphere.program);
  if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  // Set the uniforms
  gl.uniformMatrix3fv(skyboxSphere.program.u_nMatrix, false, skyboxSphere.nMatrix);
  gl.uniformMatrix4fv(skyboxSphere.program.u_mvMatrix, false, skyboxSphere.mvMatrix);
  gl.uniformMatrix4fv(skyboxSphere.program.u_pMatrix, false, pMatrix);
  gl.uniformMatrix4fv(skyboxSphere.program.u_camMatrix, false, camMatrix);

  if (settingsManager.isDrawMilkyWay) {
    gl.uniform1i(skyboxSphere.program.u_texMilkyWay, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyboxSphere.textureMilkyWay.texture);
  }

  if (settingsManager.isDrawConstellationBoundaries) {
    gl.uniform1i(skyboxSphere.program.u_texBoundaries, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, skyboxSphere.textureBoundaries.texture);
  } else {
    gl.uniform1i(skyboxSphere.program.u_texMilkyWay, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, skyboxSphere.textureMilkyWay.texture);
  }

  if (settingsManager.isDrawNasaConstellations) {
    gl.uniform1i(skyboxSphere.program.u_texConstellations, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, skyboxSphere.textureConstellations.texture);
  } else {
    gl.uniform1i(skyboxSphere.program.u_texMilkyWay, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, skyboxSphere.textureMilkyWay.texture);
  }

  // Figure out how bright the milky way should be to make the blending consistent
  // The more textures that are on the brighter the milky way needs to be
  let milkyWayMul;
  const factor1 = settingsManager.isDrawMilkyWay ? 1 : 0;
  const factor2 = settingsManager.isDrawConstellationBoundaries ? 1 : 0;
  const factor3 = settingsManager.isDrawNasaConstellations ? 1 : 0;
  const sum = factor1 + factor2 + factor3;
  if (sum === 3) milkyWayMul = 6;
  else if (sum === 2) milkyWayMul = 4;
  else if (sum === 1) milkyWayMul = 2;
  else milkyWayMul = 0;

  gl.uniform1f(skyboxSphere.program.u_fMilkyWay, milkyWayMul);

  gl.bindVertexArray(skyboxSphere.vao);
  gl.blendFunc(gl.ONE_MINUS_SRC_COLOR, gl.ONE_MINUS_SRC_COLOR);
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);

  gl.drawElements(gl.TRIANGLES, skyboxSphere.buffers.vertCount, gl.UNSIGNED_SHORT, 0);

  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(null);
};

/* ***************************************************************************
 * Export Code
 * ***************************************************************************/
const shaders = {
  skyboxSphere: {
    frag: `#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
  
      uniform sampler2D u_texMilkyWay;
      uniform sampler2D u_texBoundaries;
      uniform sampler2D u_texConstellations;

      uniform float u_fMilkyWay;

      in vec2 v_texcoord;
      in vec3 v_normal;
      in float v_dist;

      out vec4 fragColor;
  
      void main(void) {
          // Don't draw the front of the sphere
          if (v_dist < 1.0) {
            discard;
          }
          
          // 20% goes to the boundaries
          vec4 vecBoundaries = texture(u_texBoundaries, v_texcoord) * 0.2;
          // 20% goes to the constellations
          vec4 vecConstellations = texture(u_texConstellations, v_texcoord) * 0.2;
          // 60% goes to the milky way no matter what
          vec4 vecMilkyWay = texture(u_texMilkyWay, v_texcoord) * u_fMilkyWay * 0.1;
          fragColor = vecMilkyWay + vecConstellations + vecBoundaries;
      }
      `,
    vert: `#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;
      
      in vec3 a_position;
      in vec2 a_texCoord;
      in vec3 a_normal;
    
      out vec2 v_texcoord;
      out vec3 v_normal;
      out float v_dist;
  
      void main(void) {
          vec4 position = u_mvMatrix * vec4(a_position, 1.0);
          gl_Position = u_pMatrix * u_camMatrix * position;

          // This lets us figure out which verticies are on the back half
          v_dist = distance(position.xyz,vec3(0.0,0.0,0.0));
          
          v_texcoord = a_texCoord;
          v_texcoord.x = 1.0 - v_texcoord.x;
          v_normal = u_nMatrix * a_normal;
      }
      `,
  },
};

export type SkyBoxSphere = typeof skyboxSphere;
export const skyboxSphere = {
  vao: <WebGLVertexArrayObject>null,
  textureMilkyWay: {
    img: <HTMLImageElement>null,
    src: `${settingsManager.installDirectory}textures/skybox8k.jpg`,
    texture: <WebGLTexture>null,
    loaded: false,
  },
  textureBoundaries: {
    isReady: false,
    img: <HTMLImageElement>null,
    src: `${settingsManager.installDirectory}textures/skyboxBoundaries8k.jpg`,
    texture: <WebGLTexture>null,
    loaded: false,
  },
  textureConstellations: {
    isReady: false,
    img: <HTMLImageElement>null,
    src: `${settingsManager.installDirectory}textures/skyboxConstellations8k.jpg`,
    texture: <WebGLTexture>null,
    loaded: false,
  },
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
    a_texCoord: <number>null,
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_nMatrix: <WebGLUniformLocation>null,
    u_texMilkyWay: <WebGLUniformLocation>null,
    u_texBoundaries: <WebGLUniformLocation>null,
    u_texConstellations: <WebGLUniformLocation>null,
    u_fMilkyWay: <WebGLUniformLocation>null,
  },
  camMatrix: glm.mat4.create(),
  mvMatrix: glm.mat4.create(),
  pMatrix: glm.mat4.create(),
  nMatrix: glm.mat3.create(),
  init: init,
  update: update,
  draw: draw,
  isLoaded: false,
};

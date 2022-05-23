import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import { SunCalc } from '@app/js/lib/suncalc.js';
import { satellite } from '@app/js/satMath/satMath';
import * as glm from 'gl-matrix';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

/* ***************************************************************************
 * Initialization Code
 * ***************************************************************************/
const NUM_LAT_SEGS = 16;
const NUM_LON_SEGS = 16;
const DRAW_RADIUS = 2500;
const SCALAR_DISTANCE = 200000;
export const init = async () => {
  const { gl } = keepTrackApi.programs.drawManager;

  initProgram(gl);
  initTextures(gl);
  initBuffers(gl);
  initVao(gl);

  moon.isLoaded = true;
};
export const initProgram = (gl: WebGL2RenderingContext) => {
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, shaders.moon.frag);
  gl.compileShader(fragShader);

  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, shaders.moon.vert);
  gl.compileShader(vertShader);

  moon.program = <any>gl.createProgram();
  gl.attachShader(moon.program, vertShader);
  gl.attachShader(moon.program, fragShader);
  gl.linkProgram(moon.program);

  // Assign Attributes
  moon.program.a_position = gl.getAttribLocation(moon.program, 'a_position');
  moon.program.a_normal = gl.getAttribLocation(moon.program, 'a_normal');
  moon.program.a_texCoord = gl.getAttribLocation(moon.program, 'a_texCoord');
  moon.program.u_pMatrix = gl.getUniformLocation(moon.program, 'u_pMatrix');
  moon.program.u_camMatrix = gl.getUniformLocation(moon.program, 'u_camMatrix');
  moon.program.u_mvMatrix = gl.getUniformLocation(moon.program, 'u_mvMatrix');
  moon.program.u_nMatrix = gl.getUniformLocation(moon.program, 'u_nMatrix');
  moon.program.u_sunPos = gl.getUniformLocation(moon.program, 'u_sunPos');
  moon.program.u_drawPosition = gl.getUniformLocation(moon.program, 'u_drawPosition');
  moon.program.u_sampler = gl.getUniformLocation(moon.program, 'u_sampler');
};
export const initTextures = (gl: WebGL2RenderingContext) => {
  moon.textureMap.texture = gl.createTexture();
  moon.textureMap.img = new Image();
  moon.textureMap.img.onload = function () {
    onTextureLoaded(gl);
  };
  moon.textureMap.img.src = moon.textureMap.src;
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
  moon.buffers.vertCount = vertIndex.length;

  moon.buffers.texCoordBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moon.buffers.texCoordBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

  moon.buffers.vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moon.buffers.vertPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

  moon.buffers.vertNormBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moon.buffers.vertNormBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

  moon.buffers.vertIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moon.buffers.vertIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);
};
export const initVao = (gl: WebGL2RenderingContext) => {
  // Make New Vertex Array Objects
  moon.vao = gl.createVertexArray();
  gl.bindVertexArray(moon.vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, moon.buffers.vertPosBuf);
  gl.enableVertexAttribArray(moon.program.a_position);
  gl.vertexAttribPointer(moon.program.a_position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, moon.buffers.vertNormBuf);
  gl.enableVertexAttribArray(moon.program.a_normal);
  gl.vertexAttribPointer(moon.program.a_normal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, moon.buffers.texCoordBuf);
  gl.enableVertexAttribArray(moon.program.a_texCoord);
  gl.vertexAttribPointer(moon.program.a_texCoord, 2, gl.FLOAT, false, 0, 0);

  // Select the vertex indicies buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moon.buffers.vertIndexBuf);

  gl.bindVertexArray(null);
};

/* ***************************************************************************
 * Render Loop Code
 * ***************************************************************************/
export const update = () => {
  const { sun } = keepTrackApi.programs.drawManager.sceneManager;
  // Calculate RAE
  moon.rae = SunCalc.getMoonPosition(sun.now, 0, 0);

  // RAE2ECF and then ECF2ECI
  moon.eci = satellite.ecfToEci(satellite.lookAngles2Ecf(180 + moon.rae.azimuth * RAD2DEG, moon.rae.altitude * RAD2DEG, moon.rae.distance, 0, 0, 0), sun.sunvar.gmst);

  const scaleFactor = SCALAR_DISTANCE / Math.max(Math.max(Math.abs(moon.eci.x), Math.abs(moon.eci.y)), Math.abs(moon.eci.z));
  moon.drawPosition[0] = moon.eci.x * scaleFactor + moon.positionModifier.x;
  moon.drawPosition[1] = moon.eci.y * scaleFactor + moon.positionModifier.y;
  moon.drawPosition[2] = moon.eci.z * scaleFactor + moon.positionModifier.z;

  moon.mvMatrix = glm.mat4.create();
  moon.nMatrix = glm.mat3.create();
  glm.mat4.identity(moon.mvMatrix);
  glm.mat4.translate(moon.mvMatrix, moon.mvMatrix, glm.vec3.fromValues(moon.drawPosition[0], moon.drawPosition[1], moon.drawPosition[2]));
  glm.mat3.normalFromMat4(moon.nMatrix, moon.mvMatrix);
};
export const draw = function (pMatrix: glm.mat4, camMatrix: glm.mat4, tgtBuffer?: WebGLFramebuffer) {
  const { gl } = keepTrackApi.programs.drawManager;
  moon.pMatrix = pMatrix;
  moon.camMatrix = camMatrix;
  if (!moon.isLoaded) return;

  update();

  gl.useProgram(moon.program);
  if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  // Set the uniforms
  gl.uniformMatrix3fv(moon.program.u_nMatrix, false, moon.nMatrix);
  gl.uniformMatrix4fv(moon.program.u_mvMatrix, false, moon.mvMatrix);
  gl.uniformMatrix4fv(moon.program.u_pMatrix, false, pMatrix);
  gl.uniformMatrix4fv(moon.program.u_camMatrix, false, camMatrix);
  const { sun } = keepTrackApi.programs.drawManager.sceneManager;
  gl.uniform3fv(moon.program.u_sunPos, glm.vec3.fromValues(sun.pos[0] * 100, sun.pos[1] * 100, sun.pos[2] * 100));
  gl.uniform1f(moon.program.u_drawPosition, Math.sqrt(moon.drawPosition[0] ** 2 + moon.drawPosition[1] ** 2 + moon.drawPosition[2] ** 2));

  gl.uniform1i(moon.program.u_sampler, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, moon.textureMap.texture);

  gl.bindVertexArray(moon.vao);
  gl.drawElements(gl.TRIANGLES, moon.buffers.vertCount, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);
};

/* ***************************************************************************
 * Export Code
 * ***************************************************************************/
const shaders = {
  moon: {
    frag: `#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
  
      uniform sampler2D u_sampler;
      uniform vec3 u_sunPos;

      in vec2 v_texcoord;
      in vec3 v_normal;
      in float v_dist;

      out vec4 fragColor;
  
      void main(void) {
          // sun is shining opposite of its direction from the center of the earth
          vec3 lightDirection = u_sunPos - vec3(0.0,0.0,0.0);

          // Normalize this to a max of 1.0
          lightDirection = normalize(lightDirection);
  
          // Smooth the light across the sphere
          float lightFrommoon = max(dot(v_normal, lightDirection), 0.0)  * 1.0;
          
          // Calculate the color by merging the texture with the light
          vec3 litTexColor = texture(u_sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFrommoon);
  
          // Don't draw the back of the sphere
          if (v_dist > 1.0) {
            discard;
          }
  
          fragColor = vec4(litTexColor, 1.0);
      }
      `,
    vert: `#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;
      uniform float u_drawPosition;
      
      in vec3 a_position;
      in vec2 a_texCoord;
      in vec3 a_normal;
    
      out vec2 v_texcoord;
      out vec3 v_normal;
      out float v_dist;
  
      void main(void) {
          vec4 position = u_mvMatrix * vec4(a_position, 1.0);
          gl_Position = u_pMatrix * u_camMatrix * position;

          // Ratio of the vertex distance compared to the center of the sphere
          // This lets us figure out which verticies are on the back half
          v_dist = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ u_drawPosition;
          
          v_texcoord = a_texCoord;
          v_normal = u_nMatrix * a_normal;
      }
      `,
  },
};
export const moon = {
  vao: <WebGLVertexArrayObject>null,
  textureMap: {
    isReady: false,
    img: <HTMLImageElement>null,
    src: `${settingsManager.installDirectory}textures/moon-1024.jpg`,
    texture: <WebGLTexture>null,
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
    u_sunPos: <WebGLUniformLocation>null,
    u_drawPosition: <WebGLUniformLocation>null,
    u_sampler: <WebGLUniformLocation>null,
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
      u_moonPosition: <WebGLUniformLocation>null,
      u_sampler: <WebGLUniformLocation>null,
      u_resolution: <WebGLUniformLocation>null,
    },
  },
  camMatrix: glm.mat4.create(),
  mvMatrix: glm.mat4.create(),
  pMatrix: glm.mat4.create(),
  nMatrix: glm.mat3.create(),
  init: init,
  update: update,
  draw: draw,
  eci: { x: 0, y: 0, z: 0 },
  rae: { azimuth: 0, altitude: 0, distance: 0 },
  positionModifier: { x: 0, y: 0, z: 0 },
  drawPosition: [0, 0, 0],
  pos: [0, 0, 0],
  isLoaded: false,
};
export const onTextureLoaded = (gl: WebGL2RenderingContext): any => {
  gl.bindTexture(gl.TEXTURE_2D, moon.textureMap.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, moon.textureMap.img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);

  moon.textureMap.isReady = true;
};

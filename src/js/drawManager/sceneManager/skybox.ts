import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { DEG2RAD } from '@app/js/lib/constants';
import * as glm from 'gl-matrix';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

/* ***************************************************************************
 * Initialization Code
 * ***************************************************************************/
export const init = async () => {
  const { gl } = keepTrackApi.programs.drawManager;

  initProgram(gl);
  initTextures(gl);
  initBuffers(gl);

  skybox.isLoaded = true;
};
export const initProgram = (gl: WebGL2RenderingContext) => {
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, shaders.skybox.frag);
  gl.compileShader(fragShader);

  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, shaders.skybox.vert);
  gl.compileShader(vertShader);

  skybox.program = <any>gl.createProgram();
  gl.attachShader(skybox.program, vertShader);
  gl.attachShader(skybox.program, fragShader);
  gl.linkProgram(skybox.program);

  // Assign Attributes
  skybox.program.a_position = gl.getAttribLocation(skybox.program, 'a_position');
  skybox.program.u_pMatrix = gl.getUniformLocation(skybox.program, 'u_pMatrix');
  skybox.program.u_camMatrix = gl.getUniformLocation(skybox.program, 'u_camMatrix');
  skybox.program.u_mvMatrix = gl.getUniformLocation(skybox.program, 'u_mvMatrix');
  skybox.program.u_nMatrix = gl.getUniformLocation(skybox.program, 'u_nMatrix');
  skybox.program.u_skybox = gl.getUniformLocation(skybox.program, 'u_skybox');
  skybox.program.u_viewDirProjInvLoc = gl.getUniformLocation(skybox.program, 'u_viewDirectionProjectionInverse');
};
export const initTextures = (gl: WebGL2RenderingContext) => {
  skybox.textureMap.texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.textureMap.texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: './textures/skybox/right.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: './textures/skybox/left.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: './textures/skybox/top.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: './textures/skybox/bottom.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: './textures/skybox/front.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: './textures/skybox/back.png',
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 4096;
    const height = 4096;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.onload = function () {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.textureMap.texture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    };
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
};
export const initBuffers = (gl: WebGL2RenderingContext) => {
  const vertPos = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  vertPos.forEach((_v, i) => {
    vertPos[i] *= 10000;
  });
  skybox.buffers.vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skybox.buffers.vertPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
};

/* ***************************************************************************
 * Render Loop Code
 * ***************************************************************************/
export const update = (pMatrix: glm.mat4, camMatrix: glm.mat4, gl: WebGL2RenderingContext) => {
  // Make a view matrix from the camera matrix.
  const viewMatrix = glm.mat4.create();
  glm.mat4.invert(viewMatrix, camMatrix);

  // We only care about direciton so remove the translation
  viewMatrix[12] = 0;
  viewMatrix[13] = 0;
  viewMatrix[14] = 0;

  const viewDirectionProjectionMatrix = glm.mat4.create();
  glm.mat4.mul(viewDirectionProjectionMatrix, pMatrix, viewMatrix);

  const viewDirectionProjectionInverseMatrix = glm.mat4.create();
  glm.mat4.invert(viewDirectionProjectionInverseMatrix, viewDirectionProjectionMatrix);

  // Set the uniforms
  gl.uniformMatrix4fv(skybox.program.u_viewDirProjInvLoc, false, viewDirectionProjectionInverseMatrix);
};
export const draw = function (_pMatrix: glm.mat4, camMatrix: glm.mat4, tgtBuffer?: WebGLFramebuffer) {
  const { gl } = keepTrackApi.programs.drawManager;
  // Compute the projection matrix
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const pMatrix = glm.mat4.create();
  glm.mat4.perspective(pMatrix, 20 * DEG2RAD, aspect, settingsManager.zNear, settingsManager.zFar);

  skybox.pMatrix = pMatrix;
  skybox.camMatrix = camMatrix;
  if (!skybox.isLoaded) return;

  gl.enable(gl.CULL_FACE);
  gl.depthFunc(gl.LEQUAL);
  gl.useProgram(skybox.program);
  if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  update(pMatrix, camMatrix, gl);

  // Set the uniforms
  gl.uniform1i(skybox.program.u_skybox, 0);

  gl.enableVertexAttribArray(skybox.program.a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, skybox.buffers.vertPosBuf);
  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2; // 2 components per iteration
  var type = gl.FLOAT; // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(skybox.program.a_position, size, type, normalize, stride, offset);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.depthFunc(gl.LESS);
  gl.disable(gl.CULL_FACE);
};

/* ***************************************************************************
 * Export Code
 * ***************************************************************************/
const shaders = {
  skybox: {
    // Frag Shader for Skybox
    frag: `#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
  
      uniform samplerCube u_skybox;
      uniform mat4 u_viewDirectionProjectionInverse;

      in vec4 v_position;
      out vec4 fragColor;
      
      // Use textureCube and Normals
      void main() {
        vec4 t = u_viewDirectionProjectionInverse * v_position;
        fragColor = 0.15 * texture(u_skybox, normalize(t.xyz / t.w));
      }
      `,
    // Vert Shader for Skybox
    vert: `#version 300 es
      in vec4 a_position;
      out vec4 v_position;
  
      void main(void) {
        v_position = a_position;
        gl_Position = a_position;
        gl_Position.z = 1.0;
      }
      `,
  },
};
export const skybox = {
  vao: <WebGLVertexArrayObject>null,
  textureMap: {
    isReady: false,
    img: <HTMLImageElement>null,
    src: null,
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
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_nMatrix: <WebGLUniformLocation>null,
    u_skybox: <WebGLUniformLocation>null,
    u_viewDirProjInvLoc: <WebGLUniformLocation>null,
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

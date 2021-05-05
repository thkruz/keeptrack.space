/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */

// eslint-disable-next-line max-classes-per-file
import * as glm from '@app/js/lib/external/gl-matrix.js';
import * as twgl from 'twgl.js';
import { DEG2RAD } from '@app/js/lib/constants.js';

class Atmosphere {
  /* istanbul ignore next */
  constructor(gl, earth, settingsManager) {
    // Move to the code the creates the moon?
    if (settingsManager.enableLimitedUI || settingsManager.isDrawLess) return;
    // twgl doesn't work in jest at the moment (5/1/2021)
    if (typeof process !== 'undefined') return;

    this.NUM_LAT_SEGS = 64;
    this.NUM_LON_SEGS = 64;

    // Setup References to World
    this.gl = gl;
    this.earth = earth;

    this.setupShaderCode();

    // We draw the moon way closer than it actually is because of depthBuffer issues
    // Each draw loop we will scale the real position so it is consistent
    this.drawPosition = [0, 0, 0];

    // Create these once and reuse them a lot
    this.mvMatrixEmpty = glm.mat4.create();
    this.nMatrixEmpty = glm.mat3.create();

    // Create a gl program from the vert/frag shaders
    this.programInfo = twgl.createProgramInfo(gl, [this.shaderCode.vert, this.shaderCode.frag]);

    // Create buffers from the geomerty
    this.bufferInfo = twgl.primitives.createSphereBufferInfo(gl, settingsManager.atmosphereSize, this.NUM_LON_SEGS, this.NUM_LAT_SEGS);

    this.loaded = true;
  }

  /* istanbul ignore next */
  updateUniforms(pMatrix, camMatrix) {
    this.mvMatrix = glm.mat4.create();
    this.nMatrix = glm.mat3.create();
    glm.mat4.identity(this.mvMatrix);
    glm.mat4.translate(this.mvMatrix, this.mvMatrix, this.drawPosition);
    glm.mat3.normalFromMat4(this.nMatrix, this.mvMatrix);

    this.uniforms = {
      u_nMatrix: this.nMatrix,
      u_mvMatrix: this.mvMatrix,
      u_pMatrix: pMatrix,
      u_camMatrix: camMatrix,
      u_lightDirection: this.earth.lightDirection,
    };
  }

  /* istanbul ignore next */
  draw(pMatrix, cameraManager) {
    // Move this to the draw loop?
    if (!this.loaded) return;
    const gl = this.gl;

    this.update(cameraManager.camPitch);
    this.updateUniforms(pMatrix, cameraManager.camMatrix);

    // This is done during sun.draw
    gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // ignore depth test (especially on self)
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
    twgl.setUniforms(this.programInfo, this.uniforms);
    twgl.drawBufferInfo(gl, this.bufferInfo);

    // Disable blending and reeneable depth test
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);

    // Done Drawing
    return true;
  }

  /* istanbul ignore next */
  update(camPitch) {
    // Start with an empyy model view matrix
    this.mvMatrix = glm.mat4.create();

    glm.mat4.identity(this.mvMatrix);
    // Rotate model view matrix to prevent lines showing as camera rotates
    glm.mat4.rotateY(this.mvMatrix, this.mvMatrix, 90 * DEG2RAD - camPitch);
    // Scale the atmosphere to 0,0,0 - needed?
    glm.mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, 0]);
    // Calculate normals
    this.nMatrix = glm.mat3.create();
    glm.mat3.normalFromMat4(this.nMatrix, this.mvMatrix);
  }

  /* istanbul ignore next */
  setupShaderCode() {
    this.shaderCode = {
      frag: `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
        #else
          precision mediump float;
        #endif
  
        uniform vec3 u_lightDirection;
        varying vec3 v_normal;
        varying float v_dist;
  
        void main () {
            float sunAmount = max(dot(v_normal, u_lightDirection), 0.1);
            float darkAmount = max(dot(v_normal, -u_lightDirection), 0.0);
            float a4 = pow(1.3 - v_dist / 2.0, 1.1) * 2.0;
            float r = 1.0 - sunAmount;
            float g = max(1.0 - sunAmount, 0.75) - darkAmount;
            float b = max(sunAmount, 0.8) - darkAmount;
            float a1 = min(sunAmount, 0.8) * 2.0;
            float a2 = min(pow(darkAmount / 1.15, 2.0),0.2);
            float a3 = pow(v_dist,2.0) * -1.0 + 1.2;
            float a = min(a1 - a2, a3) * a4;
            gl_FragColor    = vec4(vec3(r,g,b), a);
        }
        `,
      vert: `
        attribute vec3 position;
        attribute vec3 normal;
  
        uniform mat4 u_pMatrix;
        uniform mat4 u_camMatrix;
        uniform mat4 u_mvMatrix;
        uniform mat3 u_nMatrix;
  
        varying vec3 v_normal;
        varying float v_dist;
  
        void main(void) {
            vec4 position1 = u_camMatrix * u_mvMatrix * vec4(position, 1.0);
            vec4 position0 = u_camMatrix * u_mvMatrix * vec4(vec3(0.0,0.0,0.0), 1.0);
            gl_Position = u_pMatrix * position1;
            v_dist = distance(position0.xz,position1.xz) \/ ${settingsManager.atmosphereSize}.0;
            v_normal = normalize( u_nMatrix * normal );
        }
        `,
    };
  }
}

export { Atmosphere };

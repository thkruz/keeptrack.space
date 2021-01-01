/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */

// eslint-disable-next-line max-classes-per-file
import * as glm from '@app/js/lib/gl-matrix.js';
import * as twgl from 'twgl.js';
import { SunCalc } from '@app/js/suncalc.js';
import { mathValue } from '@app/js/helpers.js';
import { satellite } from '@app/js/lookangles.js';

class Moon {
  static NUM_LAT_SEGS = 32;
  static NUM_LON_SEGS = 32;
  static DRAW_RADIUS = 4000;
  static SCALAR_DISTANCE = 200000;
  static textureSrc = 'textures/moon-1024.jpg';
  // static ambientLight = [0.05, 0.05, 0.05];
  static ambientLight = [0.0025, 0.0025, 0.0025];

  constructor(gl, sun) {
    // Move to the code the creates the moon?
    if (settingsManager.enableLimitedUI || settingsManager.isDrawLess) return;

    // Setup References to World
    this.gl = gl;
    this.sun = sun;

    // We draw the moon way closer than it actually is because of depthBuffer issues
    // Each draw loop we will scale the real position so it is consistent
    this.drawPosition = [0, 0, 0];

    // Create these once and reuse them a lot
    this.mvMatrixEmpty = glm.mat4.create();
    this.nMatrixEmpty = glm.mat3.create();

    // Create a gl program from the vert/frag shaders
    this.programInfo = twgl.createProgramInfo(gl, [Moon.shaders.vert, Moon.shaders.frag]);

    // Create a texture from the moon's texture
    this.texture = twgl.createTexture(
      gl,
      {
        src: Moon.textureSrc,
        mag: gl.LINEAR,
        min: gl.LINEAR,
        wrapS: gl.REPEAT,
      },
      () => {
        this.loaded = true;
      }
    );

    // Create buffers from the geomerty
    this.bufferInfo = twgl.primitives.createSphereBufferInfo(gl, Moon.DRAW_RADIUS, Moon.NUM_ON_SEGS, Moon.NUM_LAT_SEGS);
  }

  updateUniforms(pMatrix, camMatrix) {
    this.mvMatrix = this.mvMatrixEmpty;
    this.nMatrix = this.nMatrixEmpty;
    glm.mat4.identity(this.mvMatrix);
    glm.mat4.translate(this.mvMatrix, this.mvMatrix, this.drawPosition);
    glm.mat3.normalFromMat4(this.nMatrix, this.mvMatrix);

    this.uniforms = {
      u_nMatrix: this.nMatrix,
      u_mvMatrix: this.mvMatrix,
      u_pMatrix: pMatrix,
      u_camMatrix: camMatrix,
      u_sunPos: this.sun.pos2,
      u_drawPosition: Math.sqrt(this.drawPosition[0] ** 2 + this.drawPosition[1] ** 2 + this.drawPosition[2] ** 2),
      u_ambientLight: Moon.ambientLight,
    };
  }

  draw(pMatrix, camMatrix) {
    // Move this to the draw loop?
    if (!this.loaded) return;
    const gl = this.gl;

    this.updatePosition(this.sun);
    this.updateUniforms(pMatrix, camMatrix);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
    twgl.setUniforms(this.programInfo, this.uniforms);
    twgl.drawBufferInfo(gl, this.bufferInfo);

    gl.disableVertexAttribArray(this.programInfo.program.aTexCoord);
    gl.disableVertexAttribArray(this.programInfo.program.aVertexPosition);
    gl.disableVertexAttribArray(this.programInfo.program.aVertexNormal);

    // Done Drawing
    return true;
  }

  updatePosition(sun) {
    // Calculate RAE
    this.rae = SunCalc.getMoonPosition(sun.now, 0, 0);

    // RAE2ECF and then ECF2ECI
    this.position = satellite.ecfToEci(satellite.lookAnglesToEcf(180 + this.rae.azimuth * mathValue.RAD2DEG, this.rae.altitude * mathValue.RAD2DEG, this.rae.distance, 0, 0, 0), sun.sunvar.gmst);

    const scaleFactor = Moon.SCALAR_DISTANCE / Math.max(Math.max(Math.abs(this.position.x), Math.abs(this.position.y)), Math.abs(this.position.z));
    this.drawPosition[0] = this.position.x * scaleFactor;
    this.drawPosition[1] = this.position.y * scaleFactor;
    this.drawPosition[2] = this.position.z * scaleFactor;
  }

  static shaders = {
    frag: `
      precision mediump float;
  
      uniform vec3 u_ambientLight;
      uniform sampler2D u_sampler;
      uniform vec3 u_sunPos;

      varying vec2 v_texcoord;
      varying vec3 v_normal;
      varying float v_dist;
  
      void main(void) {
          // Sun is shining opposite of its direction from the center of the earth
          vec3 lightDirection = u_sunPos - vec3(0.0,0.0,0.0);

          // Normalize this to a max of 1.0
          lightDirection = normalize(lightDirection);
  
          // Smooth the light across the sphere
          float lightFromSun = max(dot(v_normal, lightDirection), 0.0)  * 1.0;
          
          // Calculate the color by merging the texture with the light
          vec3 litTexColor = texture2D(u_sampler, v_texcoord).rgb * (u_ambientLight + lightFromSun);
  
          // Don't draw the back of the sphere
          if (v_dist > 1.0) {
            discard;
          }
  
          gl_FragColor = vec4(litTexColor, 1.0);
      }
      `,
    vert: `
      attribute vec3 a_position;
      attribute vec2 a_texcoord;
      attribute vec3 a_normal;
  
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_normalMatrix;
      uniform float u_drawPosition;
  
      varying vec2 v_texcoord;
      varying vec3 v_normal;
      varying float v_dist;
  
      void main(void) {
          vec4 position = u_mvMatrix * vec4(a_position, 1.0);
          gl_Position = u_pMatrix * u_camMatrix * position;

          // Ratio of the vertex distance compared to the center of the sphere
          // This lets us figure out which verticies are on the back half
          v_dist = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ u_drawPosition;
          
          v_texcoord = a_texcoord;
          v_normal = u_normalMatrix * a_normal;
      }
      `,
  };
}

export { Moon };

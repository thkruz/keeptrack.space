/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */

// eslint-disable-next-line max-classes-per-file
import * as glm from '@app/js/lib/external/gl-matrix.js';
import * as twgl from 'twgl.js';
import { RAD2DEG } from '@app/js/lib/constants.js';
import { SunCalc } from '@app/js/lib/suncalc.js';
import { satellite } from '@app/js/lib/lookangles.js';

class Moon {
  static NUM_LAT_SEGS = 32;
  static NUM_LON_SEGS = 32;
  static DRAW_RADIUS = 4000;
  static SCALAR_DISTANCE = 200000;
  static textureSrc = 'textures/moon-1024.jpg';
  // static ambientLight = [0.05, 0.05, 0.05];
  static ambientLight = [0.0025, 0.0025, 0.0025];

  /* istanbul ignore next */
  constructor(gl, sun) {
    // Move to the code the creates the moon?
    if (settingsManager.enableLimitedUI || settingsManager.isDrawLess) return;
    // twgl doesn't work in jest at the moment (5/1/2021)
    if (typeof process !== 'undefined') return;

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
    this.bufferInfo = twgl.primitives.createSphereBufferInfo(gl, Moon.DRAW_RADIUS, Moon.NUM_LON_SEGS, Moon.NUM_LAT_SEGS);
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
      u_sunPos: this.sun.pos2,
      u_drawPosition: Math.sqrt(this.drawPosition[0] ** 2 + this.drawPosition[1] ** 2 + this.drawPosition[2] ** 2),
      u_ambientLight: Moon.ambientLight,
      u_sampler: this.texture,
    };
  }

  /* istanbul ignore next */
  draw(pMatrix, camMatrix, tgtBuffer) {
    // Move this to the draw loop?
    if (!this.loaded) return;
    const gl = this.gl;

    this.updatePosition(this.sun);
    this.updateUniforms(pMatrix, camMatrix);

    // This is done by sun.draw
    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
    twgl.setUniforms(this.programInfo, this.uniforms);

    // determine where we are drawing
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    twgl.drawBufferInfo(gl, this.bufferInfo);

    // gl.disableVertexAttribArray(this.programInfo.program.aTexCoord);
    // gl.disableVertexAttribArray(this.programInfo.program.aVertexPosition);
    // gl.disableVertexAttribArray(this.programInfo.program.aVertexNormal);

    // Done Drawing
    return true;
  }

  /* istanbul ignore next */
  updatePosition(sun) {
    // Calculate RAE
    this.rae = SunCalc.getMoonPosition(sun.now, 0, 0);

    // RAE2ECF and then ECF2ECI
    this.position = satellite.ecfToEci(satellite.lookAnglesToEcf(180 + this.rae.azimuth * RAD2DEG, this.rae.altitude * RAD2DEG, this.rae.distance, 0, 0, 0), sun.sunvar.gmst);

    const scaleFactor = Moon.SCALAR_DISTANCE / Math.max(Math.max(Math.abs(this.position.x), Math.abs(this.position.y)), Math.abs(this.position.z));
    this.drawPosition[0] = this.position.x * scaleFactor;
    this.drawPosition[1] = this.position.y * scaleFactor;
    this.drawPosition[2] = this.position.z * scaleFactor;
  }

  static shaders = {
    frag: `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
  
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
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;
      uniform float u_drawPosition;
      
      attribute vec3 position;
      attribute vec2 texcoord;
      attribute vec3 normal;
    
      varying vec2 v_texcoord;
      varying vec3 v_normal;
      varying float v_dist;
  
      void main(void) {
          vec4 position = u_mvMatrix * vec4(position, 1.0);
          gl_Position = u_pMatrix * u_camMatrix * position;

          // Ratio of the vertex distance compared to the center of the sphere
          // This lets us figure out which verticies are on the back half
          v_dist = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ u_drawPosition;
          
          v_texcoord = texcoord;
          v_normal = u_nMatrix * normal;
      }
      `,
  };
}

export { Moon };

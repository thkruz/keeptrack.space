import { SatCruncherMessageData } from '../interfaces';
import { GlUtils } from '../static/gl-utils';
/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { mat4 } from 'gl-matrix';
import { BaseObject, DetailedSatellite, EciVec3, Kilometers, KilometersPerSecond, SpaceObjectType } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { SettingsManager } from '../settings/settings';
import { BufferAttribute } from '../static/buffer-attribute';
import { WebGlProgramHelper } from '../static/webgl-program';
import { CameraType } from './camera';
import { MissileObject } from './catalog-manager/MissileObject';
import { WebGLRenderer } from './webgl-renderer';

declare module '@app/interfaces' {
  interface SatShader {
    maxSize: number;
    minSize: number;
  }

  interface SatCruncherMessageData {
    satInSun: Int8Array;
    satInView: Int8Array;
    satPos: Float32Array;
    satVel: Float32Array;
  }
}

/**
 * Class representing a manager for dots in a space visualization.
 */
export class DotsManager {
  readonly PICKING_READ_PIXEL_BUFFER_SIZE = 1;

  private pickingColorData: number[] = [];
  /*
   * We draw the picking object bigger than the actual dot to make it easier to select objects
   * glsl code - keep as a string
   */
  private positionBufferOneTime_ = false;
  private settings_: SettingsManager;
  // Array for which colors go to which ids
  private isSizeBufferOneTime_ = false;

  buffers = {
    position: <WebGLBuffer><unknown>null,
    size: <WebGLBuffer><unknown>null,
    color: <WebGLBuffer><unknown>null,
    pickability: <WebGLBuffer><unknown>null,
  };

  inSunData: Int8Array;
  inViewData: Int8Array;
  // TODO: Move to settings file
  isReady: boolean;
  pickReadPixelBuffer: Uint8Array;
  pickingBuffers = {
    position: <WebGLBuffer><unknown>null,
    color: <WebGLBuffer><unknown>null,
    pickability: <WebGLBuffer><unknown>null,
  };

  pickingRenderBuffer: WebGLRenderbuffer;
  pickingTexture: WebGLTexture;
  positionData: Float32Array;
  programs = {
    dots: {
      program: <WebGLProgram><unknown>null,
      attribs: {
        a_position: new BufferAttribute({
          location: 0,
          vertices: 3,
          offset: 0,
        }),
        a_color: new BufferAttribute({
          location: 1,
          vertices: 4,
          offset: 0,
        }),
        a_star: new BufferAttribute({
          location: 2,
          vertices: 1,
          offset: 0,
        }),
        a_pickable: new BufferAttribute({
          location: 3,
          vertices: 1,
          offset: 0,
        }),
      },
      uniforms: {
        u_pMvCamMatrix: <WebGLUniformLocation><unknown>null,
        u_minSize: <WebGLUniformLocation><unknown>null,
        u_maxSize: <WebGLUniformLocation><unknown>null,
      },
      vao: <WebGLVertexArrayObject><unknown>null,
    },
    picking: {
      program: <WebGLProgram><unknown>null,
      attribs: {
        a_position: new BufferAttribute({
          location: 0,
          vertices: 3,
          offset: 0,
        }),
        a_color: new BufferAttribute({
          location: 1,
          vertices: 4,
          offset: 0,
        }),
        a_pickable: new BufferAttribute({
          location: 2,
          vertices: 1,
          offset: 0,
        }),
      },
      uniforms: {
        u_pMvCamMatrix: <WebGLUniformLocation><unknown>null,
        u_minSize: <WebGLUniformLocation><unknown>null,
        u_maxSize: <WebGLUniformLocation><unknown>null,
      },
      vao: <WebGLVertexArrayObject><unknown>null,
    },
  };

  shaders_ = {
    dots: {
      vert: <string><unknown>null,
      frag: <string><unknown>null,
    },
    picking: {
      vert: <string><unknown>null,
      frag: <string><unknown>null,
    },
  };

  sizeData: Int8Array;
  starIndex1: number;
  starIndex2: number;
  velocityData: Float32Array;

  /**
   * Draws dots on a WebGLFramebuffer.
   * @param pMvCamMatrix - The projection matrix.
   * @param tgtBuffer - The WebGLFramebuffer to draw on.
   */
  draw(pMvCamMatrix: mat4, tgtBuffer: WebGLFramebuffer | null) {
    if (!this.isReady || !settingsManager.cruncherReady) {
      return;
    }
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    if (!colorSchemeManagerInstance.colorBuffer) {
      return;
    }
    if (!pMvCamMatrix) {
      return;
    }

    const gl = keepTrackApi.getRenderer().gl;

    gl.useProgram(this.programs.dots.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.uniformMatrix4fv(this.programs.dots.uniforms.u_pMvCamMatrix, false, pMvCamMatrix);

    if (keepTrackApi.getMainCamera().cameraType === CameraType.PLANETARIUM) {
      gl.uniform1f(this.programs.dots.uniforms.u_minSize, this.settings_.satShader.minSizePlanetarium);
      gl.uniform1f(this.programs.dots.uniforms.u_maxSize, this.settings_.satShader.maxSizePlanetarium);
    } else {
      gl.uniform1f(this.programs.dots.uniforms.u_minSize, this.settings_.satShader.minSize);
      gl.uniform1f(this.programs.dots.uniforms.u_maxSize, this.settings_.satShader.maxSize);
    }

    gl.bindVertexArray(this.programs.dots.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(this.programs.dots.attribs.a_position.location);
    /*
     * Buffering data here reduces the need to bind the buffer twice!
     * Either allocate and assign the data to the buffer
     */
    if (!this.positionBufferOneTime_) {
      gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.DYNAMIC_DRAW);
      this.positionBufferOneTime_ = true;
    } else {
      // Or just update it if we have already allocated it - the length won't change
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positionData);
    }
    gl.vertexAttribPointer(this.programs.dots.attribs.a_position.location, 3, gl.FLOAT, false, 0, 0);

    /*
     * DEBUG:
     * gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
     */
    gl.enable(gl.BLEND);
    gl.depthMask(false);

    // Should not be relying on sizeData -- but temporary
    gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen);
    gl.bindVertexArray(null);

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // Draw GPU Picking Overlay -- This is what lets us pick a satellite
    this.drawGpuPickingFrameBuffer(pMvCamMatrix, keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
  }

  /**
   * Draws the GPU picking frame buffer.
   * @param pMvCamMatrix - The projection, model view, and camera matrix.
   * @param mouseX - The x-coordinate of the mouse.
   * @param mouseY - The y-coordinate of the mouse.
   */
  drawGpuPickingFrameBuffer(pMvCamMatrix: mat4, mouseX: number, mouseY: number) {
    if (!this.isReady || !settingsManager.cruncherReady) {
      return;
    }
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    if (!colorSchemeManagerInstance.colorBuffer) {
      return;
    }
    const gl = keepTrackApi.getRenderer().gl;

    gl.useProgram(this.programs.picking.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, keepTrackApi.getScene().frameBuffers.gpuPicking);

    gl.uniformMatrix4fv(this.programs.picking.uniforms.u_pMvCamMatrix, false, pMvCamMatrix);

    // no reason to render 100000s of pixels when we're only going to read one
    if (!settingsManager.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(mouseX, gl.drawingBufferHeight - mouseY, this.PICKING_READ_PIXEL_BUFFER_SIZE, this.PICKING_READ_PIXEL_BUFFER_SIZE);
    }

    gl.bindVertexArray(this.programs.picking.vao);
    // Should not be relying on sizeData -- but temporary
    gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen);
    gl.bindVertexArray(null);

    if (!settingsManager.isMobileModeEnabled) {
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  /**
   * Returns the current position of the dot at the specified index.
   * @param i - The index of the dot.
   * @returns An object containing the x, y, and z coordinates of the dot's position.
   */
  getCurrentPosition(i: number) {
    return {
      x: <Kilometers>this.positionData[i * 3],
      y: <Kilometers>this.positionData[i * 3 + 1],
      z: <Kilometers>this.positionData[i * 3 + 2],
    };
  }

  /**
   * Returns the ID of the satellite closest to the given ECI coordinates.
   * @param eci - The ECI coordinates to search for.
   * @param maxDots - The maximum number of satellites to search through.
   * @returns The ID of the closest satellite, or null if no satellite is found within 100km.
   */
  getIdFromEci(eci: { x: number; y: number; z: number }, maxDots = this.positionData.length): number | null {
    const possibleMatches: { id: number; distance: number }[] = [];

    // loop through all the satellites
    for (let id = 0; id < maxDots; id++) {
      const x = this.positionData[id * 3];
      const y = this.positionData[id * 3 + 1];
      const z = this.positionData[id * 3 + 2];

      if (x > eci.x - 100 && x < eci.x + 100 && y > eci.y - 100 && y < eci.y + 100 && z > eci.z - 100 && z < eci.z + 100) {
        // if within 1km of the satellite, return it
        if (Math.sqrt((x - eci.x) ** 2 + (y - eci.y) ** 2 + (z - eci.z) ** 2) < 1) {
          return id;
        }

        // otherwise, add it to the list of possible matches
        possibleMatches.push({ id, distance: Math.sqrt((x - eci.x) ** 2 + (y - eci.y) ** 2 + (z - eci.z) ** 2) });
      }
    }

    // if there are possible matches, return the closest one
    if (possibleMatches.length > 0) {
      possibleMatches.sort((a, b) => a.distance - b.distance);

      return possibleMatches[0].id;
    }

    return null;
  }

  /**
   * Returns the inSunData array if it exists, otherwise returns an empty Int8Array.
   * @returns {Int8Array} The inSunData array or an empty Int8Array.
   */
  getSatInSun(): Int8Array {
    return this.inSunData ? this.inSunData : new Int8Array();
  }

  /**
   * Returns an Int8Array containing the satellites in view.
   * If there are no satellites in view, an empty Int8Array is returned.
   * @returns {Int8Array} An Int8Array containing the satellites in view.
   */
  getSatInView(): Int8Array {
    return this.inViewData ? this.inViewData : new Int8Array();
  }

  /**
   * Returns the velocity data if it exists, otherwise returns an empty Float32Array.
   * @returns {Float32Array} The velocity data or an empty Float32Array.
   */
  getSatVel(): Float32Array {
    return this.velocityData ? this.velocityData : new Float32Array();
  }

  /**
   * Initializes the dots manager with the given user settings.
   * @param settings - The user settings to use for initialization.
   */
  init(settings: SettingsManager) {
    const renderer = keepTrackApi.getRenderer();

    this.settings_ = settings;

    this.initShaders_();
    this.programs.dots.program = new WebGlProgramHelper(
      renderer.gl,
      this.shaders_.dots.vert,
      this.shaders_.dots.frag,
      this.programs.dots.attribs,
      this.programs.dots.uniforms,
    ).program;

    // Make buffers for satellite positions and size -- color and pickability are created in ColorScheme class
    this.buffers.position = renderer.gl.createBuffer();
    this.buffers.size = renderer.gl.createBuffer();

    this.initProgramPicking();
  }

  /**
   * Initializes the buffers required for rendering the dots and picking.
   * @param colorBuffer The color buffer to be shared between the color manager and the dots manager.
   */
  initBuffers(colorBuffer: WebGLBuffer) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    this.setupPickingBuffer(catalogManagerInstance.objectCache.length);
    this.updateSizeBuffer(catalogManagerInstance.objectCache.length);
    this.initColorBuffer(colorBuffer);
    this.initVao(); // Needs ColorBuffer first
  }

  /**
   * We need to share the color buffer between the color manager and the dots manager
   * TODO: colorManager should be part of dots manager
   */
  initColorBuffer(colorBuffer: WebGLBuffer) {
    this.buffers.color = colorBuffer;
  }

  /**
   * Initializes the GPU Picking program.
   *
   * This function creates a program from the picking shaders, assigns attributes and uniforms,
   * creates a framebuffer, texture, and renderbuffer for picking, and initializes a pixel buffer.
   */
  initProgramPicking() {
    const gl = keepTrackApi.getRenderer().gl;

    this.programs.picking.program = new WebGlProgramHelper(gl, this.shaders_.picking.vert, this.shaders_.picking.frag).program;

    GlUtils.assignAttributes(this.programs.picking.attribs, gl, this.programs.picking.program, ['a_position', 'a_color', 'a_pickable']);
    GlUtils.assignUniforms(this.programs.picking.uniforms, gl, this.programs.picking.program, ['u_pMvCamMatrix']);

    keepTrackApi.getScene().frameBuffers.gpuPicking = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, keepTrackApi.getScene().frameBuffers.gpuPicking);

    this.pickingTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    this.pickingRenderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingRenderBuffer);

    this.pickReadPixelBuffer = new Uint8Array(4 * this.PICKING_READ_PIXEL_BUFFER_SIZE * this.PICKING_READ_PIXEL_BUFFER_SIZE);
  }

  /**
   * Initializes the vertex array objects for the dots and picking programs.
   */
  initVao(): void {
    const gl = keepTrackApi.getRenderer().gl;

    // Dots Program
    this.programs.dots.vao = gl.createVertexArray();
    gl.bindVertexArray(this.programs.dots.vao);

    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);
    gl.enableVertexAttribArray(this.programs.dots.attribs.a_color.location);
    gl.vertexAttribPointer(this.programs.dots.attribs.a_color.location, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.enableVertexAttribArray(this.programs.dots.attribs.a_star.location);
    gl.vertexAttribPointer(this.programs.dots.attribs.a_star.location, 1, gl.UNSIGNED_BYTE, false, 0, 0);

    gl.bindVertexArray(null);

    // Picking Program
    this.programs.picking.vao = gl.createVertexArray();
    gl.bindVertexArray(this.programs.picking.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(this.programs.picking.attribs.a_position.location);
    gl.vertexAttribPointer(this.programs.picking.attribs.a_position.location, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickingBuffers.color);
    gl.enableVertexAttribArray(this.programs.picking.attribs.a_color.location);
    gl.vertexAttribPointer(this.programs.picking.attribs.a_color.location, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.pickableBuffer);
    gl.enableVertexAttribArray(this.programs.picking.attribs.a_pickable.location);
    gl.vertexAttribPointer(this.programs.picking.attribs.a_pickable.location, 1, gl.UNSIGNED_BYTE, false, 0, 0);

    gl.bindVertexArray(null);
  }

  /**
   * Resets the inSunData array to all zeros.
   */
  resetSatInSun(): void {
    this.inSunData = new Int8Array(this.inSunData.length);
    this.inSunData.fill(0);
  }

  /**
   * Resets the inViewData array to all zeroes.
   */
  resetSatInView(): void {
    this.inViewData = new Int8Array(this.inViewData.length);
    this.inViewData.fill(0);
  }

  /**
   * Sets up the picking buffer with colors assigned to ids in hex order.
   * @param satDataLen The length of the satellite data.
   */
  setupPickingBuffer(satDataLen = 1): void {
    // assign colors to ids in hex order
    let byteB: number, byteG: number, byteR: number; // reuse color variables

    for (let i = 0; i < satDataLen; i++) {
      byteR = (i + 1) & 0xff;
      byteG = ((i + 1) & 0xff00) >> 8;
      byteB = ((i + 1) & 0xff0000) >> 16;

      // Normalize colors to 1 and flatten them
      this.pickingColorData.push(byteR / 255.0);
      this.pickingColorData.push(byteG / 255.0);
      this.pickingColorData.push(byteB / 255.0);
    }

    const renderer = keepTrackApi.getRenderer();

    this.pickingBuffers.color = GlUtils.createArrayBuffer(renderer.gl, new Float32Array(this.pickingColorData));
  }

  /**
   * Updates the position, velocity, in-view and in-sun data buffers with the data received from the SatCruncher worker.
   * @param mData The data received from the SatCruncher worker.
   */
  updateCruncherBuffers(mData: SatCruncherMessageData) {
    if (mData.satPos) {
      if (typeof this.positionData === 'undefined') {
        this.positionData = new Float32Array(mData.satPos);
        this.isReady = true;
      } else {
        this.positionData.set(mData.satPos, 0);
      }
    }

    if (mData.satVel) {
      if (typeof this.velocityData === 'undefined') {
        this.velocityData = new Float32Array(mData.satVel);
      } else {
        this.velocityData.set(mData.satVel, 0);
      }
    }

    if (mData.satInView?.length > 0) {
      if (typeof this.inViewData === 'undefined' || this.inViewData.length !== mData.satInView.length) {
        this.inViewData = new Int8Array(mData.satInView);
      } else {
        this.inViewData.set(mData.satInView, 0);
      }
    }

    if (mData.satInSun?.length > 0) {
      if (typeof this.inSunData === 'undefined' || this.inSunData.length !== mData.satInSun.length) {
        this.inSunData = new Int8Array(mData.satInSun);
      } else {
        this.inSunData.set(mData.satInSun, 0);
      }
    }
  }

  /**
   * Updates the position and velocity of a satellite object based on the data stored in the `positionData` and `velocityData` arrays.
   * @param object The satellite object to update.
   * @param i The index of the satellite in the `positionData` and `velocityData` arrays.
   */
  updatePosVel(object: BaseObject, i: number): void {
    if (!this.velocityData) {
      return;
    }

    /*
     * Fix for https://github.com/thkruz/keeptrack.space/issues/834
     * TODO: Remove this once we figure out why this is happening
     */

    object.velocity = { x: 0, y: 0, z: 0 } as EciVec3<KilometersPerSecond>;
    object.totalVelocity = 0;

    const isChanged = object.velocity.x !== this.velocityData[i * 3] || object.velocity.y !== this.velocityData[i * 3 + 1] || object.velocity.z !== this.velocityData[i * 3 + 2];

    object.velocity.x = (this.velocityData[i * 3] as KilometersPerSecond) || (0 as KilometersPerSecond);
    object.velocity.y = (this.velocityData[i * 3 + 1] as KilometersPerSecond) || (0 as KilometersPerSecond);
    object.velocity.z = (this.velocityData[i * 3 + 2] as KilometersPerSecond) || (0 as KilometersPerSecond);
    if (object.type === SpaceObjectType.BALLISTIC_MISSILE) {
      const missile = object as MissileObject;
      const newVel = Math.sqrt(missile.velocity.x ** 2 + missile.velocity.y ** 2 + missile.velocity.z ** 2);

      if (missile.totalVelocity === 0) {
        missile.totalVelocity = newVel;
      } else if (isChanged) {
        missile.totalVelocity = missile.totalVelocity * 0.9 + newVel * 0.1;
      }
    } else {
      object.totalVelocity = Math.sqrt(object.velocity.x ** 2 + object.velocity.y ** 2 + object.velocity.z ** 2);
    }

    object.position = {
      x: <Kilometers>this.positionData[i * 3],
      y: <Kilometers>this.positionData[i * 3 + 1],
      z: <Kilometers>this.positionData[i * 3 + 2],
    };
  }

  /**
   * Updates the position buffer for the dots manager. This method interpolates the position of the satellites
   * based on their velocity and updates the position buffer accordingly. It also updates the position of active missiles.
   */
  updatePositionBuffer(): void {
    // Don't update positions until positionCruncher finishes its first loop and creates data in position and velocity data arrays
    if (!this.positionData || !this.velocityData) {
      return;
    }

    const renderer = keepTrackApi.getRenderer();

    if (!settingsManager.lowPerf && renderer.dtAdjusted > settingsManager.minimumDrawDt) {
      if ((keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1) {
        const obj = keepTrackApi.getCatalogManager().objectCache[keepTrackApi.getPlugin(SelectSatManager)!.selectedSat] as DetailedSatellite | MissileObject;

        if (obj.isSatellite()) {
          const sat = obj as DetailedSatellite;
          const now = keepTrackApi.getTimeManager().simulationTimeObj;
          const pv = sat.eci(now);

          if (!pv) {
            return;
          }
          this.positionData[sat.id * 3] = pv.position.x;
          this.positionData[sat.id * 3 + 1] = pv.position.y;
          this.positionData[sat.id * 3 + 2] = pv.position.z;
          this.velocityData[sat.id * 3] = pv.velocity.x;
          this.velocityData[sat.id * 3 + 1] = pv.velocity.y;
          this.velocityData[sat.id * 3 + 2] = pv.velocity.z;
        }
      }
      this.interpolatePositions_(renderer);
    }
  }

  /**
   * Updates the size buffer used for rendering the dots.
   * @param bufferLen The length of the buffer.
   */
  updateSizeBuffer(bufferLen: number = 3) {
    const gl = keepTrackApi.getRenderer().gl;

    if (!this.isSizeBufferOneTime_) {
      this.sizeData = new Int8Array(bufferLen);
    }

    // This has to happen first because it resets things to 0
    for (let i = 0; i < bufferLen; i++) {
      // Stars are always bigger
      if (i >= this.starIndex1 && i <= this.starIndex2) {
        this.sizeData[i] = 1.0;
      } else {
        this.sizeData[i] = 0.0;
      }
    }

    const selectedSat = keepTrackApi.getPlugin(SelectSatManager)?.selectedSat ?? -1;

    if (selectedSat > -1) {
      this.sizeData[selectedSat] = 1.0;
    }

    /*
     * Pretend Satellites that are currently being searched are stars
     * The shaders will display these "stars" like close satellites
     * because the distance from the center of the earth is too close to
     * be a star. dotsManager method is so there are less buffers needed but as
     * computers get faster it should be replaced
     */
    for (const lastSearchResult of settingsManager.lastSearchResults) {
      this.sizeData[lastSearchResult] = 1.0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    if (!this.isSizeBufferOneTime_) {
      gl.bufferData(gl.ARRAY_BUFFER, this.sizeData, gl.DYNAMIC_DRAW);
      this.isSizeBufferOneTime_ = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.sizeData);
    }
  }

  /**
   * Initializes the shaders used by the dots manager.
   */
  private initShaders_() {
    this.shaders_ = {
      dots: {
        frag: `#version 300 es
            precision mediump float;

            in vec4 vColor;
            in float vStar;
            in float vDist;

            out vec4 fragColor;

            float when_lt(float x, float y) {
            return max(sign(y - x), 0.0);
            }
            float when_ge(float x, float y) {
            return 1.0 - when_lt(x, y);
            }

            void main(void) {
            vec2 ptCoord = gl_PointCoord * 2.0 - vec2(1.0, 1.0);
            float r = 0.0;
            float alpha = 0.0;
            // If not a star and not on the ground
            r += (${settingsManager.satShader.blurFactor1} - min(abs(length(ptCoord)), 1.0)) * when_lt(vDist, 200000.0) * when_ge(vDist, 6421.0);
            alpha += (2.0 * r + ${settingsManager.satShader.blurFactor2}) * when_lt(vDist, 200000.0) * when_ge(vDist, 6421.0);

            // If on the ground
            r += (${settingsManager.satShader.blurFactor1} - min(abs(length(ptCoord)), 1.0)) * when_lt(vDist, 6421.0);
            alpha += (2.0 * r + ${settingsManager.satShader.blurFactor2}) * when_lt(vDist, 6471.0);

            // If a star
            r += (${settingsManager.satShader.blurFactor3} - min(abs(length(ptCoord)), 1.0)) * when_ge(vDist, 200000.0);
            alpha += (2.0 * r - ${settingsManager.satShader.blurFactor4}) * when_ge(vDist, 200000.0);

            alpha = min(alpha, 1.0);
            if (alpha == 0.0) discard;
            fragColor = vec4(vColor.rgb, vColor.a * alpha);

            // Reduce Flickering from Depth Fighting
            gl_FragDepth = gl_FragCoord.z * 0.99999975;
            }
          `,
        vert: `#version 300 es
          in vec3 a_position;
          in vec4 a_color;
          in float a_star;

          uniform float u_minSize;
          uniform float u_maxSize;

          uniform mat4 u_pMvCamMatrix;

          out vec4 vColor;
          out float vStar;
          out float vDist;

          float when_lt(float x, float y) {
              return max(sign(y - x), 0.0);
          }
          float when_ge(float x, float y) {
              return 1.0 - when_lt(x, y);
          }

          void main(void) {
              vec4 position = u_pMvCamMatrix * vec4(a_position, 1.0);
              float drawSize = 0.0;
              float dist = distance(vec3(0.0, 0.0, 0.0),a_position.xyz);

              // Satellite
              drawSize +=
              when_lt(a_star, 0.5) *
              (min(max(pow(${settingsManager.satShader.distanceBeforeGrow} \/ position.z, 2.1), u_minSize * 0.9), u_maxSize) * 1.0);

              // Something on the ground
              drawSize +=
              when_ge(a_star, 0.5) * when_lt(dist, 6421.0) *
              (min(max(pow(${settingsManager.satShader.distanceBeforeGrow} \/ position.z, 2.1), u_minSize * 0.75), u_maxSize) * 1.0);

              // Star or Searched Object
              drawSize +=
              when_ge(a_star, 0.5) * when_ge(dist, 6421.0) *
              (min(max(${settingsManager.satShader.starSize} * 100000.0 \/ dist, ${settingsManager.satShader.starSize}),${settingsManager.satShader.starSize} * 1.0));

              gl_PointSize = drawSize;
              gl_Position = position;
              vColor = a_color;
              vStar = a_star * 1.0;
              vDist = dist;
          }
        `,
      },
      picking: {
        vert: `#version 300 es
                in vec3 a_position;
                in vec3 a_color;
                in float a_pickable;

                uniform mat4 u_pMvCamMatrix;

                out vec3 vColor;

                void main(void) {
                vec4 position = u_pMvCamMatrix * vec4(a_position, 1.0);
                gl_Position = position;
                gl_PointSize = ${settingsManager.pickingDotSize} * a_pickable;
                vColor = a_color * a_pickable;
                }
            `,
        frag: `#version 300 es
                precision mediump float;

                in vec3 vColor;

                out vec4 fragColor;

                void main(void) {
                    fragColor = vec4(vColor, 1.0);
                }
            `,
      },
    };
  }

  /**
   * Updates the velocities of the dots based on the renderer's time delta and the current position data.
   * @param renderer - The WebGL renderer used to calculate the time delta.
   */
  private interpolatePositions_(renderer: WebGLRenderer) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const orbitalSats3 = catalogManagerInstance.orbitalSats * 3;

    for (let i = 0; i < orbitalSats3; i++) {
      this.positionData[i] += this.velocityData[i] * renderer.dtAdjusted;
    }
  }
}

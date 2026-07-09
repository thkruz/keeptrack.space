/* eslint-disable max-lines */
import { EciArr3, SatCruncherMessageData, SolarBody } from '../core/interfaces';
import { GlUtils } from './gl-utils';
/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { BaseObject, DEG2RAD, GreenwichMeanSiderealTime, Kilometers, KilometersPerSecond, lla2eci, Radians, Satellite, Seconds, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { SettingsManager } from '../../settings/settings';
import { CameraType } from '../camera/camera-type';
import { PluginRegistry } from '../core/plugin-registry';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { RADIUS_OF_EARTH } from '../utils/constants';
import { glsl } from '../utils/development/formatter';
import { ensureVelocityVec3 } from '../utils/space-object-invariants';
import { BufferAttribute } from './buffer-attribute';
import { DepthManager } from './depth-manager';
import { ViewportManager } from './viewport-manager';
import { IDotsShaderProvider } from './dots-shader-provider';
import { createBaseFragShader, createBaseVertShader } from './dots-shaders-base';
import { WebGlProgramHelper } from './webgl-program';
import { WebGLRenderer } from './webgl-renderer';

declare module '@app/engine/core/interfaces' {
  interface SatShader {
    maxSize: number;
    minSize: number;
  }

  interface SatCruncherMessageData {
    satInSun: Int8Array;
    satInView: Int8Array;
    satPos: Float32Array;
    satVel: Float32Array;
    gmst: number;
  }
}

/**
 * Class representing a manager for dots in a space visualization.
 */
export class DotsManager {
  readonly PICKING_READ_PIXEL_BUFFER_SIZE = 1;

  /**
   * Distance from Earth's center (km) below which the dots shader rotates a dot by
   * (currentGmst - cruncherGmst) to un-lag worker-updated ground objects. MUST match the
   * `6421.0` literal in the dots vertex shaders (base + symbology); missile positions are
   * pre-expressed in the cruncher frame below this so the shader lands them on their line.
   */
  static readonly MISSILE_GROUND_ROTATION_RADIUS_KM = 6421;

  private pickingColorData: number[] = [];
  /*
   * We draw the picking object bigger than the actual dot to make it easier to select objects
   * glsl code - keep as a string
   */
  private positionBufferOneTime_ = false;
  private settings_: SettingsManager;
  private shaderProvider_: IDotsShaderProvider | null = null;
  private extraBuffers_: Record<string, WebGLBuffer> = {};
  // Array for which colors go to which ids
  private isSizeBufferOneTime_ = false;
  /** When true, renders the picking shader to the screen instead of visual dots */
  debugShowPicking = false;

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
  cruncherGmst = 0;
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
        a_size: new BufferAttribute({
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
        u_starMinSize: <WebGLUniformLocation><unknown>null,
        worldOffset: <WebGLUniformLocation><unknown>null,
        logDepthBufFC: <WebGLUniformLocation><unknown>null,
        u_flatMapMode: <WebGLUniformLocation><unknown>null,
        u_gmst: <WebGLUniformLocation><unknown>null,
        u_currentGmst: <WebGLUniformLocation><unknown>null,
        u_earthRadius: <WebGLUniformLocation><unknown>null,
        u_flatMapCenterX: <WebGLUniformLocation><unknown>null,
        u_flatMapZoom: <WebGLUniformLocation><unknown>null,
        u_polarViewMode: <WebGLUniformLocation><unknown>null,
        u_sensorEcef: <WebGLUniformLocation><unknown>null,
        u_ecefToEnu: <WebGLUniformLocation><unknown>null,
        u_polarRadius: <WebGLUniformLocation><unknown>null,
        u_polarZoom: <WebGLUniformLocation><unknown>null,
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
        worldOffset: <WebGLUniformLocation><unknown>null,
        logDepthBufFC: <WebGLUniformLocation><unknown>null,
        u_flatMapMode: <WebGLUniformLocation><unknown>null,
        u_gmst: <WebGLUniformLocation><unknown>null,
        u_currentGmst: <WebGLUniformLocation><unknown>null,
        u_earthRadius: <WebGLUniformLocation><unknown>null,
        u_flatMapCenterX: <WebGLUniformLocation><unknown>null,
        u_flatMapZoom: <WebGLUniformLocation><unknown>null,
        u_polarViewMode: <WebGLUniformLocation><unknown>null,
        u_sensorEcef: <WebGLUniformLocation><unknown>null,
        u_ecefToEnu: <WebGLUniformLocation><unknown>null,
        u_polarRadius: <WebGLUniformLocation><unknown>null,
        u_polarZoom: <WebGLUniformLocation><unknown>null,
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

  // Polar view sensor uniforms (precomputed on CPU, pushed by plugin)
  sensorEcef: Float32Array = new Float32Array(3);
  ecefToEnu: Float32Array = new Float32Array(9);

  sizeData: Int8Array;
  starIndex1: number;
  starIndex2: number;
  // Start of the planet dots in the object cache
  planetDot1: number;
  // End of the planet dots in the object cache
  planetDot2: number;
  velocityData: Float32Array;
  lastUpdateSimTime = 0;

  /**
   * Register a custom shader provider (e.g., symbology plugin).
   * Must be called before init().
   */
  registerShaderProvider(provider: IDotsShaderProvider): void {
    this.shaderProvider_ = provider;
  }

  /**
   * Draws dots on a WebGLFramebuffer.
   * @param projectionCameraMatrix - The projection matrix.
   * @param tgtBuffer - The WebGLFramebuffer to draw on.
   */
  draw(projectionCameraMatrix: mat4, tgtBuffer: WebGLFramebuffer | null) {
    if (!this.isReady || !settingsManager.cruncherReady) {
      return;
    }
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    if (!colorSchemeManagerInstance.colorBuffer) {
      return;
    }
    if (!projectionCameraMatrix) {
      return;
    }

    const gl = ServiceLocator.getRenderer().gl;

    gl.useProgram(this.programs.dots.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.uniformMatrix4fv(this.programs.dots.uniforms.u_pMvCamMatrix, false, projectionCameraMatrix);

    const mainCamera = ServiceLocator.getMainCamera();
    const isFlatMap = mainCamera.cameraType === CameraType.FLAT_MAP;

    const isPolarView = mainCamera.cameraType === CameraType.POLAR_VIEW;

    // 2D projections reproject raw ECI in-shader; the world offset must be
    // zero for them even when the frame shift is satellite-centered
    gl.uniform3fv(this.programs.dots.uniforms.worldOffset, isFlatMap || isPolarView ? [0, 0, 0] : Scene.getInstance().worldShift ?? [0, 0, 0]);

    gl.uniform1i(this.programs.dots.uniforms.u_flatMapMode, isFlatMap ? 1 : 0);
    gl.uniform1i(this.programs.dots.uniforms.u_polarViewMode, isPolarView ? 1 : 0);
    gl.uniform1f(this.programs.dots.uniforms.u_gmst, this.cruncherGmst);
    gl.uniform1f(this.programs.dots.uniforms.u_currentGmst, ServiceLocator.getTimeManager().gmst);
    gl.uniform1f(this.programs.dots.uniforms.u_earthRadius, RADIUS_OF_EARTH);
    if (isFlatMap) {
      gl.uniform1f(this.programs.dots.uniforms.u_flatMapCenterX, mainCamera.flatMapPanX);
      gl.uniform1f(this.programs.dots.uniforms.u_flatMapZoom, mainCamera.flatMapZoom);
      gl.uniform1f(this.programs.dots.uniforms.logDepthBufFC, 0.0); // disable log depth in ortho
    } else if (isPolarView) {
      gl.uniform3fv(this.programs.dots.uniforms.u_sensorEcef, this.sensorEcef);
      gl.uniformMatrix3fv(this.programs.dots.uniforms.u_ecefToEnu, false, this.ecefToEnu);
      gl.uniform1f(this.programs.dots.uniforms.u_polarRadius, RADIUS_OF_EARTH);
      gl.uniform1f(this.programs.dots.uniforms.u_polarZoom, mainCamera.polarViewZoom);
      gl.uniform1f(this.programs.dots.uniforms.logDepthBufFC, 0.0);
    } else {
      gl.uniform1f(this.programs.dots.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    }

    if (mainCamera.cameraType === CameraType.PLANETARIUM) {
      gl.uniform1f(this.programs.dots.uniforms.u_minSize, this.settings_.satShader.minSizePlanetarium);
      gl.uniform1f(this.programs.dots.uniforms.u_maxSize, this.settings_.satShader.maxSizePlanetarium);
      gl.uniform1f(this.programs.dots.uniforms.u_starMinSize, this.settings_.satShader.minSizePlanetarium);
    } else {
      // Per-camera dot sizes (driven by that camera's zoom), falling back to settings defaults
      gl.uniform1f(this.programs.dots.uniforms.u_minSize, mainCamera.satShaderSizes.minSize ?? this.settings_.satShader.minSize);
      gl.uniform1f(this.programs.dots.uniforms.u_maxSize, mainCamera.satShaderSizes.maxSize ?? this.settings_.satShader.maxSize);
      gl.uniform1f(this.programs.dots.uniforms.u_starMinSize, this.settings_.satShader.starMinSize);
    }

    // Let shader provider set extra uniforms (e.g., symbology)
    if (this.shaderProvider_) {
      this.shaderProvider_.setExtraUniforms(gl, this.programs.dots.uniforms);
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

    // Let shader provider update extra buffers (e.g., symbology affiliation/staleness)
    if (this.shaderProvider_) {
      this.shaderProvider_.updateExtraBuffers(gl, this.extraBuffers_);
    }

    /*
     * DEBUG:
     * gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
     */
    gl.enable(gl.BLEND);
    gl.depthMask(false); // Disable depth writing

    // Cap draw count to position buffer capacity to prevent WebGL errors
    // during catalog swap when dotsOnScreen may reference the new catalog size
    // but vertex buffers still contain old catalog data
    const maxDrawable = this.positionData ? Math.floor(this.positionData.length / 3) : 0;
    const drawCount = Math.min(settingsManager.dotsOnScreen, maxDrawable);

    gl.drawArrays(gl.POINTS, 0, drawCount);
    gl.bindVertexArray(null);

    // Debug: draw picking dots to screen using the same GL state as visual dots
    if (this.debugShowPicking) {
      this.drawPickingToScreen_(gl, projectionCameraMatrix, drawCount);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // Draw GPU Picking Overlay -- This is what lets us pick a satellite
    this.drawGpuPickingFrameBuffer(projectionCameraMatrix, ServiceLocator.getMainCamera().state.mouseX, ServiceLocator.getMainCamera().state.mouseY);
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
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    if (!colorSchemeManagerInstance.colorBuffer) {
      return;
    }
    const gl = ServiceLocator.getRenderer().gl;

    gl.depthMask(true);

    gl.useProgram(this.programs.picking.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.gpuPicking);

    gl.uniformMatrix4fv(this.programs.picking.uniforms.u_pMvCamMatrix, false, pMvCamMatrix);

    const mainCam = ServiceLocator.getMainCamera();
    const isFlatMapPick = mainCam.cameraType === CameraType.FLAT_MAP;
    const isPolarViewPick = mainCam.cameraType === CameraType.POLAR_VIEW;

    // 2D projections reproject raw ECI in-shader; zero the world offset for them
    gl.uniform3fv(this.programs.picking.uniforms.worldOffset, isFlatMapPick || isPolarViewPick ? [0, 0, 0] : Scene.getInstance().worldShift ?? [0, 0, 0]);

    gl.uniform1i(this.programs.picking.uniforms.u_flatMapMode, isFlatMapPick ? 1 : 0);
    gl.uniform1i(this.programs.picking.uniforms.u_polarViewMode, isPolarViewPick ? 1 : 0);
    gl.uniform1f(this.programs.picking.uniforms.u_gmst, this.cruncherGmst);
    gl.uniform1f(this.programs.picking.uniforms.u_currentGmst, ServiceLocator.getTimeManager().gmst);
    gl.uniform1f(this.programs.picking.uniforms.u_earthRadius, RADIUS_OF_EARTH);
    if (isFlatMapPick) {
      gl.uniform1f(this.programs.picking.uniforms.u_flatMapCenterX, mainCam.flatMapPanX);
      gl.uniform1f(this.programs.picking.uniforms.u_flatMapZoom, mainCam.flatMapZoom);
      gl.uniform1f(this.programs.picking.uniforms.logDepthBufFC, 0.0);
    } else if (isPolarViewPick) {
      gl.uniform3fv(this.programs.picking.uniforms.u_sensorEcef, this.sensorEcef);
      gl.uniformMatrix3fv(this.programs.picking.uniforms.u_ecefToEnu, false, this.ecefToEnu);
      gl.uniform1f(this.programs.picking.uniforms.u_polarRadius, RADIUS_OF_EARTH);
      gl.uniform1f(this.programs.picking.uniforms.u_polarZoom, mainCam.polarViewZoom);
      gl.uniform1f(this.programs.picking.uniforms.logDepthBufFC, 0.0);
    } else {
      gl.uniform1f(this.programs.picking.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    }

    // no reason to render 100000s of pixels when we're only going to read one
    if (!settingsManager.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(mouseX, gl.drawingBufferHeight - mouseY, this.PICKING_READ_PIXEL_BUFFER_SIZE, this.PICKING_READ_PIXEL_BUFFER_SIZE);
    }

    gl.bindVertexArray(this.programs.picking.vao);
    const maxPickable = this.positionData ? Math.floor(this.positionData.length / 3) : 0;

    gl.drawArrays(gl.POINTS, 0, Math.min(settingsManager.dotsOnScreen, maxPickable));
    gl.bindVertexArray(null);

    if (!settingsManager.isMobileModeEnabled) {
      // Restore the active viewport pass's scissor (disables it in single view)
      ViewportManager.getInstance().applyPassScissor(gl);
    }
  }

  /**
   * Renders picking dots to the same framebuffer as visual dots for debugging.
   * Called inline during draw() while blend/depthMask state is still active,
   * so the picking overlay goes through the exact same GL pipeline as visual dots.
   */
  private drawPickingToScreen_(gl: WebGL2RenderingContext, pMvCamMatrix: mat4, drawCount: number): void {
    // Switch to picking program — framebuffer and blend/depth state are inherited from draw()
    gl.useProgram(this.programs.picking.program);

    gl.uniformMatrix4fv(this.programs.picking.uniforms.u_pMvCamMatrix, false, pMvCamMatrix);

    const mainCam = ServiceLocator.getMainCamera();
    const isFlatMap = mainCam.cameraType === CameraType.FLAT_MAP;
    const isPolarView = mainCam.cameraType === CameraType.POLAR_VIEW;

    // 2D projections reproject raw ECI in-shader; zero the world offset for them
    gl.uniform3fv(this.programs.picking.uniforms.worldOffset, isFlatMap || isPolarView ? [0, 0, 0] : Scene.getInstance().worldShift ?? [0, 0, 0]);

    gl.uniform1i(this.programs.picking.uniforms.u_flatMapMode, isFlatMap ? 1 : 0);
    gl.uniform1i(this.programs.picking.uniforms.u_polarViewMode, isPolarView ? 1 : 0);
    gl.uniform1f(this.programs.picking.uniforms.u_gmst, this.cruncherGmst);
    gl.uniform1f(this.programs.picking.uniforms.u_currentGmst, ServiceLocator.getTimeManager().gmst);
    gl.uniform1f(this.programs.picking.uniforms.u_earthRadius, RADIUS_OF_EARTH);
    if (isFlatMap) {
      gl.uniform1f(this.programs.picking.uniforms.u_flatMapCenterX, mainCam.flatMapPanX);
      gl.uniform1f(this.programs.picking.uniforms.u_flatMapZoom, mainCam.flatMapZoom);
      gl.uniform1f(this.programs.picking.uniforms.logDepthBufFC, 0.0);
    } else if (isPolarView) {
      gl.uniform3fv(this.programs.picking.uniforms.u_sensorEcef, this.sensorEcef);
      gl.uniformMatrix3fv(this.programs.picking.uniforms.u_ecefToEnu, false, this.ecefToEnu);
      gl.uniform1f(this.programs.picking.uniforms.u_polarRadius, RADIUS_OF_EARTH);
      gl.uniform1f(this.programs.picking.uniforms.u_polarZoom, mainCam.polarViewZoom);
      gl.uniform1f(this.programs.picking.uniforms.logDepthBufFC, 0.0);
    } else {
      gl.uniform1f(this.programs.picking.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    }

    gl.bindVertexArray(this.programs.picking.vao);
    gl.drawArrays(gl.POINTS, 0, drawCount);
    gl.bindVertexArray(null);

    // Restore visual dots program so subsequent code (if any) doesn't break
    gl.useProgram(this.programs.dots.program);
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

  getPositionArray(i: number): EciArr3 {
    const posData = this.positionData;
    const idx = i * 3;

    // positionData is nulled during catalog swap; callers (line manager, scene offset, etc.) treat origin as a safe default
    if (!posData || idx + 2 >= posData.length) {
      return [0, 0, 0] as EciArr3;
    }

    return [posData[idx], posData[idx + 1], posData[idx + 2]] as EciArr3;
  }

  /**
   * The ON-SCREEN ECI position of an object's dot: {@link getPositionArray} with
   * the vertex shader's ground rotation already applied. Below
   * {@link DotsManager.MISSILE_GROUND_ROTATION_RADIUS_KM} the shader rotates the
   * stored position by (currentGmst - cruncherGmst); a missile's positionData is
   * pre-expressed in the cruncher frame precisely so that rotation lands the dot
   * on its line. CPU consumers that must line up with the rendered dot rather than
   * the stored value - the camera follow, the world-shift that centers the selected
   * object, the mesh, the orbit-line head - go through this so they all agree with
   * the pixels. Above the radius the shader does not rotate, so this returns the
   * stored value unchanged.
   */
  getRenderedPositionArray(i: number): EciArr3 {
    const pos = this.getPositionArray(i);

    if (Math.hypot(pos[0], pos[1], pos[2]) >= DotsManager.MISSILE_GROUND_ROTATION_RADIUS_KM) {
      return pos;
    }

    const currentGmst = ServiceLocator.getTimeManager().gmst;
    const cruncherGmst = this.cruncherGmst ?? currentGmst;
    const d = currentGmst - cruncherGmst;
    const cosD = Math.cos(d);
    const sinD = Math.sin(d);

    return [
      pos[0] * cosD - pos[1] * sinD,
      pos[0] * sinD + pos[1] * cosD,
      pos[2],
    ] as EciArr3;
  }

  /**
   * Returns the ID of the satellite closest to the given ECI coordinates.
   * @param eci - The ECI coordinates to search for.
   * @param maxDots - The maximum number of satellites to search through.
   * @returns The ID of the closest satellite, or null if no satellite is found within 100km.
   */
  getIdFromEci(eci: { x: number; y: number; z: number }, maxDots?: number): number | null {
    const posData = this.positionData;

    if (!posData) {
      return null;
    }

    // positionData is xyz-packed (length = 3 * numSats). When the caller omits maxDots,
    // the loop bound must be sat count, not buffer length, or we read past the end.
    const satCount = Math.floor(posData.length / 3);
    const effectiveMaxDots = typeof maxDots === 'number' ? Math.min(maxDots, satCount) : satCount;
    const possibleMatches: { id: number; distance: number }[] = [];

    // loop through all the satellites
    for (let id = 0; id < effectiveMaxDots; id++) {
      const x = posData[id * 3];
      const y = posData[id * 3 + 1];
      const z = posData[id * 3 + 2];

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
    const renderer = ServiceLocator.getRenderer();

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

    EventBus.getInstance().on(EventBusEvent.update, this.update.bind(this));
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, this.interpolatePositionsOfOemSatellites.bind(this));
  }

  /**
   * Initializes the buffers required for rendering the dots and picking.
   * @param colorBuffer The color buffer to be shared between the color manager and the dots manager.
   */
  initBuffers(colorBuffer: WebGLBuffer) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    this.setupPickingBuffer(catalogManagerInstance.objectCache.length);
    this.updateSizeBuffer(catalogManagerInstance.objectCache.length);
    this.initColorBuffer(colorBuffer);
    if (this.shaderProvider_) {
      const gl = ServiceLocator.getRenderer().gl;

      this.extraBuffers_ = this.shaderProvider_.initExtraBuffers(gl);
    }
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
   * Initializes the GPU Picking program (one-time setup).
   *
   * Compiles the picking shader program, assigns attributes and uniforms, allocates
   * the read-pixel staging buffer, and creates the initial picking framebuffer.
   * Subsequent resizes must call {@link resizePickingFramebuffer} — they must NOT
   * rebuild the shader program, which can intermittently fail to compile when the
   * GPU process is in a transient bad state during a resize event.
   */
  initProgramPicking() {
    const gl = ServiceLocator.getRenderer().gl;

    this.programs.picking.program = new WebGlProgramHelper(gl, this.shaders_.picking.vert, this.shaders_.picking.frag).program;

    GlUtils.assignAttributes(this.programs.picking.attribs, gl, this.programs.picking.program, ['a_position', 'a_color', 'a_pickable']);
    GlUtils.assignUniforms(this.programs.picking.uniforms, gl, this.programs.picking.program,
      ['u_pMvCamMatrix', 'worldOffset', 'logDepthBufFC', 'u_flatMapMode', 'u_gmst', 'u_currentGmst', 'u_earthRadius', 'u_flatMapCenterX', 'u_flatMapZoom']);

    // Assign polar view uniforms separately — some ANGLE backends strip these from conditional branches
    const polarPickUniforms = ['u_polarViewMode', 'u_sensorEcef', 'u_ecefToEnu', 'u_polarRadius', 'u_polarZoom'] as const;

    for (const name of polarPickUniforms) {
      this.programs.picking.uniforms[name] = gl.getUniformLocation(this.programs.picking.program, name) as WebGLUniformLocation;
    }

    this.pickReadPixelBuffer = new Uint8Array(4 * this.PICKING_READ_PIXEL_BUFFER_SIZE * this.PICKING_READ_PIXEL_BUFFER_SIZE);

    this.resizePickingFramebuffer();
  }

  /**
   * Recreates the GPU picking framebuffer, color texture, and depth renderbuffer
   * at the current drawing buffer size. Previous resources are released first so
   * resizes don't leak GL handles. Safe to call repeatedly; does not rebuild the
   * picking shader program.
   */
  resizePickingFramebuffer() {
    const gl = ServiceLocator.getRenderer().gl;
    const scene = ServiceLocator.getScene();

    if (scene.frameBuffers.gpuPicking) {
      gl.deleteFramebuffer(scene.frameBuffers.gpuPicking);
    }
    if (this.pickingTexture) {
      gl.deleteTexture(this.pickingTexture);
    }
    if (this.pickingRenderBuffer) {
      gl.deleteRenderbuffer(this.pickingRenderBuffer);
    }

    scene.frameBuffers.gpuPicking = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.frameBuffers.gpuPicking);

    this.pickingTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    this.pickingRenderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingRenderBuffer);
  }

  /**
   * Initializes the vertex array objects for the dots and picking programs.
   */
  initVao(): void {
    const gl = ServiceLocator.getRenderer().gl;

    // Dots Program
    this.programs.dots.vao = gl.createVertexArray();
    gl.bindVertexArray(this.programs.dots.vao);

    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);
    gl.enableVertexAttribArray(this.programs.dots.attribs.a_color.location);
    gl.vertexAttribPointer(this.programs.dots.attribs.a_color.location, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.enableVertexAttribArray(this.programs.dots.attribs.a_size.location);
    gl.vertexAttribPointer(this.programs.dots.attribs.a_size.location, 1, gl.UNSIGNED_BYTE, false, 0, 0);

    // Let shader provider set up extra VAO bindings (e.g., symbology buffers)
    if (this.shaderProvider_) {
      this.shaderProvider_.setupExtraVao(gl, this.programs.dots.attribs, this.extraBuffers_);
    }

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
   * Resets all OneTime flags and clears accumulated buffers so that
   * initBuffers() can reallocate them for a new catalog.
   */
  resetForCatalogSwap(): void {
    this.positionBufferOneTime_ = false;
    this.isSizeBufferOneTime_ = false;
    if (this.shaderProvider_) {
      this.shaderProvider_.resetBufferState();
    }
    this.pickingColorData = [];
    this.isReady = false;
    // Force updateCruncherBuffers to allocate new typed arrays
    // eslint-disable-next-line no-void
    this.positionData = void 0 as unknown as Float32Array;
    // eslint-disable-next-line no-void
    this.velocityData = void 0 as unknown as Float32Array;
    // eslint-disable-next-line no-void
    this.inViewData = void 0 as unknown as Int8Array;
    // eslint-disable-next-line no-void
    this.inSunData = void 0 as unknown as Int8Array;
  }

  /**
   * Diagnostic: reads the picking FB at center and corners, reports sizes and status.
   * Call from browser console: ServiceLocator.getDotsManager().diagnosePicking()
   */
  diagnosePicking(): string {
    const gl = ServiceLocator.getRenderer().gl;
    const buf = new Uint8Array(4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.gpuPicking);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    const statusStr = status === gl.FRAMEBUFFER_COMPLETE ? 'COMPLETE' : `0x${status.toString(16)}`;

    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;

    const readId = (px: number, py: number): string => {
      gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const id = ((buf[2] << 16) | (buf[1] << 8) | buf[0]) - 1;

      return `id=${id} rgba=(${buf[0]},${buf[1]},${buf[2]},${buf[3]})`;
    };

    const canvas = ServiceLocator.getRenderer().domElement;
    const rect = canvas.getBoundingClientRect();

    const lines = [
      '=== PICKING FB DIAGNOSIS ===',
      `FB status: ${statusStr}`,
      `drawingBuffer: ${w}x${h}`,
      `canvas.width/height: ${canvas.width}x${canvas.height}`,
      `canvas CSS size: ${canvas.clientWidth}x${canvas.clientHeight}`,
      `canvas rect: L=${rect.left} T=${rect.top} W=${rect.width} H=${rect.height}`,
      `devicePixelRatio: ${window.devicePixelRatio}`,
      `pickingTexture exists: ${!!this.pickingTexture}`,
      `pickReadPixelBuffer size: ${this.pickReadPixelBuffer?.length}`,
      `isMobileModeEnabled: ${settingsManager.isMobileModeEnabled}`,
      `isDisableAsyncReadPixels: ${settingsManager.isDisableAsyncReadPixels}`,
      '---',
      `center (${w >> 1},${h >> 1}): ${readId(w >> 1, h >> 1)}`,
      `TL (0,${h - 1}): ${readId(0, h - 1)}`,
      `TR (${w - 1},${h - 1}): ${readId(w - 1, h - 1)}`,
      `BL (0,0): ${readId(0, 0)}`,
      `BR (${w - 1},0): ${readId(w - 1, 0)}`,
    ];

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const result = lines.join('\n');

    // eslint-disable-next-line no-console
    console.log(result);

    return result;
  }

  /**
   * Resets the inSunData array to all zeros.
   */
  resetSatInSun(): void {
    if (!this.inSunData) {
      return;
    }

    this.inSunData = new Int8Array(this.inSunData.length);
    this.inSunData.fill(0);
  }

  /**
   * Resets the inViewData array to all zeroes.
   */
  resetSatInView(): void {
    if (!this.inViewData) {
      return;
    }

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

    const renderer = ServiceLocator.getRenderer();

    this.pickingBuffers.color = GlUtils.createArrayBuffer(renderer.gl, new Float32Array(this.pickingColorData));
  }

  /**
   * Updates the position, velocity, in-view and in-sun data buffers with the data received from the SatCruncher worker.
   * @param mData The data received from the SatCruncher worker.
   */
  updateCruncherBuffers(mData: SatCruncherMessageData) {
    // During a multi-frame offscreen capture the capture loop hand-propagates
    // positionData per frame; applying a cruncher message here would overwrite
    // those positions (and FOV/sun state) mid-exposure. Drop the message — the
    // cruncher keeps sending and the next message after captureEnd lands normally.
    if (ServiceLocator.getRenderer()?.isCapturing) {
      return;
    }

    if (typeof mData.gmst === 'number') {
      this.cruncherGmst = mData.gmst;
    }

    if (mData.satPos) {
      if (!this.positionData || this.positionData.length !== mData.satPos.length) {
        this.positionData = new Float32Array(mData.satPos);
        // Force full GPU buffer reallocation on next draw since size changed
        this.positionBufferOneTime_ = false;
        this.isReady = true;
      } else {
        this.positionData.set(mData.satPos, 0);
      }
    }

    if (mData.satVel) {
      if (!this.velocityData || this.velocityData.length !== mData.satVel.length) {
        this.velocityData = new Float32Array(mData.satVel);
      } else {
        this.velocityData.set(mData.satVel, 0);
      }
    }

    if (mData.satInView?.length > 0) {
      if (!this.inViewData || this.inViewData.length !== mData.satInView.length) {
        this.inViewData = new Int8Array(mData.satInView);
      } else {
        this.inViewData.set(mData.satInView, 0);
      }
    }

    if (mData.satInSun?.length > 0) {
      if (!this.inSunData || this.inSunData.length !== mData.satInSun.length) {
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
    if (!this.velocityData || !this.positionData) {
      return;
    }

    const spaceObject = object as unknown as {
      id?: number; name?: string; type?: number;
      velocity: TemeVec3<KilometersPerSecond>; position: TemeVec3;
    };

    // Static objects (stars, ground objects, sensors) carry a cruncher-computed position but
    // no velocity — their satVel slots stay zero and they have no `velocity` member to mutate.
    // Skip the velocity work for them; still write position so hover/info paths can read it.
    if (!object.isStatic()) {
      // Guard for issue #834 — telemeters when prior velocity was structurally invalid.
      ensureVelocityVec3(spaceObject, 'DotsManager.updatePosVel');

      const isChanged = spaceObject.velocity.x !== this.velocityData[i * 3] ||
        spaceObject.velocity.y !== this.velocityData[i * 3 + 1] ||
        spaceObject.velocity.z !== this.velocityData[i * 3 + 2];

      spaceObject.velocity.x = (this.velocityData[i * 3] as KilometersPerSecond) || (0 as KilometersPerSecond);
      spaceObject.velocity.y = (this.velocityData[i * 3 + 1] as KilometersPerSecond) || (0 as KilometersPerSecond);
      spaceObject.velocity.z = (this.velocityData[i * 3 + 2] as KilometersPerSecond) || (0 as KilometersPerSecond);

      // Missiles have their own mutable totalVelocity that needs smoothing
      // Other SpaceObjects use a computed getter that auto-calculates from velocity
      if (object.type === SpaceObjectType.BALLISTIC_MISSILE) {
        const missile = object as MissileObject;
        const newVel = Math.sqrt(missile.velocity.x ** 2 + missile.velocity.y ** 2 + missile.velocity.z ** 2);

        if (missile.totalVelocity === 0) {
          missile.totalVelocity = newVel;
        } else if (isChanged) {
          missile.totalVelocity = missile.totalVelocity * 0.9 + newVel * 0.1;
        }
      }
    }

    spaceObject.position = {
      x: <Kilometers>this.positionData[i * 3],
      y: <Kilometers>this.positionData[i * 3 + 1],
      z: <Kilometers>this.positionData[i * 3 + 2],
    };
  }

  /**
   * Updates the position buffer for the dots manager. This method interpolates the position of the satellites
   * based on their velocity and updates the position buffer accordingly. It also updates the position of active missiles.
   */
  update(): void {
    // Don't update positions until positionCruncher finishes its first loop and creates data in position and velocity data arrays
    if (!this.positionData || !this.velocityData) {
      return;
    }

    const renderer = ServiceLocator.getRenderer();
    const simTime = ServiceLocator.getTimeManager().simulationTimeObj.getTime();

    // TODO: Decouple OEM logic from TLE logic

    if (!settingsManager.lowPerf && (renderer.dtAdjusted > settingsManager.minimumDrawDt || Math.abs(this.lastUpdateSimTime - simTime) > 1000)) {
      if (Number(PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) > -1) {
        const obj = ServiceLocator.getCatalogManager().objectCache[PluginRegistry.getPlugin(SelectSatManager)!.selectedSat] as Satellite | MissileObject;

        if (obj instanceof Satellite) {
          const sat = obj as Satellite;
          const now = ServiceLocator.getTimeManager().simulationTimeObj;
          const pv = sat.eci(now);

          if (!pv) {
            return;
          }
          this.positionData[Number(sat.id) * 3] = pv.position.x;
          this.positionData[Number(sat.id) * 3 + 1] = pv.position.y;
          this.positionData[Number(sat.id) * 3 + 2] = pv.position.z;
          this.velocityData[Number(sat.id) * 3] = pv.velocity.x;
          this.velocityData[Number(sat.id) * 3 + 1] = pv.velocity.y;
          this.velocityData[Number(sat.id) * 3 + 2] = pv.velocity.z;
        } else if (obj instanceof OemSatellite) {
          const sat = obj as OemSatellite;
          const now = ServiceLocator.getTimeManager().simulationTimeObj.getTime() / 1000 as Seconds;
          // WARN: Necessary for orbit history
          const pv = sat.updatePosAndVel(now);

          if (!pv) {
            return;
          }
          this.positionData[Number(sat.id) * 3] = pv[0];
          this.positionData[Number(sat.id) * 3 + 1] = pv[1];
          this.positionData[Number(sat.id) * 3 + 2] = pv[2];
          this.velocityData[Number(sat.id) * 3] = pv[3];
          this.velocityData[Number(sat.id) * 3 + 1] = pv[4];
          this.velocityData[Number(sat.id) * 3 + 2] = pv[5];
        }
      }

      if ((settingsManager.centerBody === SolarBody.Earth || settingsManager.centerBody === SolarBody.Moon) && !settingsManager.isSkipTleInterpolation) {
        this.interpolatePositionsOfTleSatellites_(renderer);
      }
    }

    this.interpolatePositionsOfOemSatellites();
    this.interpolatePositionsOfMissiles_();

    this.lastUpdateSimTime = simTime;
  }

  /**
   * Recompute every active missile's position from its trajectory each frame.
   *
   * Missiles live past `orbitalSats` in the catalog, so the per-frame TLE velocity
   * extrapolation skips them and the position cruncher only refreshes them at ~1 Hz
   * - which makes the dot stair-step once per second. Like OEM satellites, missiles
   * instead get an exact position here every frame, interpolated between the
   * 1-second trajectory samples so the dot glides smoothly.
   *
   * The position MUST sit on the trajectory line. That line is an Earth-fixed (ECEF)
   * strip the shader rotates to ECI by the current GMST, with one vertex per 1 Hz
   * sample (`MissileObject.getOrbitPath`), so the dot lerps in ECI between the two
   * adjacent sample vertices that bracket the current time.
   *
   * Frame subtlety: the dots shader rotates any dot below
   * {@link DotsManager.MISSILE_GROUND_ROTATION_RADIUS_KM} by (currentGmst - cruncherGmst)
   * to un-lag worker-updated ground objects. During its low-altitude boost a missile is
   * inside that band, so we must express its position in the CRUNCHER frame (like every
   * other worker-updated ground object); the shader's rotation then lands it back at the
   * current frame, on the line. Above the band the shader leaves it alone, so the current
   * frame is used. Without this, the main-thread (current-frame) position is double-rotated
   * and the dot drifts off the line during the first minutes of flight, snapping back on
   * each ~1 Hz cruncher update.
   */
  private interpolatePositionsOfMissiles_() {
    if (!this.positionData) {
      return;
    }

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const missileSats = catalogManagerInstance.missileSats;
    const missileSet = catalogManagerInstance.missileSet;

    if (!missileSats || missileSet.length === 0) {
      return;
    }

    const nowMs = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
    // Match the shader's frames exactly: u_currentGmst = timeManager.gmst, u_gmst = cruncherGmst.
    const currentGmst = ServiceLocator.getTimeManager().gmst as GreenwichMeanSiderealTime;
    const cruncherGmst = (this.cruncherGmst ?? currentGmst) as GreenwichMeanSiderealTime;

    // missileSet is exactly the objectCache missile reservation (same objects by reference),
    // ending at `missileSats`. Iterate it directly instead of scanning objectCache with an
    // instanceof per slot - inactive missiles then cost only a boolean read, not an
    // instanceof + array lookup across all maxMissiles reserved slots.
    const missileStartId = missileSats - missileSet.length;

    for (let k = 0; k < missileSet.length; k++) {
      const obj = missileSet[k];

      if (!obj.active || obj.altList.length === 0) {
        continue;
      }

      const id = missileStartId + k;

      if (!obj.isVisibleNow()) {
        // MIRV child before separation: it rides on top of the bus, so hide it by
        // parking the dot at the origin (the shader discards positions < 100 km from
        // Earth's center). Rewinding past separation re-hides it automatically.
        this.positionData[id * 3] = 0;
        this.positionData[id * 3 + 1] = 0;
        this.positionData[id * 3 + 2] = 0;
        continue;
      }

      const lastIdx = obj.altList.length - 1;
      const elapsedSec = Math.max(0, Math.min((nowMs - obj.startTime) / 1000, lastIdx));
      const i0 = Math.min(Math.floor(elapsedSec), Math.max(0, lastIdx - 1));
      const i1 = Math.min(i0 + 1, lastIdx);
      const frac = elapsedSec - i0;

      const toEci = (idx: number, g: GreenwichMeanSiderealTime) => lla2eci(
        { lat: (obj.latList[idx] * DEG2RAD) as Radians, lon: (obj.lonList[idx] * DEG2RAD) as Radians, alt: obj.altList[idx] },
        g,
      );

      // Current-frame position first; its magnitude (invariant under the Earth-rotation
      // choice) decides whether the shader will apply the ground rotation.
      let v0 = toEci(i0, currentGmst);
      let v1 = toEci(i1, currentGmst);
      let px = v0.x + (v1.x - v0.x) * frac;
      let py = v0.y + (v1.y - v0.y) * frac;
      let pz = v0.z + (v1.z - v0.z) * frac;

      if (Math.hypot(px, py, pz) < DotsManager.MISSILE_GROUND_ROTATION_RADIUS_KM) {
        // Inside the shader's ground band: pre-express in the cruncher frame so the
        // shader's (currentGmst - cruncherGmst) rotation lands it back on the line.
        v0 = toEci(i0, cruncherGmst);
        v1 = toEci(i1, cruncherGmst);
        px = v0.x + (v1.x - v0.x) * frac;
        py = v0.y + (v1.y - v0.y) * frac;
        pz = v0.z + (v1.z - v0.z) * frac;
      }

      this.positionData[id * 3] = px;
      this.positionData[id * 3 + 1] = py;
      this.positionData[id * 3 + 2] = pz;
    }
  }

  getSize(i: number): number {
    // Check if the index is part of lastSearchResults
    if (settingsManager.lastSearchResults.includes(i)) {
      return 1.0; // Return size for search results
    }

    // Stars use distance-based sizing (size 0) — at 3e10 km they naturally get u_minSize

    // If a planet and we aren't centered on Earth or Moon
    if ((i >= this.planetDot1 && i <= this.planetDot2) &&
      // TODO: This is hacky. We need better logic for determining when to show planet dots
      (settingsManager.maxZoomDistance > (2e6 as Kilometers) || (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Moon))) {
      return 1.0; // Return size for planets
    }

    // Check if the index is the selected satellite
    const selectedSat = PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1;

    if (i === selectedSat) {
      return 1.0; // Return size for selected satellite
    }

    // Default size for other satellites
    return 0.0;
  }

  /**
   * Updates the size buffer used for rendering the dots.
   * @param bufferLen The length of the buffer.
   */
  updateSizeBuffer(bufferLen: number = 3) {
    const gl = ServiceLocator.getRenderer().gl;

    if (!this.isSizeBufferOneTime_) {
      this.sizeData = new Int8Array(bufferLen);
    }

    // Reset everything to 0 (distance-based sizing).
    // Stars stay at 0 — at 3e10 km they naturally get u_minSize in the shader.
    for (let i = 0; i < bufferLen; i++) {
      this.sizeData[i] = 0.0;
    }

    const selectedSat = PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1;

    if (Number(selectedSat) > -1) {
      this.sizeData[Number(selectedSat)] = 1.0;
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
    // Use shader provider if registered (e.g., symbology plugin), otherwise use base shaders
    if (this.shaderProvider_) {
      const config = this.shaderProvider_.getShaderConfig(this.settings_);

      this.shaders_ = {
        dots: { frag: config.fragShader, vert: config.vertShader },
        picking: <{ vert: string; frag: string }><unknown>null,
      };
      Object.assign(this.programs.dots.attribs, config.extraAttribs);
      for (const u of config.extraUniforms) {
        (this.programs.dots.uniforms as Record<string, WebGLUniformLocation | null>)[u] = null;
      }
    } else {
      this.shaders_ = {
        dots: {
          frag: createBaseFragShader(this.settings_),
          vert: createBaseVertShader(this.settings_),
        },
        picking: <{ vert: string; frag: string }><unknown>null,
      };
    }

    this.shaders_.picking = {
      vert: glsl`#version 300 es
                precision highp float;
                in vec3 a_position;
                in vec3 a_color;
                in float a_pickable;

                uniform mat4 u_pMvCamMatrix;
                uniform vec3 worldOffset;
                uniform float logDepthBufFC;
                uniform bool u_flatMapMode;
                uniform float u_gmst;
                uniform float u_currentGmst;
                uniform float u_earthRadius;
                uniform float u_flatMapCenterX;
                uniform float u_flatMapZoom;
                uniform bool u_polarViewMode;
                uniform vec3 u_sensorEcef;
                uniform mat3 u_ecefToEnu;
                uniform float u_polarRadius;
                uniform float u_polarZoom;

                out vec3 vColor;

                void main(void) {
                // Skip objects with invalid positions:
                // - NaN from failed propagation (NaN comparisons always false)
                // - Positions inside Earth (< 100 km from center)
                float posLen = length(a_position);
                if (posLen < 100.0 || posLen != posLen) {
                    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                    gl_PointSize = 0.0;
                    vColor = vec3(0.0);
                    return;
                }

                vec3 eciPos = a_position + worldOffset;
                vec4 position;

                if (u_flatMapMode) {
                    float PI = 3.14159265359;
                    float eciDist = length(eciPos);
                    if (eciDist > 1.0e7) {
                        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                        gl_PointSize = 0.0;
                        vColor = vec3(0.0);
                        return;
                    }
                    float lon = atan(eciPos.y, eciPos.x) - u_gmst;
                    lon = mod(lon + PI, 2.0 * PI) - PI;
                    float lat = atan(eciPos.z, length(eciPos.xy));
                    float alt = eciDist - u_earthRadius;
                    vec3 flatPos = vec3(lon * u_earthRadius, lat * u_earthRadius, alt * 0.001);

                    // Wrap X to nearest copy of camera center for seamless scrolling
                    float mapW = 2.0 * PI * u_earthRadius;
                    flatPos.x = u_flatMapCenterX + mod(flatPos.x - u_flatMapCenterX + mapW * 0.5, mapW) - mapW * 0.5;

                    position = u_pMvCamMatrix * vec4(flatPos, 1.0);
                } else if (u_polarViewMode) {
                    float PI = 3.14159265359;
                    float eciDist = length(eciPos);
                    if (eciDist > 1.0e7) {
                        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                        gl_PointSize = 0.0;
                        vColor = vec3(0.0);
                        return;
                    }
                    float cg = cos(u_currentGmst);
                    float sg = sin(u_currentGmst);
                    vec3 ecef = vec3(
                        eciPos.x * cg + eciPos.y * sg,
                       -eciPos.x * sg + eciPos.y * cg,
                        eciPos.z
                    );
                    vec3 d = ecef - u_sensorEcef;
                    vec3 enu = u_ecefToEnu * d;
                    float az = atan(enu.x, enu.y);
                    float el = atan(enu.z, length(enu.xy));
                    if (el < 0.0) {
                        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                        gl_PointSize = 0.0;
                        vColor = vec3(0.0);
                        return;
                    }
                    float r = (PI / 2.0 - el) / (PI / 2.0);
                    vec3 polarPos = vec3(
                        r * sin(az) * u_polarRadius,
                        r * cos(az) * u_polarRadius,
                        0.0
                    );
                    position = u_pMvCamMatrix * vec4(polarPos, 1.0);
                } else {
                    // Rotate stale ground-object ECI positions to match current Earth rotation
                    float groundDist = length(a_position.xyz);
                    if (groundDist < 6421.0) {
                        float deltaGmst = u_currentGmst - u_gmst;
                        float cosD = cos(deltaGmst);
                        float sinD = sin(deltaGmst);
                        eciPos = vec3(
                            a_position.x * cosD - a_position.y * sinD + worldOffset.x,
                            a_position.x * sinD + a_position.y * cosD + worldOffset.y,
                            a_position.z + worldOffset.z
                        );
                    }
                    position = u_pMvCamMatrix * vec4(eciPos, 1.0);
                }

                gl_Position = position;
                ${DepthManager.getLogDepthVertCode()}

                float pickSize;
                if (u_polarViewMode) {
                    pickSize = ${settingsManager.pickingDotSize} * sqrt(u_polarZoom);
                } else if (u_flatMapMode) {
                    pickSize = ${settingsManager.pickingDotSize} * sqrt(u_flatMapZoom);
                } else {
                    // Scale picking size with camera distance via position.w (eye-space depth)
                    float camDist = max(position.w, 1.0);
                    float depthRatio = clamp(${settingsManager.satShader.distanceBeforeGrow} / camDist, 0.5, 1.0);
                    pickSize = ${settingsManager.pickingDotSize} * depthRatio;
                }
                gl_PointSize = pickSize * a_pickable;
                vColor = a_color * a_pickable;
                }
            `,
      frag: glsl`#version 300 es
                precision highp float;

                in vec3 vColor;

                out vec4 fragColor;

                void main(void) {
                    fragColor = vec4(vColor, 1.0);
                }
            `,
    };
  }

  /**
   * Updates the velocities of the dots based on the renderer's time delta and the current position data.
   * @param renderer - The WebGL renderer used to calculate the time delta.
   */
  private interpolatePositionsOfTleSatellites_(renderer: WebGLRenderer) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitalSats3 = catalogManagerInstance.orbitalSats * 3;

    for (let i = 0; i < orbitalSats3; i++) {
      this.positionData[i] += this.velocityData[i] * renderer.dtAdjusted;
    }
  }

  interpolatePositionsOfOemSatellites() {
    // Don't update positions until positionCruncher finishes its first loop and creates data in position and velocity data arrays
    if (!this.positionData || !this.velocityData) {
      return;
    }

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const simTime = (ServiceLocator.getTimeManager().simulationTimeObj.getTime() / 1000) as Seconds;

    // Iterate only the occupied OEM slots (usually zero), not all maxOemSatellites reserved
    // placeholder slots. The instanceof check remains as a safety net for a slot that was
    // allocated but not yet assigned (see OemSlotAllocator).
    for (const id of catalogManagerInstance.oemSatelliteIds) {
      const oemSat = catalogManagerInstance.objectCache[id];

      if (!oemSat || !(oemSat instanceof OemSatellite)) {
        continue;
      }

      const pv = oemSat.updatePosAndVel(simTime);

      if (!pv) {
        continue;
      }

      this.positionData[Number(oemSat.id) * 3] = pv[0];
      this.positionData[Number(oemSat.id) * 3 + 1] = pv[1];
      this.positionData[Number(oemSat.id) * 3 + 2] = pv[2];
      this.velocityData[Number(oemSat.id) * 3] = pv[3];
      this.velocityData[Number(oemSat.id) * 3 + 1] = pv[4];
      this.velocityData[Number(oemSat.id) * 3 + 2] = pv[5];
    }
  }
}

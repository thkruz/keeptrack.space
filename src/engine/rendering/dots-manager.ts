/* eslint-disable max-lines */

/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { BaseObject, DEG2RAD, GreenwichMeanSiderealTime, Kilometers, KilometersPerSecond, lla2eci, Radians, Satellite, Seconds, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { SettingsManager } from '../../settings/settings';
import { CameraType } from '../camera/camera-type';
import { EciArr3, SatCruncherMessageData, SolarBody } from '../core/interfaces';
import { PluginRegistry } from '../core/plugin-registry';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { RADIUS_OF_EARTH } from '../utils/constants';
import { glsl } from '../utils/development/formatter';
import { CounterStage, CpuStage, FrameProfiler, GpuStage } from '../utils/frame-profiler';
import { ensureVelocityVec3 } from '../utils/space-object-invariants';
import { BODY_GLYPH_WORDS, BodyGlyph, DOT_HIDE_BODY_RADII, packBodyGlyphs } from './body-glyph';
import { BufferAttribute } from './buffer-attribute';
import { DepthManager } from './depth-manager';
import { IDotsShaderProvider } from './dots-shader-provider';
import { createBaseFragShader, createBaseVertShader, DotStatus } from './dots-shaders-base';
import { GlUtils } from './gl-utils';
import { ViewportManager } from './viewport-manager';
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
 * A square of the GPU picking framebuffer in drawing-buffer pixels, y measured from the
 * BOTTOM (GL convention). `x0`/`y0` are its lower-left corner after edge clamping;
 * `cx`/`cy` are the cursor pixel it was built around, which is NOT the box centre once
 * the box has been clamped against a screen edge.
 */
/** The picking program's `gl_VertexID`-keyed range uniforms. */
export interface PickingRangeUniforms {
  u_starIdx1: WebGLUniformLocation;
  u_starIdx2: WebGLUniformLocation;
  u_planetIdx1: WebGLUniformLocation;
  u_planetIdx2: WebGLUniformLocation;
  u_planetGlyph: WebGLUniformLocation;
  u_hiddenBodyIdx: WebGLUniformLocation;
}

/** The visual programs' body-block uniforms: the picking range plus the packed glyph table. */
interface BodyRangeUniforms extends PickingRangeUniforms {
  u_bodyGlyph: WebGLUniformLocation;
}

export interface PickBox {
  x0: number;
  y0: number;
  size: number;
  cx: number;
  cy: number;
}

/**
 * Class representing a manager for dots in a space visualization.
 */
export class DotsManager {
  /**
   * Side length of the square of the picking buffer that is rendered AND read back,
   * centred on the cursor. This was 1 for years: the picking pass scissored itself to
   * the single pixel under the cursor, and that single pixel was the only valid data in
   * the whole buffer. But the pass is drawn from the cursor position of the frame that
   * triggered it while the read happens on a later tick (up to `updateHoverDelayLimit`
   * frames + the 100 ms hover throttle later, and the async readback lands later still),
   * so ANY cursor movement in between made the read sample a pixel that had never been
   * rendered for it - an instant miss. Isolated dots (planets, stars, high orbits) were
   * effectively unhoverable; inside the LEO cloud the stale pixel still held some
   * satellite, which is why only the sparse sky looked broken. A box wide enough to
   * absorb that drift costs ~225 fragments per picking pass instead of 1.
   */
  readonly PICKING_READ_PIXEL_BUFFER_SIZE = 15;

  /**
   * The region of the picking framebuffer the last picking pass actually rendered, or
   * null before the first pass. Outside it the buffer holds whatever an older frame left
   * there, so a readback is only meaningful where it overlaps this - see
   * `InputManager.getSatIdFromCoord`.
   */
  lastPickDrawBox: PickBox | null = null;

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
    position: <WebGLBuffer>(<unknown>null),
    size: <WebGLBuffer>(<unknown>null),
    color: <WebGLBuffer>(<unknown>null),
    pickability: <WebGLBuffer>(<unknown>null),
  };

  inSunData: Int8Array;
  inViewData: Int8Array;
  // TODO: Move to settings file
  isReady: boolean;
  pickReadPixelBuffer: Uint8Array;
  pickingBuffers = {
    position: <WebGLBuffer>(<unknown>null),
    color: <WebGLBuffer>(<unknown>null),
    pickability: <WebGLBuffer>(<unknown>null),
  };

  pickingRenderBuffer: WebGLRenderbuffer;
  pickingTexture: WebGLTexture;
  cruncherGmst = 0;
  positionData: Float32Array;
  programs = {
    dots: {
      program: <WebGLProgram>(<unknown>null),
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
        u_pMvCamMatrix: <WebGLUniformLocation>(<unknown>null),
        u_minSize: <WebGLUniformLocation>(<unknown>null),
        u_maxSize: <WebGLUniformLocation>(<unknown>null),
        u_starMinSize: <WebGLUniformLocation>(<unknown>null),
        worldOffset: <WebGLUniformLocation>(<unknown>null),
        logDepthBufFC: <WebGLUniformLocation>(<unknown>null),
        u_flatMapMode: <WebGLUniformLocation>(<unknown>null),
        u_gmst: <WebGLUniformLocation>(<unknown>null),
        u_currentGmst: <WebGLUniformLocation>(<unknown>null),
        u_earthRadius: <WebGLUniformLocation>(<unknown>null),
        u_flatMapCenterX: <WebGLUniformLocation>(<unknown>null),
        u_flatMapZoom: <WebGLUniformLocation>(<unknown>null),
        u_polarViewMode: <WebGLUniformLocation>(<unknown>null),
        u_sensorEcef: <WebGLUniformLocation>(<unknown>null),
        u_ecefToEnu: <WebGLUniformLocation>(<unknown>null),
        u_polarRadius: <WebGLUniformLocation>(<unknown>null),
        u_polarZoom: <WebGLUniformLocation>(<unknown>null),
        u_dotStyle: <WebGLUniformLocation>(<unknown>null),
        u_statusMarkers: <WebGLUniformLocation>(<unknown>null),
        u_camPos: <WebGLUniformLocation>(<unknown>null),
        u_starIdx1: <WebGLUniformLocation>(<unknown>null),
        u_starIdx2: <WebGLUniformLocation>(<unknown>null),
        u_planetIdx1: <WebGLUniformLocation>(<unknown>null),
        u_planetIdx2: <WebGLUniformLocation>(<unknown>null),
        u_planetGlyph: <WebGLUniformLocation>(<unknown>null),
        u_hiddenBodyIdx: <WebGLUniformLocation>(<unknown>null),
        u_bodyGlyph: <WebGLUniformLocation>(<unknown>null),
      },
      vao: <WebGLVertexArrayObject>(<unknown>null),
    },
    picking: {
      program: <WebGLProgram>(<unknown>null),
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
        u_pMvCamMatrix: <WebGLUniformLocation>(<unknown>null),
        u_minSize: <WebGLUniformLocation>(<unknown>null),
        u_maxSize: <WebGLUniformLocation>(<unknown>null),
        worldOffset: <WebGLUniformLocation>(<unknown>null),
        logDepthBufFC: <WebGLUniformLocation>(<unknown>null),
        u_flatMapMode: <WebGLUniformLocation>(<unknown>null),
        u_gmst: <WebGLUniformLocation>(<unknown>null),
        u_currentGmst: <WebGLUniformLocation>(<unknown>null),
        u_earthRadius: <WebGLUniformLocation>(<unknown>null),
        u_flatMapCenterX: <WebGLUniformLocation>(<unknown>null),
        u_flatMapZoom: <WebGLUniformLocation>(<unknown>null),
        u_polarViewMode: <WebGLUniformLocation>(<unknown>null),
        u_sensorEcef: <WebGLUniformLocation>(<unknown>null),
        u_ecefToEnu: <WebGLUniformLocation>(<unknown>null),
        u_polarRadius: <WebGLUniformLocation>(<unknown>null),
        u_polarZoom: <WebGLUniformLocation>(<unknown>null),
        u_camPos: <WebGLUniformLocation>(<unknown>null),
        u_starIdx1: <WebGLUniformLocation>(<unknown>null),
        u_starIdx2: <WebGLUniformLocation>(<unknown>null),
        u_planetIdx1: <WebGLUniformLocation>(<unknown>null),
        u_planetIdx2: <WebGLUniformLocation>(<unknown>null),
        u_planetGlyph: <WebGLUniformLocation>(<unknown>null),
        u_hiddenBodyIdx: <WebGLUniformLocation>(<unknown>null),
      },
      vao: <WebGLVertexArrayObject>(<unknown>null),
    },
  };

  shaders_ = {
    dots: {
      vert: <string>(<unknown>null),
      frag: <string>(<unknown>null),
    },
    picking: {
      vert: <string>(<unknown>null),
      frag: <string>(<unknown>null),
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
  /**
   * Packed BodyGlyph class per dot in [planetDot1, planetDot2), uploaded as `u_bodyGlyph`.
   * All zeros until the catalog populates it, which reads in the shader as "no bodies" -
   * the same safe state the -1/-1 index range gives.
   */
  private bodyGlyphWords_: Int32Array = new Int32Array(BODY_GLYPH_WORDS);
  /** Body name per glyph slot, so `settingsManager.centerBody` can be resolved to a slot. */
  private bodyGlyphNames_: string[] = [];
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
    gl.uniform3fv(this.programs.dots.uniforms.worldOffset, isFlatMap || isPolarView ? [0, 0, 0] : (Scene.getInstance().worldShift ?? [0, 0, 0]));

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

    gl.uniform1i(this.programs.dots.uniforms.u_dotStyle, this.settings_.satShader.dotStyle);
    gl.uniform1i(this.programs.dots.uniforms.u_statusMarkers, this.settings_.satShader.isStatusMarkers ? 1 : 0);
    // Camera position in the render frame (matches eciPos = a_position + worldOffset)
    gl.uniform3fv(this.programs.dots.uniforms.u_camPos, mainCamera.getCamPos() as Float32Array);
    this.setStarRangeUniforms_(gl, this.programs.dots.uniforms);
    this.setPlanetRangeUniforms_(gl, this.programs.dots.uniforms);

    // Let shader provider set extra uniforms (e.g., symbology)
    if (this.shaderProvider_) {
      this.shaderProvider_.setExtraUniforms(gl, this.programs.dots.uniforms);
    }

    const profiler = FrameProfiler.getInstance();

    profiler.beginGpu(GpuStage.dots);
    gl.bindVertexArray(this.programs.dots.vao);

    // The per-frame position upload is driver/CPU time that hits shared-memory
    // (integrated) GPUs hardest, so it gets its own CPU stage
    profiler.beginCpu(CpuStage.dotBuffers);
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
    profiler.endCpu(CpuStage.dotBuffers);

    gl.enable(gl.BLEND);
    // Standard non-premultiplied alpha blend, set explicitly (not left to prior GL
    // state): the base/symbology fragment shaders drop their edge fragments to alpha 0
    // instead of discarding (keeps early-Z on), and that is only a true no-op when the
    // source factor is SRC_ALPHA.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false); // Disable depth writing

    // Cap draw count to position buffer capacity to prevent WebGL errors
    // during catalog swap when dotsOnScreen may reference the new catalog size
    // but vertex buffers still contain old catalog data
    const maxDrawable = this.positionData ? Math.floor(this.positionData.length / 3) : 0;
    const drawCount = Math.min(settingsManager.dotsOnScreen, maxDrawable);

    profiler.addCounter(CounterStage.dots, drawCount);
    gl.drawArrays(gl.POINTS, 0, drawCount);
    gl.bindVertexArray(null);
    profiler.endGpu(GpuStage.dots);

    // Debug: draw picking dots to screen using the same GL state as visual dots
    if (this.debugShowPicking) {
      this.drawPickingToScreen_(gl, projectionCameraMatrix, drawCount);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    /*
     * GPU picking (WP4): on idle frames the last-rendered picking buffer stays
     * valid (nothing under the cursor moved), so skip both full-catalog picking
     * passes AND the picking-earth silhouette. InputManager.isPickingRenderNeeded
     * (computed once per frame into renderer.shouldRenderPicking) turns this back
     * on for pointer/read activity and camera motion. The picking earth is drawn
     * here — before the picking dots so they depth-test against it — instead of in
     * Earth.drawSurfacePass, so it is gated with the dots and no longer inflates
     * the surface's GPU stage.
     */
    if (ServiceLocator.getRenderer().shouldRenderPicking) {
      profiler.beginGpu(GpuStage.picking);
      ServiceLocator.getScene().earth.drawGpuPickingEarth();
      this.drawGpuPickingFrameBuffer(projectionCameraMatrix, ServiceLocator.getMainCamera().state.mouseX, ServiceLocator.getMainCamera().state.mouseY);
      profiler.endGpu(GpuStage.picking);
    }
  }

  /**
   * Uploads the star dot index range so the vertex shaders can re-anchor the
   * star shell to the camera (stars are directions, not positions). The
   * no-stars default from catalog-loader is a degenerate range (starIndex1 ===
   * starIndex2 pointing at a real dot), so only a strictly increasing range is
   * forwarded; -1/-1 keeps the branch off for every vertex.
   */
  private setStarRangeUniforms_(gl: WebGL2RenderingContext, uniforms: { u_starIdx1: WebGLUniformLocation; u_starIdx2: WebGLUniformLocation }): void {
    const hasStars = this.starIndex2 > this.starIndex1;

    gl.uniform1i(uniforms.u_starIdx1, hasStars ? this.starIndex1 : -1);
    gl.uniform1i(uniforms.u_starIdx2, hasStars ? this.starIndex2 : -1);
  }

  /**
   * True when the view is about the solar system rather than Earth orbit.
   *
   * This is the ONE condition behind the body glyphs, their 1.4x sprite, the matching
   * pick-size floor, and the big-dot status the dots are drawn at - they all describe the same
   * thing, so they must all key off the same test or they disagree.
   *
   * It used to be camera RANGE (`> SOLAR_SYSTEM_SCALE_KM`), which made the glyphs vanish the
   * moment you zoomed in: from the Sun view, closing to 4e7 km flipped every glyph back to a
   * plain dot even though the planets there are still far under a pixel and the icon is the
   * only thing marking them. Range answers "how zoomed in am I", not "can I see the body
   * itself" - and the latter is already handled per-body and much better, by
   * `PlanetMoon.updateDotVisibility_` hiding a dot outright once its mesh is on screen, and by
   * the center body never drawing its own glyph (see `centerBodyGlyphSlot_`).
   *
   * `maxZoomDistance > 2e6` is the same marker the color schemes use to blank Earth-orbit
   * traffic (`ColorSchemeManager.getColorIfHiddenAtSolarSystemScale_`); the center-body test
   * is belt and braces for a view that set one without the other.
   */
  private static isSolarSystemView_(): boolean {
    return settingsManager.maxZoomDistance > (2e6 as Kilometers) || (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Moon);
  }

  /**
   * Records what each dot in the body block is, in catalog order starting at `planetDot1`.
   * Called once by the catalog loader after the block is built.
   *
   * The names come along because the dot the center body would draw has to be suppressed, and
   * `settingsManager.centerBody` names it rather than indexing it.
   */
  setBodyGlyphs(bodies: readonly { name: string; glyph: BodyGlyph }[]): void {
    this.bodyGlyphNames_ = bodies.map((body) => body.name);
    this.bodyGlyphWords_ = packBodyGlyphs(bodies.map((body) => body.glyph));
  }

  /**
   * Catalog index of the one dot the shaders must drop entirely, or -1 when there is none.
   *
   * That is the center body, and only while its own mesh is doing the job. The dot sits at the
   * mesh's exact center, so once the mesh is more than about a pixel wide the dot is a marker
   * for something you are already looking at: on a planet the sphere's depth buries it, but a
   * probe framed at 84 m is thin booms and the dot showed straight through the gaps.
   *
   * Zoomed back out the mesh shrinks to nothing and the center body needs its marker like
   * every other body, so this returns -1 again and the dot (and its glyph) come back. Same
   * `radius * DOT_HIDE_BODY_RADII` rule the moons use, so a body cannot be hidden by one and
   * shown by the other.
   *
   * An ABSOLUTE index, not a slot within the body block. The shaders compare it to
   * `gl_VertexID`, which is never negative, so the -1 "nothing hidden" case cannot match
   * anything. Handing them a slot instead was a real bug: slots are also -1 for every vertex
   * OUTSIDE the block, so the moment nothing was hidden the cull took every star, satellite
   * and marker in the catalog with it - visible as "the stars disappear when you zoom out".
   */
  private hiddenBodyDotIndex_(): number {
    const slot = this.bodyGlyphNames_.indexOf(settingsManager.centerBody);

    if (slot === -1 || !Number.isInteger(this.planetDot1)) {
      return -1;
    }

    // The center body sits at the origin of the shifted world the dots are drawn in, so the
    // camera's own position in that frame IS the range to it.
    const camPos = ServiceLocator.getMainCamera()?.getCamPos();
    // Earth is its own class and reports only RADIUS; every other body prefers the zoom-floor
    // radius, which is the longest axis for an irregular shape and the mesh for a probe.
    const body = ServiceLocator.getScene()?.getBodyById(settingsManager.centerBody) as { zoomFloorRadiusKm?: number; RADIUS?: number } | null;
    const radiusKm = body?.zoomFloorRadiusKm ?? body?.RADIUS ?? 0;

    if (!camPos || radiusKm <= 0) {
      return -1;
    }

    return Math.hypot(camPos[0], camPos[1], camPos[2]) <= radiusKm * DOT_HIDE_BODY_RADII ? this.planetDot1 + slot : -1;
  }

  /**
   * Uploads the body dot index range, the packed per-body glyph table, and the index of the one
   * dot that is dropped.
   *
   * The range covers the WHOLE block - planets, dwarf planets, asteroids, moons and the
   * deep-space probes that share its tail. Telling the probes apart from the bodies is the
   * glyph table's job now (they get {@link BodyGlyph.Spacecraft}), so there is no second
   * index boundary in the shaders. -1/-1 keeps every body branch off for every vertex until
   * the catalog populates the indices.
   *
   * `u_planetGlyph` gates the glyphs themselves, and is deliberately separate from the range:
   * the range also marks bodies exempt from the near-origin cull (Earth's dot sits AT the
   * ECI origin) and excludes them from the star branch, and both of those must hold in every
   * view. Only the drawn glyph, its 1.4x sprite and the matching pick-size floor follow it.
   */
  private setPlanetRangeUniforms_(gl: WebGL2RenderingContext, uniforms: PickingRangeUniforms | BodyRangeUniforms): void {
    const end = this.planetDot2;
    const hasPlanets = Number.isInteger(this.planetDot1) && Number.isInteger(end) && end > this.planetDot1;

    gl.uniform1i(uniforms.u_planetIdx1, hasPlanets ? this.planetDot1 : -1);
    gl.uniform1i(uniforms.u_planetIdx2, hasPlanets ? end - 1 : -1);
    gl.uniform1i(uniforms.u_planetGlyph, DotsManager.isSolarSystemView_() ? 1 : 0);
    gl.uniform1i(uniforms.u_hiddenBodyIdx, this.hiddenBodyDotIndex_());

    if ('u_bodyGlyph' in uniforms) {
      gl.uniform1iv(uniforms.u_bodyGlyph, this.bodyGlyphWords_);
    }
  }

  /**
   * Draws the GPU picking frame buffer.
   * @param pMvCamMatrix - The projection, model view, and camera matrix.
   * @param mouseX - The x-coordinate of the mouse.
   * @param mouseY - The y-coordinate of the mouse.
   */
  drawGpuPickingFrameBuffer(pMvCamMatrix: mat4, mouseX: number, mouseY: number) {
    if (!this.isReady || !settingsManager.cruncherReady || settingsManager.isDisableGpuPicking) {
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
    gl.uniform3fv(this.programs.picking.uniforms.worldOffset, isFlatMapPick || isPolarViewPick ? [0, 0, 0] : (Scene.getInstance().worldShift ?? [0, 0, 0]));

    gl.uniform1i(this.programs.picking.uniforms.u_flatMapMode, isFlatMapPick ? 1 : 0);
    gl.uniform1i(this.programs.picking.uniforms.u_polarViewMode, isPolarViewPick ? 1 : 0);
    gl.uniform1f(this.programs.picking.uniforms.u_gmst, this.cruncherGmst);
    gl.uniform1f(this.programs.picking.uniforms.u_currentGmst, ServiceLocator.getTimeManager().gmst);
    gl.uniform1f(this.programs.picking.uniforms.u_earthRadius, RADIUS_OF_EARTH);
    gl.uniform3fv(this.programs.picking.uniforms.u_camPos, mainCam.getCamPos() as Float32Array);
    this.setStarRangeUniforms_(gl, this.programs.picking.uniforms);
    this.setPlanetRangeUniforms_(gl, this.programs.picking.uniforms);
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

    // no reason to render 100000s of pixels when we're only going to read a small box
    if (settingsManager.isMobileModeEnabled) {
      // Unscissored: the whole buffer is valid to read from
      this.lastPickDrawBox = { x0: 0, y0: 0, size: Math.max(gl.drawingBufferWidth, gl.drawingBufferHeight), cx: 0, cy: 0 };
    } else {
      const pickBox = this.getPickBox(gl, mouseX, mouseY);

      this.lastPickDrawBox = pickBox;
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(pickBox.x0, pickBox.y0, pickBox.size, pickBox.size);
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
   * Turns off every `gl_VertexID`-keyed branch in the picking vertex shader. MUST be called
   * before drawing anything through that program which is NOT the dots buffer.
   *
   * The shader identifies stars and planets by comparing `gl_VertexID` against catalog index
   * ranges, which only means anything while the dots buffer is the source. Earth's occlusion
   * mesh is 66,049 vertices, so its vertex ids run straight through the star range - ~9,096 of
   * its sphere vertices were being camera-anchored (`eciPos = a_position + u_camPos`) like a
   * star, and the triangles bridging them to the untouched vertices clipped into a wedge
   * covering 27% of the picking buffer, blanking every dot behind it. The visible earth was
   * fine because the surface pass has its own shader, so this only ever showed up as "objects
   * in that part of the sky cannot be hovered or selected".
   */
  disableObjectRangeUniformsForMesh(gl: WebGL2RenderingContext, uniforms: PickingRangeUniforms): void {
    gl.uniform1i(uniforms.u_starIdx1, -1);
    gl.uniform1i(uniforms.u_starIdx2, -1);
    gl.uniform1i(uniforms.u_planetIdx1, -1);
    gl.uniform1i(uniforms.u_planetIdx2, -1);
    gl.uniform1i(uniforms.u_planetGlyph, 0);
  }

  /**
   * The cursor-centred square of the picking framebuffer, in drawing-buffer pixels with
   * y measured from the BOTTOM (GL convention). Every producer (the dots scissor, the
   * picking-earth scissor) and the consumer (`InputManager.getSatIdFromCoord`) must use
   * this one definition or the read lands outside what was rendered.
   *
   * `cx`/`cy` are the cursor itself inside that box, which stays put when the box is
   * clamped against a screen edge - the decoder needs it to find the hit nearest the
   * actual cursor rather than the box centre.
   */
  getPickBox(gl: WebGL2RenderingContext, mouseX: number, mouseY: number): PickBox {
    // A canvas smaller than the box (unit tests, tiny embeds) would push readPixels out of range
    const size = Math.max(1, Math.min(this.PICKING_READ_PIXEL_BUFFER_SIZE, gl.drawingBufferWidth, gl.drawingBufferHeight));
    const half = size >> 1;
    const cx = Math.round(mouseX);
    const cy = Math.round(gl.drawingBufferHeight - mouseY);

    return {
      x0: Math.max(0, Math.min(gl.drawingBufferWidth - size, cx - half)),
      y0: Math.max(0, Math.min(gl.drawingBufferHeight - size, cy - half)),
      size,
      cx,
      cy,
    };
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
    gl.uniform3fv(this.programs.picking.uniforms.worldOffset, isFlatMap || isPolarView ? [0, 0, 0] : (Scene.getInstance().worldShift ?? [0, 0, 0]));

    gl.uniform1i(this.programs.picking.uniforms.u_flatMapMode, isFlatMap ? 1 : 0);
    gl.uniform1i(this.programs.picking.uniforms.u_polarViewMode, isPolarView ? 1 : 0);
    gl.uniform1f(this.programs.picking.uniforms.u_gmst, this.cruncherGmst);
    gl.uniform1f(this.programs.picking.uniforms.u_currentGmst, ServiceLocator.getTimeManager().gmst);
    gl.uniform1f(this.programs.picking.uniforms.u_earthRadius, RADIUS_OF_EARTH);
    gl.uniform3fv(this.programs.picking.uniforms.u_camPos, mainCam.getCamPos() as Float32Array);
    this.setStarRangeUniforms_(gl, this.programs.picking.uniforms);
    this.setPlanetRangeUniforms_(gl, this.programs.picking.uniforms);
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

    return [pos[0] * cosD - pos[1] * sinD, pos[0] * sinD + pos[1] * cosD, pos[2]] as EciArr3;
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
      this.programs.dots.uniforms
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
    GlUtils.assignUniforms(this.programs.picking.uniforms, gl, this.programs.picking.program, [
      'u_pMvCamMatrix',
      'worldOffset',
      'logDepthBufFC',
      'u_flatMapMode',
      'u_gmst',
      'u_currentGmst',
      'u_earthRadius',
      'u_flatMapCenterX',
      'u_flatMapZoom',
      'u_camPos',
      'u_starIdx1',
      'u_starIdx2',
      'u_planetIdx1',
      'u_planetIdx2',
      'u_planetGlyph',
      'u_hiddenBodyIdx',
      // NOTE: no 'u_bodyGlyph' - the picking shader only needs to know a dot IS a body
      // (for the origin-cull exemption and the pick-size floor), never which glyph it draws.
    ]);

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
    this.positionData = undefined as unknown as Float32Array;
    this.velocityData = undefined as unknown as Float32Array;
    this.inViewData = undefined as unknown as Int8Array;
    this.inSunData = undefined as unknown as Int8Array;
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

    // Main-thread time copying worker results (100k+ element typed arrays) —
    // arrives between frames and competes with the render loop, so it is
    // profiled per occurrence rather than per frame
    const profiler = FrameProfiler.getInstance();

    profiler.beginCpu(CpuStage.cruncherMsg);
    try {
      this.applyCruncherBuffers_(mData);
    } finally {
      profiler.endCpu(CpuStage.cruncherMsg);
    }
  }

  private applyCruncherBuffers_(mData: SatCruncherMessageData) {
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

    /*
     * The worker does not propagate OEM objects, so the copy above zeroes their slots until the next frame.
     * Re-apply them now: a search, hover or pick between this message and the frame read (0, 0, 0) and showed
     * the mission as "Decayed" (its search row then ignored clicks).
     */
    if (mData.satPos || mData.satVel) {
      this.interpolatePositionsOfOemSatellites();
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
      id?: number;
      name?: string;
      type?: number;
      velocity: TemeVec3<KilometersPerSecond>;
      position: TemeVec3;
    };

    // Static objects (stars, ground objects, sensors) carry a cruncher-computed position but
    // no velocity — their satVel slots stay zero and they have no `velocity` member to mutate.
    // Skip the velocity work for them; still write position so hover/info paths can read it.
    if (!object.isStatic()) {
      // Guard for issue #834 — telemeters when prior velocity was structurally invalid.
      ensureVelocityVec3(spaceObject, 'DotsManager.updatePosVel');

      const isChanged =
        spaceObject.velocity.x !== this.velocityData[i * 3] || spaceObject.velocity.y !== this.velocityData[i * 3 + 1] || spaceObject.velocity.z !== this.velocityData[i * 3 + 2];

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

    const isInterpolationFrame = renderer.dtAdjusted > settingsManager.minimumDrawDt || Math.abs(this.lastUpdateSimTime - simTime) > 1000;

    if (!settingsManager.lowPerf && isInterpolationFrame) {
      if ((settingsManager.centerBody === SolarBody.Earth || settingsManager.centerBody === SolarBody.Moon) && !settingsManager.isSkipTleInterpolation) {
        this.interpolatePositionsOfTleSatellites_(renderer);
      }
    }

    /*
     * The selected primary and secondary are recomputed on the main thread every frame, after the cloud-wide
     * interpolation so the exact state is not pushed forward by one extra dt. This runs while paused as well:
     * after a time jump the next cruncher message still carries pre-jump positions and would otherwise
     * overwrite the slots until the worker catches up (1-2 s), which showed a wrong primary-secondary line,
     * secondary covariance bubble and dot. Every other dot stays on the worker.
     */
    if (!settingsManager.lowPerf) {
      this.updateSelectedPositionsOnMainThread_(isInterpolationFrame);
    }

    this.interpolatePositionsOfOemSatellites();
    this.interpolatePositionsOfMissiles_();

    this.lastUpdateSimTime = simTime;
  }

  /**
   * Overwrite the selected primary's and secondary's position/velocity slots with a main-thread propagation at
   * the current simulation time. Only these two objects are recomputed (one SGP4 call each); the rest of the
   * cloud stays on the position cruncher.
   * @param isInterpolationFrame - true when the legacy dt gate passed; OEM primaries are only advanced then,
   * since their history update is not meant to run on every paused frame.
   */
  private updateSelectedPositionsOnMainThread_(isInterpolationFrame: boolean): void {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    if (!selectSatManager) {
      return;
    }

    const catalogManager = ServiceLocator.getCatalogManager();
    const simTimeObj = ServiceLocator.getTimeManager().simulationTimeObj;
    const primaryId = Number(selectSatManager.selectedSat ?? -1);
    const secondaryId = Number(selectSatManager.secondarySat ?? -1);

    if (primaryId > -1) {
      const obj = catalogManager.objectCache[primaryId];

      if (obj instanceof Satellite) {
        this.writeSatelliteStateFromSgp4_(obj, simTimeObj);
      } else if (obj instanceof OemSatellite && isInterpolationFrame) {
        // WARN: Necessary for orbit history
        const pv = obj.updatePosAndVel((simTimeObj.getTime() / 1000) as Seconds);

        if (pv) {
          this.writeSlot_(Number(obj.id), pv[0], pv[1], pv[2], pv[3], pv[4], pv[5]);
        }
      }
    }

    if (secondaryId > -1 && secondaryId !== primaryId) {
      const obj = catalogManager.objectCache[secondaryId];

      if (obj instanceof Satellite) {
        this.writeSatelliteStateFromSgp4_(obj, simTimeObj);
      }
    }
  }

  private writeSatelliteStateFromSgp4_(sat: Satellite, simTimeObj: Date): void {
    const pv = sat.eci(simTimeObj);

    if (!pv) {
      return;
    }

    this.writeSlot_(Number(sat.id), pv.position.x, pv.position.y, pv.position.z, pv.velocity.x, pv.velocity.y, pv.velocity.z);
  }

  private writeSlot_(id: number, px: number, py: number, pz: number, vx: number, vy: number, vz: number): void {
    const i3 = id * 3;

    if (i3 + 2 >= this.positionData.length || i3 + 2 >= this.velocityData.length) {
      return;
    }

    this.positionData[i3] = px;
    this.positionData[i3 + 1] = py;
    this.positionData[i3 + 2] = pz;
    this.velocityData[i3] = vx;
    this.velocityData[i3 + 1] = vy;
    this.velocityData[i3 + 2] = vz;
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

    // The missile reservation is the contiguous objectCache block ending at `missileSats`
    // (missileSet.length === maxMissiles gives its size). Read each slot from objectCache by id
    // rather than from missileSet[k]: some load paths (mass raid, scenario restore) REPLACE
    // objectCache[id] with a freshly constructed MissileObject, which leaves missileSet[k]
    // pointing at the stale, inactive placeholder. Indexing objectCache keeps us on the
    // authoritative object; the `active` early-out still skips idle slots with just a boolean read.
    const missileStartId = missileSats - missileSet.length;
    const objectCache = catalogManagerInstance.objectCache;

    for (let k = 0; k < missileSet.length; k++) {
      const id = missileStartId + k;
      const obj = objectCache[id] as MissileObject;

      if (!obj.active || obj.altList.length === 0) {
        continue;
      }

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

      const toEci = (idx: number, g: GreenwichMeanSiderealTime) =>
        lla2eci({ lat: (obj.latList[idx] * DEG2RAD) as Radians, lon: (obj.lonList[idx] * DEG2RAD) as Radians, alt: obj.altList[idx] }, g);

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

  /**
   * Returns the DotStatus code for a dot (stored in the size buffer). Any
   * status >= DotStatus.Big renders at star size; the fragment shader uses the
   * exact code to draw identification markers (selected wins over searched).
   */
  getSize(i: number): number {
    // Check if the index is the selected satellite
    const selectedSat = PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1;

    if (i === selectedSat) {
      return DotStatus.Selected;
    }

    // Check if the index is part of lastSearchResults
    if (settingsManager.lastSearchResults.includes(i)) {
      return DotStatus.Searched;
    }

    // Stars use distance-based sizing (size 0) — at 3e10 km they naturally get u_minSize

    if (this.isBodyDotBig_(i)) {
      return DotStatus.Big; // Big dot for planets, but no marker
    }

    // Default size for other satellites
    return DotStatus.None;
  }

  /**
   * Whether dot `i` is a solar-system body that should render at the fixed big-dot size.
   *
   * The ONE definition of that rule. It used to live only inside {@link getSize}, which is the
   * un-hover path, while {@link updateSizeBuffer} - the rebuild path - reset the whole buffer
   * to `None` and never wrote `Big` back. So a body's glyph grew the first time the cursor
   * left it and shrank again on the next search, deselect or right-click "clear screen", which
   * is exactly the size flicker that looked like a glyph bug.
   */
  private isBodyDotBig_(i: number): boolean {
    return (
      i >= this.planetDot1 &&
      i < this.planetDot2 &&
      // TODO: This is hacky. We need better logic for determining when to show planet dots
      (settingsManager.maxZoomDistance > (2e6 as Kilometers) || (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Moon))
    );
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
      this.sizeData[i] = DotStatus.None;
    }

    /*
     * Solar-system bodies render at the fixed big-dot size so their glyph is legible from
     * across the solar system. This has to agree with getSize(), which is what the un-hover
     * path writes back — if it does not, a body changes size the moment either path runs.
     */
    if (Number.isInteger(this.planetDot1) && Number.isInteger(this.planetDot2)) {
      const bodyEnd = Math.min(this.planetDot2, bufferLen);

      for (let i = this.planetDot1; i < bodyEnd; i++) {
        if (this.isBodyDotBig_(i)) {
          this.sizeData[i] = DotStatus.Big;
        }
      }
    }

    /*
     * Satellites that are currently being searched render at star size (the
     * vertex shaders treat any status >= 0.5 as "big") and the fragment shader
     * draws a search ring around them. Selected is written last so it wins if
     * the selected object is also in the search results.
     */
    for (const lastSearchResult of settingsManager.lastSearchResults) {
      this.sizeData[lastSearchResult] = DotStatus.Searched;
    }

    const selectedSat = PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1;

    if (Number(selectedSat) > -1) {
      this.sizeData[Number(selectedSat)] = DotStatus.Selected;
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
        picking: <{ vert: string; frag: string }>(<unknown>null),
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
        picking: <{ vert: string; frag: string }>(<unknown>null),
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
                uniform vec3 u_camPos;
                uniform int u_starIdx1;
                uniform int u_starIdx2;
                uniform int u_planetIdx1;
                uniform int u_planetIdx2;
                uniform bool u_planetGlyph;
                uniform int u_hiddenBodyIdx;

                out vec3 vColor;

                void main(void) {
                // Body dots (planets, moons, asteroids and the deep-space probes that share
                // the block) are exempt from the near-origin cull below: Earth's own planet
                // dot legitimately sits AT the ECI origin. Must match the visual dots shaders
                // or Earth becomes unpickable. Picking does not care WHICH glyph a body draws,
                // only that it draws one, so the packed glyph table stays out of this shader -
                // but the center body draws none, and that it does have to know.
                int bodySlot = (gl_VertexID >= u_planetIdx1 && gl_VertexID <= u_planetIdx2) ? gl_VertexID - u_planetIdx1 : -1;
                float isPlanet = bodySlot >= 0 ? 1.0 : 0.0;
                float hasGlyph = (bodySlot >= 0 && u_planetGlyph) ? 1.0 : 0.0;

                // The center body's dot is not drawn while its mesh is on screen, so it must
                // not be clickable either - an invisible click target on top of the mesh would
                // steal every click aimed at the body itself. Must match the visual shaders,
                // including comparing the ABSOLUTE vertex id rather than the slot (slots are
                // -1 outside the body block, which made the -1 "nothing hidden" sentinel
                // match every star and satellite in the catalog).
                if (gl_VertexID == u_hiddenBodyIdx) {
                    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                    gl_PointSize = 0.0;
                    vColor = vec3(0.0);
                    return;
                }

                // Skip objects with invalid positions:
                // - NaN from failed propagation (NaN comparisons always false)
                // - Positions inside Earth (< 100 km from center)
                float posLen = length(a_position);
                if ((posLen < 100.0 && isPlanet < 0.5) || posLen != posLen) {
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
                    // Camera-anchor the star shell exactly like the visual dots
                    // shader so picking stays consistent with what is rendered
                    if (gl_VertexID >= u_starIdx1 && gl_VertexID <= u_starIdx2) {
                        eciPos = a_position + u_camPos;
                    }
                    // Same camera pull (capped) as the visual dots shader so
                    // picking stays consistent with what is rendered on screen
                    vec3 toCam = u_camPos - eciPos;
                    float pullDist = min(length(toCam) * ${settingsManager.satShader.depthPullFactor}, float(${settingsManager.satShader.depthPullMaxKm}));
                    eciPos += normalize(toCam) * pullDist;
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
                    /*
                     * Bodies draw a bold glyph at star size (x1.4 in the visual shaders), but
                     * the distance term above collapses their pick square to half the base
                     * size at solar-system range - the visible glyph ends up wider than the
                     * pickable area, so hovering the ring does nothing and planet hover feels
                     * random. Never let a body's pick target shrink below what is drawn.
                     *
                     * Gated on hasGlyph, not isPlanet, for the same reason the floor exists:
                     * a body that draws no glyph is an ordinary-sized dot, and an oversized
                     * pick square around one is the invisible-but-clickable trap in reverse.
                     */
                    pickSize = max(pickSize, hasGlyph * ${settingsManager.satShader.starSize} * 1.4);
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

/* eslint-disable max-lines */
/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { Planet } from '@app/app/objects/planet';
import { SplashScreen } from '@app/app/ui/splash-screen';
import { SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { GlUtils } from '@app/engine/rendering/gl-utils';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { glsl } from '@app/engine/utils/development/formatter';
import { CameraType } from '@app/engine/camera/camera-type';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Seconds, Sun, TEME, Vector3D } from '@ootk/src/main';
import { BackdatePosition as backdatePosition, Body, KM_PER_AU } from 'astronomy-engine';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { errorManagerInstance } from '../../utils/errorManager';
import { PersistenceManager, StorageKey } from '../../utils/persistence-manager';
import { DepthManager } from '../depth-manager';
import { OrbitPathLine } from '../line-manager/orbit-path';
import { PlanetColors } from './celestial-bodies/celestial-body';
import {
  AtmosphereSettings, EarthBumpTextureQuality, EarthCloudTextureQuality, EarthDayTextureQuality, EarthNightTextureQuality, EarthPoliticalTextureQuality,
  EarthSpecTextureQuality, EarthTextureStyle,
} from './earth-quality-enums';
import { OcclusionProgram } from './post-processing';

export class Earth {
  private gl_: WebGL2RenderingContext;
  private glowDirection_ = 1;
  private glowNumber_ = 0;
  private modelViewMatrix_: mat4;
  private readonly normalMatrix_: mat3 = mat3.create();
  textureDay: Record<string, WebGLTexture> = {
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.POTATO]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.LOW]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.MEDIUM]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.HIGH]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.ULTRA]: <WebGLTexture><unknown>null,
  };
  textureNight: Record<string, WebGLTexture> = {
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.POTATO]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.LOW]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.MEDIUM]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.HIGH]: <WebGLTexture><unknown>null,
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.ULTRA]: <WebGLTexture><unknown>null,
  };
  textureSpec: Record<EarthSpecTextureQuality, WebGLTexture> = {
    [EarthSpecTextureQuality.OFF]: <WebGLTexture><unknown>null,
    [EarthSpecTextureQuality.POTATO]: <WebGLTexture><unknown>null,
    [EarthSpecTextureQuality.LOW]: <WebGLTexture><unknown>null,
    [EarthSpecTextureQuality.MEDIUM]: <WebGLTexture><unknown>null,
    [EarthSpecTextureQuality.HIGH]: <WebGLTexture><unknown>null,
    [EarthSpecTextureQuality.ULTRA]: <WebGLTexture><unknown>null,
  };
  textureBump: Record<EarthBumpTextureQuality, WebGLTexture> = {
    [EarthBumpTextureQuality.OFF]: <WebGLTexture><unknown>null,
    [EarthBumpTextureQuality.LOW]: <WebGLTexture><unknown>null,
    [EarthBumpTextureQuality.MEDIUM]: <WebGLTexture><unknown>null,
    [EarthBumpTextureQuality.HIGH]: <WebGLTexture><unknown>null,
  };
  texturePolitical: Record<EarthPoliticalTextureQuality, WebGLTexture> = {
    [EarthPoliticalTextureQuality.OFF]: <WebGLTexture><unknown>null,
    [EarthPoliticalTextureQuality.POTATO]: <WebGLTexture><unknown>null,
    [EarthPoliticalTextureQuality.LOW]: <WebGLTexture><unknown>null,
    [EarthPoliticalTextureQuality.MEDIUM]: <WebGLTexture><unknown>null,
    [EarthPoliticalTextureQuality.HIGH]: <WebGLTexture><unknown>null,
    [EarthPoliticalTextureQuality.ULTRA]: <WebGLTexture><unknown>null,
  };
  textureClouds: Record<EarthCloudTextureQuality, WebGLTexture> = {
    [EarthCloudTextureQuality.OFF]: <WebGLTexture><unknown>null,
    [EarthCloudTextureQuality.POTATO]: <WebGLTexture><unknown>null,
    [EarthCloudTextureQuality.LOW]: <WebGLTexture><unknown>null,
    [EarthCloudTextureQuality.MEDIUM]: <WebGLTexture><unknown>null,
    [EarthCloudTextureQuality.HIGH]: <WebGLTexture><unknown>null,
    [EarthCloudTextureQuality.ULTRA]: <WebGLTexture><unknown>null,
  };
  /**
   * 1x1 placeholder textures, one per surface-shader sampler. Bound when the real texture
   * is missing (feature disabled or load failed). Day uses gray so failure is visible;
   * other channels use transparent so the shader produces a shader-correct "no effect".
   */
  private placeholders_: Record<'day' | 'dayBlack' | 'night' | 'bump' | 'spec' | 'political' | 'clouds' | 'coverage', WebGLTexture | null> =
    { day: null, dayBlack: null, night: null, bump: null, spec: null, political: null, clouds: null, coverage: null };
  /** Keys of day textures whose load promise rejected — distinguishes failure from isBlackEarth. */
  private failedDayKeys_ = new Set<string>();
  private vaoOcclusion_: WebGLVertexArrayObject;
  /** Normalized vector pointing to the sun. */
  lightDirection = <vec3>[0, 0, 0];
  surfaceMesh: Mesh;
  atmosphereMesh: Mesh | null = null;
  /**
   * Generic equirectangular coverage overlay. This is an inert engine hook: it does
   * nothing until a plugin (e.g. CoverageAnalysis Pro) creates a single-channel
   * coverage texture and feeds it in via {@link setCoverageOverlay}. The texture's
   * red channel is treated as a normalized 0..1 value the shader maps to a color ramp.
   */
  coverageTexture: WebGLTexture | null = null;
  isDrawCoverageOverlay = false;
  coverageOverlayOpacity = 0.6;
  imageCache: Record<string, HTMLImageElement> = {};
  cloudPosition_: number = 0;
  RADIUS: number = RADIUS_OF_EARTH;
  position = <vec3>[0, 0, 0];
  planetObject: Planet | null = null;

  private readonly BUMP_SRC_BASE = 'earthbump';
  private readonly SPEC_SRC_BASE = 'earthspec';
  private readonly POLITICAL_SRC_BASE = 'boundaries';
  private readonly CLOUDS_SRC_BASE = 'clouds';
  private readonly DEFAULT_RESOLUTION = '1k';
  orbitalPeriod: Seconds = 365.25 * 24 * 3600 as Seconds;
  meanDistanceToSun: Kilometers = 149597870.7 as Kilometers;
  orbitPathSegments_ = 8192;
  svCache: { x: Kilometers; y: Kilometers; z: Kilometers }[] = [];
  fullOrbitPath: OrbitPathLine | null = null;
  color = PlanetColors.EARTH;
  isDrawOrbitPath: boolean = false;
  lastOrbitCalcTime_: number;

  /**
   * This is run once per frame to render the earth.
   */
  draw(tgtBuffer: WebGLFramebuffer | null) {
    this.drawEarthSurface_(tgtBuffer);
    if (settingsManager.isDrawAtmosphere === AtmosphereSettings.ON) {
      this.drawEarthAtmosphere_(tgtBuffer);
    }
    this.drawBlackGpuPickingEarth_();
  }

  drawAtmosphereOnly(tgtBuffer: WebGLFramebuffer | null) {
    if (settingsManager.isDrawAtmosphere === AtmosphereSettings.ON) {
      this.drawEarthAtmosphere_(tgtBuffer);
    }
  }

  changeEarthTextureStyle(style: EarthTextureStyle) {
    settingsManager.earthTextureStyle = style;
    // Reinit the current textures
    this.initTextures_();

    PersistenceManager.getInstance().saveItem(StorageKey.LAST_MAP, style);
  }

  useHighestQualityTexture(): void {
    // Nothing to do here since we always load the highest quality first
  }

  /**
   * Feed the generic coverage overlay. Pass `texture = null` (or `enabled = false`)
   * to turn the overlay off. The overlay owner (a plugin) is responsible for the
   * texture's lifetime; Earth only binds and samples it.
   */
  setCoverageOverlay(texture: WebGLTexture | null, enabled: boolean, opacity?: number): void {
    this.coverageTexture = texture;
    this.isDrawCoverageOverlay = enabled && !!texture;
    if (typeof opacity === 'number') {
      this.coverageOverlayOpacity = opacity;
    }
  }

  /**
   * This is run once per frame to render the earth in godrays buffer.
   */
  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLFramebuffer): void {
    if (settingsManager.isDisableGodrays) {
      return;
    }

    const gl = this.gl_;
    // Change to the earth shader

    gl.useProgram(occlusionPrgm.program);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.depthMask(true);

    occlusionPrgm.attrSetup(this.surfaceMesh.geometry.getCombinedBuffer());

    // Set the uniforms
    occlusionPrgm.uniformSetup(this.modelViewMatrix_, pMatrix, camMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.surfaceMesh.geometry.getIndex());
    gl.drawElements(gl.TRIANGLES, this.surfaceMesh.geometry.indexLength, this.surfaceMesh.geometry.indexType, 0);

    /*
     * DEBUG:
     * occlusionPrgm.attrOff(occlusionPrgm);
     */
  }

  /**
   * This is run once per session to initialize the earth.
   */
  init(gl?: WebGL2RenderingContext): void {
    try {
      if (!gl && !this.gl_) {
        throw new Error('No WebGL context found');
      }
      this.gl_ ??= gl!;

      if (!settingsManager.plugins.GraphicsSettingsPlugin?.enabled) {
        settingsManager.earthBumpTextureQuality ??= EarthBumpTextureQuality.OFF;
        settingsManager.earthSpecTextureQuality ??= EarthSpecTextureQuality.OFF;
        settingsManager.earthDayTextureQuality ??= EarthDayTextureQuality.MEDIUM;
        settingsManager.earthNightTextureQuality ??= EarthNightTextureQuality.MEDIUM;
        settingsManager.earthPoliticalTextureQuality ??= EarthPoliticalTextureQuality.OFF;
        settingsManager.earthCloudTextureQuality ??= EarthCloudTextureQuality.OFF;
      }

      this.initPlaceholderTexture_();
      this.initTextures_();

      // We only need to make the mesh once
      if (!this.surfaceMesh) {
        const earthSurfaceGeometry = new SphereGeometry(this.gl_, {
          radius: RADIUS_OF_EARTH,
          widthSegments: settingsManager.earthNumLatSegs,
          heightSegments: settingsManager.earthNumLonSegs,
        });
        const earthSurfaceMaterial = new ShaderMaterial(this.gl_, {
          uniforms: {
            uIsAmbientLighting: <WebGLUniformLocation><unknown>null,
            uGlow: <WebGLUniformLocation><unknown>null,
            uZoomLevel: <WebGLUniformLocation><unknown>null,
            uisGrayScale: <WebGLUniformLocation><unknown>null,
            uCloudPosition: <WebGLUniformLocation><unknown>null,
            uIsDrawAurora: <WebGLUniformLocation><unknown>null,
            uShowGraticule: <WebGLUniformLocation><unknown>null,
            uLightDirection: <WebGLUniformLocation><unknown>null,
            uDayMap: <WebGLUniformLocation><unknown>null,
            uNightMap: <WebGLUniformLocation><unknown>null,
            uBumpMap: <WebGLUniformLocation><unknown>null,
            uSpecMap: <WebGLUniformLocation><unknown>null,
            uPoliticalMap: <WebGLUniformLocation><unknown>null,
            uCloudsMap: <WebGLUniformLocation><unknown>null,
            uCoverageMap: <WebGLUniformLocation><unknown>null,
            uCoverageEnabled: <WebGLUniformLocation><unknown>null,
            uCoverageOpacity: <WebGLUniformLocation><unknown>null,
            uRawZoomLevel: <WebGLUniformLocation><unknown>null,
            uisDrawNightAsDay: <WebGLUniformLocation><unknown>null,
          },
          vertexShader: this.shaders.surfaceVert,
          fragmentShader: this.shaders.surfaceFrag,
          glslVersion: GLSL3,
        });

        this.surfaceMesh = new Mesh(this.gl_, earthSurfaceGeometry, earthSurfaceMaterial, {
          name: 'earth',
          precision: 'highp',
          disabledUniforms: {
            modelMatrix: true,
            viewMatrix: true,
            worldOffset: true,
          },
        });

        this.initVaoSurface_();
        this.initVaoOcclusion_();

        if (this.shaders.atmosphereFrag !== '' && this.shaders.atmosphereVert !== '') {
          const earthAtmosphereGeometry = new SphereGeometry(this.gl_, {
            radius: RADIUS_OF_EARTH * 1.025, // Slightly larger than the earth
            widthSegments: settingsManager.earthNumLatSegs,
            heightSegments: settingsManager.earthNumLonSegs,
          });
          const earthAtmosphereMaterial = new ShaderMaterial(this.gl_, {
            uniforms: {
              uLightDirection: <WebGLUniformLocation><unknown>null,
            },
            vertexShader: this.shaders.atmosphereVert,
            fragmentShader: this.shaders.atmosphereFrag,
            glslVersion: GLSL3,
          });

          this.atmosphereMesh = new Mesh(this.gl_, earthAtmosphereGeometry, earthAtmosphereMaterial, {
            name: 'earth-atmosphere',
            precision: 'highp',
            disabledUniforms: {
              modelMatrix: true,
              viewMatrix: true,
            },
          });

          this.initVaoAtmosphere_();
        }

        EventBus.getInstance().on(EventBusEvent.onLinesCleared, () => {
          this.isDrawOrbitPath = false;
          if (this.fullOrbitPath) {
            this.fullOrbitPath.isGarbage = true;
            this.fullOrbitPath = null;
          }
        });

      }
    } catch (error) {
      errorManagerInstance.warn(error);
    }
  }

  typeToString(): string {
    return 'Terrestrial Planet';
  }

  /**
   * This is run once per frame to update the earth.
   */
  update(): void {
    const gmst = ServiceLocator.getTimeManager().gmst;
    const sunPos = Sun.eci(ServiceLocator.getTimeManager().simulationTimeObj);

    if (this.isDrawOrbitPath && (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Moon)) {
      this.drawFullOrbitPath();
    }

    this.lightDirection = [sunPos.x, sunPos.y, sunPos.z];
    vec3.normalize(<vec3>(<unknown>this.lightDirection), <vec3>(<unknown>this.lightDirection));

    this.modelViewMatrix_ = mat4.copy(mat4.create(), this.surfaceMesh.geometry.localMvMatrix);

    if (settingsManager.centerBody !== SolarBody.Earth || (PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? '-1') !== '-1') {
      const worldShift = Scene.getInstance().worldShift;

      mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, vec3.fromValues(worldShift[0], worldShift[1], worldShift[2]));
    }

    mat4.rotateZ(this.modelViewMatrix_, this.modelViewMatrix_, gmst);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);

    // Update the aurora glow
    this.glowNumber_ += 0.0025 * this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ > 1 ? -1 : this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ < 0 ? 1 : this.glowDirection_;

    const timeManager = ServiceLocator.getTimeManager();
    // Derive cloud position from simulation time so clouds move correctly during time changes
    const msPerFullRotation = 5 * 24 * 60 * 60 * 1000; // ~10 days for a full texture cycle

    this.cloudPosition_ = (timeManager.simulationTimeObj.getTime() % msPerFullRotation) / msPerFullRotation;
  }

  private getSrc_(base: string, resolution: string | undefined, extension = 'jpg'): string {
    if (!settingsManager.installDirectory) {
      throw new Error('settingsManager.installDirectory is undefined');
    }

    return `${settingsManager.installDirectory}textures/${base}${resolution ?? this.DEFAULT_RESOLUTION}.${extension}`;
  }

  getJ2000(simTime: Date, centerBody = SolarBody.Earth): J2000 {
    const pos = backdatePosition(simTime, centerBody as unknown as Body, SolarBody.Earth as unknown as Body, false);

    return new J2000(
      new EpochUTC((simTime.getTime() / 1000) as Seconds), // convert ms to s
      new Vector3D(pos.x * KM_PER_AU as Kilometers, pos.y * KM_PER_AU as Kilometers, pos.z * KM_PER_AU as Kilometers),
      new Vector3D(0 as KilometersPerSecond, 0 as KilometersPerSecond, 0 as KilometersPerSecond),
    );
  }

  getTeme(simTime: Date, centerBody = SolarBody.Earth): TEME {
    // If the center body is earth, return a zero position and velocity in TEME
    // and avoid unnecessary calculations
    if (centerBody === SolarBody.Earth) {
      return new TEME(
        new EpochUTC((simTime.getTime() / 1000) as Seconds), // convert ms to s
        new Vector3D(0 as Kilometers, 0 as Kilometers, 0 as Kilometers),
        new Vector3D(0 as KilometersPerSecond, 0 as KilometersPerSecond, 0 as KilometersPerSecond),
      );
    }

    return this.getJ2000(simTime, centerBody).toTEME();
  }

  drawFullOrbitPath(): void {
    if (this.fullOrbitPath) {
      return;
    }

    const simulationTimeObj = ServiceLocator.getTimeManager().simulationTimeObj;
    const now = simulationTimeObj.getTime() / 1000 as Seconds; // convert ms to s
    const lineManager = ServiceLocator.getLineManager();
    const timeslice = this.orbitalPeriod / this.orbitPathSegments_;
    const orbitPositions: [number, number, number][] = [];

    for (let i = 0; i < this.orbitPathSegments_; i++) {
      const t = now + i * timeslice;
      const newTime = new Date(t * 1000);

      this.svCache[i] ??= this.getTeme(newTime, settingsManager.centerBody).position; // convert s to ms
      let x = this.svCache[i].x;
      let y = this.svCache[i].y;
      let z = this.svCache[i].z;

      if (settingsManager.centerBody === SolarBody.Sun) {
        // Do nothing
      } else if (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Moon) {
        const centerBodyPlanet = ServiceLocator.getScene().getBodyById(settingsManager.centerBody);

        x = x + (centerBodyPlanet?.position[0] ?? 0) as Kilometers;
        y = y + (centerBodyPlanet?.position[1] ?? 0) as Kilometers;
        z = z + (centerBodyPlanet?.position[2] ?? 0) as Kilometers;
      }

      orbitPositions.push([x, y, z]);
    }

    this.fullOrbitPath = lineManager.createOrbitPath(orbitPositions, this.color, SolarBody.Sun);
  }

  /**
   * This is run once per frame to render a black earth in the GPU picking buffer.
   */
  private drawBlackGpuPickingEarth_() {
    const gl = this.gl_;
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    // Switch to GPU Picking Shader
    gl.useProgram(dotsManagerInstance.programs.picking.program);
    // Switch to the GPU Picking Frame Buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.gpuPicking);

    gl.bindVertexArray(this.vaoOcclusion_);

    // Set ALL picking uniforms — stale values from the previous frame's satellite picking
    // draw caused incorrect occlusion during view transitions and on mobile (no scissor).
    const uniforms = dotsManagerInstance.programs.picking.uniforms;
    const mainCam = ServiceLocator.getMainCamera();

    gl.uniformMatrix4fv(uniforms.u_pMvCamMatrix, false, ServiceLocator.getRenderer().projectionCameraMatrix);
    gl.uniform3fv(uniforms.worldOffset, Scene.getInstance().worldShift ?? [0, 0, 0]);

    const isFlatMap = mainCam.cameraType === CameraType.FLAT_MAP;
    const isPolarView = mainCam.cameraType === CameraType.POLAR_VIEW;

    gl.uniform1i(uniforms.u_flatMapMode, isFlatMap ? 1 : 0);
    gl.uniform1i(uniforms.u_polarViewMode, isPolarView ? 1 : 0);
    gl.uniform1f(uniforms.u_gmst, dotsManagerInstance.cruncherGmst);
    gl.uniform1f(uniforms.u_currentGmst, ServiceLocator.getTimeManager().gmst);
    gl.uniform1f(uniforms.u_earthRadius, RADIUS_OF_EARTH);

    if (isFlatMap) {
      gl.uniform1f(uniforms.u_flatMapCenterX, mainCam.flatMapPanX);
      gl.uniform1f(uniforms.u_flatMapZoom, mainCam.flatMapZoom);
      gl.uniform1f(uniforms.logDepthBufFC, 0.0);
    } else if (isPolarView) {
      gl.uniform3fv(uniforms.u_sensorEcef, dotsManagerInstance.sensorEcef);
      gl.uniformMatrix3fv(uniforms.u_ecefToEnu, false, dotsManagerInstance.ecefToEnu);
      gl.uniform1f(uniforms.u_polarRadius, RADIUS_OF_EARTH);
      gl.uniform1f(uniforms.u_polarZoom, mainCam.polarViewZoom);
      gl.uniform1f(uniforms.logDepthBufFC, 0.0);
    } else {
      gl.uniform1f(uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    }

    /*
     * no reason to render 100000s of pixels when
     * we're only going to read one
     */
    if (!settingsManager.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(
        mainCam.state.mouseX,
        gl.drawingBufferHeight - mainCam.state.mouseY,
        ServiceLocator.getDotsManager().PICKING_READ_PIXEL_BUFFER_SIZE,
        ServiceLocator.getDotsManager().PICKING_READ_PIXEL_BUFFER_SIZE,
      );
    }

    gl.drawElements(gl.TRIANGLES, this.surfaceMesh.geometry.indexLength, this.surfaceMesh.geometry.indexType, 0);

    if (!settingsManager.isMobileModeEnabled) {
      gl.disable(gl.SCISSOR_TEST);
    }

    gl.bindVertexArray(null);
  }

  /**
   * This is run once per frame to render the earth.
   */
  private drawEarthSurface_(tgtBuffer: WebGLFramebuffer | null) {
    const gl = this.gl_;

    this.surfaceMesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setSurfaceUniforms_(gl);
    this.setTextures_(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);

    gl.bindVertexArray(this.surfaceMesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.surfaceMesh.geometry.indexLength, this.surfaceMesh.geometry.indexType, 0);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
  }

  private drawEarthAtmosphere_(tgtBuffer: WebGLFramebuffer | null) {
    if (!this.atmosphereMesh) {
      return;
    }

    const gl = this.gl_;

    this.atmosphereMesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set only uniform
    this.setAtmosphereUniforms_(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // disable depth test unless zoomed out (avoid atmosphere showing through the moon when zoomed out)
    if (settingsManager.centerBody === SolarBody.Earth && ServiceLocator.getMainCamera().calcDistanceBasedOnZoom() < 2e5) {
      gl.disable(gl.DEPTH_TEST);
    } else {
      gl.enable(gl.DEPTH_TEST);
    }
    gl.depthMask(false); // Disable depth writing

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.0, -RADIUS_OF_EARTH * 50 * (1 - ServiceLocator.getMainCamera().zoomLevel()));

    gl.bindVertexArray(this.atmosphereMesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.atmosphereMesh.geometry.indexLength, this.atmosphereMesh.geometry.indexType, 0);
    gl.bindVertexArray(null);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true); // Re-enable depth writing
  }

  /**
   * This is run once per frame to set the uniforms for the earth.
   */
  private setSurfaceUniforms_(gl: WebGL2RenderingContext) {
    gl.uniformMatrix4fv(this.surfaceMesh.material.uniforms.projectionMatrix, false, ServiceLocator.getRenderer().projectionCameraMatrix);
    gl.uniformMatrix4fv(this.surfaceMesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix3fv(this.surfaceMesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniform3fv(this.surfaceMesh.material.uniforms.cameraPosition, ServiceLocator.getMainCamera().getForwardVector());
    gl.uniform1f(this.surfaceMesh.material.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);

    gl.uniform1f(this.surfaceMesh.material.uniforms.uIsAmbientLighting, settingsManager.isEarthAmbientLighting ? 1.0 : 0.0);
    gl.uniform1f(this.surfaceMesh.material.uniforms.uGlow, this.glowNumber_);
    const isEarthCenterBody = settingsManager.centerBody === SolarBody.Earth;

    gl.uniform1f(this.surfaceMesh.material.uniforms.uZoomLevel, isEarthCenterBody ? (ServiceLocator.getMainCamera().zoomLevel() / 2) ** (1 / 2) : 1.0);
    const camType = ServiceLocator.getMainCamera().cameraType;
    const isSatMode = camType === CameraType.FIXED_TO_SAT_LVLH || camType === CameraType.FIXED_TO_SAT_ECI;

    gl.uniform1f(this.surfaceMesh.material.uniforms.uRawZoomLevel, !isEarthCenterBody || isSatMode ? 1.0 : ServiceLocator.getMainCamera().zoomLevel());
    gl.uniform1f(this.surfaceMesh.material.uniforms.uisGrayScale, settingsManager.isEarthGrayScale ? 1.0 : 0.0);
    gl.uniform1f(this.surfaceMesh.material.uniforms.uCloudPosition, this.cloudPosition_);
    gl.uniform3fv(this.surfaceMesh.material.uniforms.uLightDirection, this.lightDirection);
    gl.uniform1f(this.surfaceMesh.material.uniforms.uisDrawNightAsDay, settingsManager.isDrawNightAsDay ? 1.0 : 0.0);
    gl.uniform1f(this.surfaceMesh.material.uniforms.uIsDrawAurora, settingsManager.isDrawAurora ? 1.0 : 0.0);
    gl.uniform1f(this.surfaceMesh.material.uniforms.uShowGraticule, settingsManager.isDrawGraticule ? 1.0 : 0.0);
    gl.uniform1f(this.surfaceMesh.material.uniforms.uCoverageEnabled, this.isDrawCoverageOverlay ? 1.0 : 0.0);
    gl.uniform1f(this.surfaceMesh.material.uniforms.uCoverageOpacity, this.coverageOverlayOpacity);
  }

  private setAtmosphereUniforms_(gl: WebGL2RenderingContext) {
    if (!this.atmosphereMesh) {
      return;
    }

    gl.uniformMatrix4fv(this.atmosphereMesh.material.uniforms.projectionMatrix, false, ServiceLocator.getRenderer().projectionCameraMatrix);
    gl.uniformMatrix4fv(this.atmosphereMesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix3fv(this.atmosphereMesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniform3fv(this.atmosphereMesh.material.uniforms.cameraPosition, ServiceLocator.getMainCamera().getForwardVector());
    gl.uniform1f(this.atmosphereMesh.material.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);

    gl.uniform3fv(this.atmosphereMesh.material.uniforms.uLightDirection, this.lightDirection);
  }

  private initPlaceholderTexture_(): void {
    if (this.placeholders_.day) {
      return;
    }
    const gl = this.gl_;
    const makePixel = (rgba: [number, number, number, number]): WebGLTexture => {
      const tex = gl.createTexture()!;

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
      gl.bindTexture(gl.TEXTURE_2D, null);

      return tex;
    };
    const transparent: [number, number, number, number] = [0, 0, 0, 0];

    // Day failure: mid-gray so a failed earth texture is visibly degraded.
    this.placeholders_.day = makePixel([96, 96, 96, 255]);
    this.placeholders_.dayBlack = makePixel(transparent);
    this.placeholders_.night = makePixel(transparent);
    this.placeholders_.bump = makePixel(transparent);
    this.placeholders_.spec = makePixel(transparent);
    this.placeholders_.political = makePixel(transparent);
    this.placeholders_.clouds = makePixel(transparent);
    // Coverage: transparent (red channel 0 = zero dwell = nothing drawn)
    this.placeholders_.coverage = makePixel(transparent);
  }

  private loadChannel_(label: string, store: Record<string, WebGLTexture>, key: string, url: string, onSuccess?: () => void, onFail?: () => void): void {
    store[key] = this.gl_.createTexture();
    GlUtils.initTexture(this.gl_, url).then((texture) => {
      store[key] = texture;
      onSuccess?.();
    }).catch((err: unknown) => {
      delete store[key];
      onFail?.();
      errorManagerInstance.warn(`Failed to load earth ${label} texture: ${url}`, err);
    });
  }

  private initTextures_(): void {
    const sm = settingsManager;

    sm.earthTextureStyle ??= EarthTextureStyle.BLUE_MARBLE;

    const dayKey = sm.earthTextureStyle + sm.earthDayTextureQuality;

    if (!this.textureDay[dayKey]) {
      SplashScreen.loadStr(SplashScreen.msg.painting);
      this.loadChannel_('day', this.textureDay, dayKey, `${this.getSrc_(sm.earthTextureStyle, sm.earthDayTextureQuality)}`,
        () => this.failedDayKeys_.delete(dayKey),
        () => this.failedDayKeys_.add(dayKey));
    }

    const nightKey = sm.earthTextureStyle + sm.earthNightTextureQuality;

    if (!this.textureNight[nightKey]) {
      this.loadChannel_('night', this.textureNight, nightKey, `${this.getSrc_(`${sm.earthTextureStyle}-night`, sm.earthNightTextureQuality)}`);
    }
    if (!this.textureBump[sm.earthBumpTextureQuality] && sm.earthBumpTextureQuality && sm.earthBumpTextureQuality !== EarthBumpTextureQuality.OFF) {
      this.loadChannel_('bump', this.textureBump, sm.earthBumpTextureQuality, `${this.getSrc_(this.BUMP_SRC_BASE, sm.earthBumpTextureQuality)}`);
    }
    if (!this.textureSpec[sm.earthSpecTextureQuality] && sm.earthSpecTextureQuality && sm.earthSpecTextureQuality !== EarthSpecTextureQuality.OFF) {
      this.loadChannel_('spec', this.textureSpec, sm.earthSpecTextureQuality, `${this.getSrc_(this.SPEC_SRC_BASE, sm.earthSpecTextureQuality)}`);
    }
    if (!this.texturePolitical[sm.earthPoliticalTextureQuality] && sm.earthPoliticalTextureQuality && sm.earthPoliticalTextureQuality !== EarthPoliticalTextureQuality.OFF) {
      this.loadChannel_('political', this.texturePolitical, sm.earthPoliticalTextureQuality, `${this.getSrc_(this.POLITICAL_SRC_BASE, sm.earthPoliticalTextureQuality, 'png')}`);
    }
    if (!this.textureClouds[sm.earthCloudTextureQuality] && sm.earthCloudTextureQuality && sm.earthCloudTextureQuality !== EarthCloudTextureQuality.OFF) {
      this.loadChannel_('clouds', this.textureClouds, sm.earthCloudTextureQuality, `${this.getSrc_(this.CLOUDS_SRC_BASE, sm.earthCloudTextureQuality)}`);
    }
  }

  /**
   * This is run once per session to initialize the earth occulsion vao.
   */
  private initVaoOcclusion_() {
    const gl = this.gl_;
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    this.vaoOcclusion_ = gl.createVertexArray();
    gl.bindVertexArray(this.vaoOcclusion_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceMesh.geometry.getCombinedBuffer());

    /*
     * gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.pickingBuffers.color);
     * Disable color vertex so that the earth is drawn black
     * TODO: Figure out why this is in the earth class
     */
    gl.disableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_color.location); // IMPORTANT!

    // Only Enable Position Attribute
    gl.enableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_position.location);
    this.surfaceMesh.geometry.attributes.position.bindToArrayBuffer(gl);
    gl.vertexAttribPointer(dotsManagerInstance.programs.picking.attribs.a_position.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.surfaceMesh.geometry.getIndex());

    gl.bindVertexArray(null);
  }

  /**
   * This is run once per session to initialize the earth vao.
   */
  private initVaoSurface_() {
    const gl = this.gl_;

    this.surfaceMesh.geometry.vao = gl.createVertexArray();
    gl.bindVertexArray(this.surfaceMesh.geometry.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceMesh.geometry.getCombinedBuffer());
    gl.enableVertexAttribArray(this.surfaceMesh.geometry.attributes.position.location);
    this.surfaceMesh.geometry.attributes.position.bindToArrayBuffer(gl);

    gl.enableVertexAttribArray(this.surfaceMesh.geometry.attributes.normal.location);
    this.surfaceMesh.geometry.attributes.normal.bindToArrayBuffer(gl);

    gl.enableVertexAttribArray(this.surfaceMesh.geometry.attributes.uv.location);
    this.surfaceMesh.geometry.attributes.uv.bindToArrayBuffer(gl);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.surfaceMesh.geometry.getIndex());

    gl.bindVertexArray(null);
  }

  /**
   * Do not run this unless atmosphereMesh is defined
   */
  private initVaoAtmosphere_() {
    const gl = this.gl_;

    this.atmosphereMesh!.geometry.vao = gl.createVertexArray();
    gl.bindVertexArray(this.atmosphereMesh!.geometry.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.atmosphereMesh!.geometry.getCombinedBuffer());
    gl.enableVertexAttribArray(this.atmosphereMesh!.geometry.attributes.position.location);
    this.atmosphereMesh!.geometry.attributes.position.bindToArrayBuffer(gl);

    gl.enableVertexAttribArray(this.atmosphereMesh!.geometry.attributes.normal.location);
    this.atmosphereMesh!.geometry.attributes.normal.bindToArrayBuffer(gl);

    gl.enableVertexAttribArray(this.atmosphereMesh!.geometry.attributes.uv.location);
    this.atmosphereMesh!.geometry.attributes.uv.bindToArrayBuffer(gl);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.atmosphereMesh!.geometry.getIndex());

    gl.bindVertexArray(null);
  }

  /**
   * This is run once per frame to set the textures for the earth.
   */
  private setTextures_(gl: WebGL2RenderingContext) {
    const sm = settingsManager;
    const dayKey = sm.earthTextureStyle + sm.earthDayTextureQuality;
    const nightKey = sm.earthTextureStyle + sm.earthNightTextureQuality;

    // Day Map: real texture > black (isBlackEarth) > gray failure placeholder
    gl.uniform1i(this.surfaceMesh.material.uniforms.uDayMap, 0);
    gl.activeTexture(gl.TEXTURE0);
    if (this.textureDay[dayKey] && !sm.isBlackEarth) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureDay[dayKey]);
    } else if (sm.isBlackEarth) {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.dayBlack);
    } else if (this.failedDayKeys_.has(dayKey)) {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.day);
    } else {
      // Not yet loaded (or unknown state): use the visible-degraded placeholder
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.day);
    }

    // Night Map
    gl.uniform1i(this.surfaceMesh.material.uniforms.uNightMap, 1);
    gl.activeTexture(gl.TEXTURE1);

    if ((!this.textureNight[nightKey] && !this.textureDay[nightKey]) || sm.isBlackEarth) {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.night);
    } else if (!sm.isDrawNightAsDay && this.textureNight[nightKey]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureNight[nightKey]);
    } else if (this.textureDay[nightKey] && !sm.isBlackEarth) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureDay[nightKey]);
    }

    // Bump Map
    gl.uniform1i(this.surfaceMesh.material.uniforms.uBumpMap, 2);
    gl.activeTexture(gl.TEXTURE2);
    if (sm.isDrawBumpMap && this.textureBump[sm.earthBumpTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureBump[sm.earthBumpTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.bump);
    }

    // Specular Map
    gl.uniform1i(this.surfaceMesh.material.uniforms.uSpecMap, 3);
    gl.activeTexture(gl.TEXTURE3);
    if (sm.isDrawSpecMap && this.textureSpec[sm.earthSpecTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureSpec[sm.earthSpecTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.spec);
    }

    // Political Map
    gl.uniform1i(this.surfaceMesh.material.uniforms.uPoliticalMap, 4);
    gl.activeTexture(gl.TEXTURE4);
    if (sm.isDrawPoliticalMap && this.texturePolitical[sm.earthPoliticalTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.texturePolitical[sm.earthPoliticalTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.political);
    }

    // Clouds Map
    gl.uniform1i(this.surfaceMesh.material.uniforms.uCloudsMap, 5);
    gl.activeTexture(gl.TEXTURE5);
    if (sm.isDrawCloudsMap && this.textureClouds[sm.earthCloudTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureClouds[sm.earthCloudTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.clouds);
    }

    // Coverage overlay (generic engine hook; fed by a plugin). Bind the real
    // texture only when enabled, otherwise the transparent placeholder.
    gl.uniform1i(this.surfaceMesh.material.uniforms.uCoverageMap, 6);
    gl.activeTexture(gl.TEXTURE6);
    if (this.isDrawCoverageOverlay && this.coverageTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.coverageTexture);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.placeholders_.coverage);
    }
  }

  /**
   * The shaders for the earth.
   *
   * NOTE: Keep these at the bottom of the file to ensure proper syntax highlighting.
   */
  shaders = {
    surfaceFrag: glsl`
    uniform float uIsAmbientLighting;
    uniform float uGlow;
    uniform float uCloudPosition;
    uniform vec3 uLightDirection;
    uniform float uIsDrawAurora;
    uniform float uShowGraticule;
    uniform float uZoomLevel;
    uniform float uRawZoomLevel;
    uniform float uisGrayScale;
    uniform float uisDrawNightAsDay;

    in vec2 vUv;
    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vVertToCamera;

    out vec4 fragColor;

    uniform sampler2D uDayMap;
    uniform sampler2D uNightMap;
    uniform sampler2D uBumpMap;
    uniform sampler2D uSpecMap;
    uniform sampler2D uPoliticalMap;
    uniform sampler2D uCloudsMap;
    uniform sampler2D uCoverageMap;
    uniform float uCoverageEnabled;
    uniform float uCoverageOpacity;

    const float latitudeCenter = 67.5; // The latitude at which the Aurora Borealis appears
    const float latitudeMargin = 7.0; // The margin around the center latitude where the Aurora Borealis is visible
    const vec3 directionalLightColor = vec3(1.0, 1.0, 1.0);
    const vec3 ambientLightColor = vec3(0.1, 0.1, 0.1);

    // Maps a normalized 0..1 coverage/dwell value to a blue -> cyan -> yellow -> red ramp.
    vec3 coverageRamp(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 blue = vec3(0.0, 0.2, 1.0);
      vec3 cyan = vec3(0.0, 0.9, 0.9);
      vec3 yellow = vec3(1.0, 0.9, 0.0);
      vec3 red = vec3(1.0, 0.15, 0.0);
      if (t < 0.33) {
        return mix(blue, cyan, t / 0.33);
      } else if (t < 0.66) {
        return mix(cyan, yellow, (t - 0.33) / 0.33);
      }
      return mix(yellow, red, (t - 0.66) / 0.34);
    }

    // Function to calculate the intensity of the Aurora Borealis at a given latitude
    float calculateAuroraIntensity(float latitude, float noise) {
      // Aurora should be visible mainly between latitudeCenter - latitudeMargin and latitudeCenter + latitudeMargin
      float intensity = (step(latitudeCenter - (latitudeMargin + noise), latitude) - step(latitudeCenter + (latitudeMargin + noise), latitude)) * 0.5;
      // Smooth intensity from lattitudeCenter outward
      intensity = smoothstep(0.0, 1.0, 1.0 - abs(latitude - latitudeCenter) / (latitudeMargin + noise)) * intensity;
      return intensity;
    }

    void main(void) {
      float fragToLightAngle = dot( vNormal, uLightDirection ) * 0.5 + 0.5; //Remake -1 > 1 to 0 > 1
      vec3 fragToCamera = normalize(vVertToCamera);
      float NdotV = dot(fragToCamera, vNormal);

      // Discard clearly backfacing fragments
      float edgeWidth = fwidth(NdotV);
      if (NdotV < -edgeWidth) {
        discard;
      }

      // Smooth horizon fade — alpha blends the limb with the sky/atmosphere
      // The wide range (0.06) creates a soft multi-pixel transition at the limb
      float horizonAlpha = smoothstep(0.0, max(edgeWidth * 4.0, 0.06), NdotV);

      // .................................................
      // Diffuse lighting
      float diffuse = 0.0;
      if (uIsAmbientLighting > 0.5) {
        diffuse = max(dot(vNormal, uLightDirection), 0.0);
      }

      //.................................................
      // Bump mapping
      vec3 bumpTexColor = textureLod(uBumpMap, vUv, -1.0).rgb * diffuse * 0.4;

      //................................................
      // Specular lighting
      vec3 specLightColor = textureLod(uSpecMap, vUv, -1.0).rgb * diffuse * 0.05;

      //................................................
      // Final color
      vec3 dayColor = (ambientLightColor + directionalLightColor) * diffuse;
      vec3 dayTexColor = textureLod(uDayMap, vUv, -1.0).rgb * dayColor;
      vec3 nightColor = vec3(0.0);

      if (uisDrawNightAsDay < 0.5) {
        nightColor = smoothstep(0.0, 2.0, (1.0 - uZoomLevel)) * textureLod(uNightMap, vUv, -1.0).rgb * pow(1.0 - diffuse, 2.0);
      } else {
        // If day night toggle is on, the nightColor should be bright like the day texture
        nightColor = textureLod(uDayMap, vUv, -1.0).rgb * pow(1.0 - diffuse, 2.0);
      }

      vec3 surfaceColor = dayTexColor + nightColor + bumpTexColor + specLightColor;

      // ................................................
      // Clouds — alpha-blend over surface (clouds occlude what's beneath)
      // Cloud texture luminance is used as opacity: white = dense cloud, black = clear sky
      vec2 cloudUv = vUv;
      cloudUv.x -= uCloudPosition;
      float cloudDensity = textureLod(uCloudsMap, cloudUv, -1.0).r;

      // Clouds fade out when camera is near the surface (raw zoom 0 = close, 1 = far)
      float cloudOpacity = cloudDensity * smoothstep(0.2, 0.35, uRawZoomLevel);

      // Clouds are white when sunlit, dark on the night side
      float cloudLight = (uisDrawNightAsDay > 0.5) ? 1.0 : max(diffuse, 0.02);
      vec3 litCloudColor = vec3(cloudLight);

      // Alpha blend: clouds replace surface proportionally to opacity
      // This naturally masks specular under clouds without double-counting
      fragColor = vec4(mix(surfaceColor, litCloudColor, cloudOpacity), horizonAlpha);

      // Political map — drawn after clouds so boundaries are always visible
      // Use full resolution (LOD -1) and don't multiply by diffuse so
      // boundaries remain visible on the night side and when ambient
      // lighting is off.
      vec4 politicalColor = textureLod(uPoliticalMap, vUv, -1.0);
      fragColor.rgb += politicalColor.rgb * politicalColor.a;

      // ...............................................
      // Coverage overlay (generic engine hook fed by a plugin). The red channel
      // holds a normalized 0..1 dwell value; map it to a ramp and blend on top.
      // Inert (zero cost visually) when uCoverageEnabled is off or dwell is 0.
      if (uCoverageEnabled > 0.5) {
        float dwell = texture(uCoverageMap, vUv).r;
        if (dwell > 0.0039) { // ~1/255: ignore empty cells
          vec3 covColor = coverageRamp(dwell);
          float covAlpha = uCoverageOpacity * (0.45 + 0.55 * clamp(dwell, 0.0, 1.0));
          fragColor.rgb = mix(fragColor.rgb, covColor, covAlpha);
        }
      }

      // ...............................................

      // Gray scale the color
      if (uisGrayScale > 0.5) {
        float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
        fragColor.rgb = vec3(gray);
        fragColor.rgb *= 0.4;
      }

      // ...............................................
      // Aurora
      if (uIsDrawAurora > 0.5 && uisGrayScale < 0.5) {
        float latitude = vUv.y * 180.0 - 90.0; // Convert texture coordinate to latitude (-90 to 90)
        float noise = uGlow;

        // Calculate the intensity of the Aurora Borealis at the current latitude
        float auroraIntensity = calculateAuroraIntensity(abs(latitude), noise / 2.0);

        // Calculate the strength of the Aurora Borealis based on the Sun direction. It should only be visible on the dark side of the Earth
        float auroraStrength = max(dot(vNormal, -uLightDirection), 0.0) * (0.75 + (noise / 10.0));

        // Combine the Earth color and the Aurora Borealis color based on the intensity and strength
        vec3 auroraColor = vec3(0.0, 0.8, 0.55 + noise / 20.0); // Color of the Aurora Borealis

        fragColor.rgb += auroraColor * auroraIntensity * auroraStrength;
      }

      // ...............................................
      // Graticule (lat/lon grid lines)
      if (uShowGraticule > 0.5) {
        float gLatDeg = (0.5 - vUv.y) * 180.0;
        float gLonDeg = (vUv.x - 0.5) * 360.0;
        float wLat = fwidth(vUv.y) * 180.0;
        float wLon = min(fwidth(vUv.x) * 360.0, 20.0);

        float gSpacing = 15.0;
        float dLat = abs(mod(gLatDeg + gSpacing * 0.5, gSpacing) - gSpacing * 0.5);
        float dLon = abs(mod(gLonDeg + gSpacing * 0.5, gSpacing) - gSpacing * 0.5);

        float lineLat = 1.0 - smoothstep(0.0, wLat * 1.5, dLat);
        float lineLon = 1.0 - smoothstep(0.0, wLon * 1.5, dLon);
        float gLine = max(lineLat, lineLon);

        // Emphasize equator and prime meridian
        gLine = max(gLine, 1.0 - smoothstep(0.0, wLat * 2.5, abs(gLatDeg)));
        gLine = max(gLine, 1.0 - smoothstep(0.0, wLon * 2.5, abs(gLonDeg)));

        fragColor.rgb = mix(fragColor.rgb, vec3(1.0), gLine * 0.15);
      }

      ${DepthManager.getLogDepthFragCode()}
    }
    `,
    surfaceVert: glsl`
    out vec2 vUv;
    out vec3 vNormal;
    out vec3 vWorldPos;
    out vec3 vVertToCamera;

    void main(void) {
        vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vNormal = normalMatrix * normal;
        vUv = uv;
        vVertToCamera = normalize(vec3(cameraPosition) - worldPosition.xyz);

        gl_Position = projectionMatrix * worldPosition;

        ${DepthManager.getLogDepthVertCode()}
    }
    `,
    atmosphereVert: '', // Placeholder Only
    atmosphereFrag: '', // Placeholder Only
  };
}

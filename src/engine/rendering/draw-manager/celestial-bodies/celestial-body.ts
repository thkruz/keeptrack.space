/**
 * Base class for rendering non-Earth celestial bodies (Moon, Mars, etc.)
 */

import { SatMath } from '@app/app/analysis/sat-math';
import { Planet } from '@app/app/objects/planet';
import { EciArr3, rgbaArray, SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { BufferGeometry } from '@app/engine/rendering/buffer-geometry';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { glsl } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { DEG2RAD, EpochUTC, J2000, Kilometers, KilometersPerSecond, Seconds, SpaceObjectType, TEME, TemeVec3, Vector3D } from '@ootk/src/main';
import { Body, BackdatePosition as backdatePosition, KM_PER_AU, RotationAxis as rotationAxis } from 'astronomy-engine';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { DOT_HIDE_BODY_RADII } from '../../body-glyph';
import { DepthManager } from '../../depth-manager';
import { GlUtils } from '../../gl-utils';
import { OrbitPathLine } from '../../line-manager/orbit-path';
import { OcclusionProgram } from '../post-processing';

export const PlanetColors = {
  MERCURY: [0.59, 0.4, 0.6, 0.95] as rgbaArray,
  VENUS: [0.69, 0.47, 0.1, 0.95] as rgbaArray,
  EARTH: [0, 0.6, 0.8, 0.95] as rgbaArray,
  MOON: [1.0, 1.0, 1.0, 0.7] as rgbaArray,
  MARS: [0.6, 0.3, 0.1, 0.95] as rgbaArray,
  JUPITER: [0.95, 0.71, 0.64, 0.7] as rgbaArray,
  SATURN: [0.72, 0.65, 0.52, 0.7] as rgbaArray,
  URANUS: [0.67, 0.92, 1, 0.7] as rgbaArray,
  NEPTUNE: [0.48, 0.69, 1, 0.7] as rgbaArray,
  PLUTO: [0.8, 0.7, 0.5, 0.7] as rgbaArray,
  MAKEMAKE: [1.0, 0.8, 0.6, 1.0] as rgbaArray,
  CERES: [0.45, 0.42, 0.38, 0.7] as rgbaArray,
  HAUMEA: [0.85, 0.82, 0.78, 0.7] as rgbaArray,
  ERIS: [0.9, 0.9, 0.92, 0.7] as rgbaArray,
  SEDNA: [0.75, 0.25, 0.15, 0.7] as rgbaArray,
  QUAOAR: [0.6, 0.35, 0.25, 0.7] as rgbaArray,
  ORCUS: [0.55, 0.55, 0.58, 0.7] as rgbaArray,
  GONGGONG: [0.7, 0.3, 0.2, 0.7] as rgbaArray,
  CHARON: [0.6, 0.6, 0.65, 0.7] as rgbaArray,
  // Main-belt asteroids, tinted by spectral class: bright V-type Vesta, bluish B-type Pallas,
  // warm S-type Juno, and Hygiea as dark as its 7% albedo allows while staying visible.
  VESTA: [0.78, 0.74, 0.64, 0.85] as rgbaArray,
  PALLAS: [0.46, 0.48, 0.52, 0.8] as rgbaArray,
  JUNO: [0.62, 0.52, 0.42, 0.8] as rgbaArray,
  HYGIEA: [0.4, 0.39, 0.38, 0.8] as rgbaArray,
  /*
   * Moons, tinted toward how each body actually looks so a dot or an orbit ring reads as
   * that moon rather than as a generic grey marker: Io's sulfur yellow against Europa's
   * pale ice, Titan's orange haze against Enceladus's near-white.
   */
  IO: [0.95, 0.85, 0.45, 0.8] as rgbaArray,
  EUROPA: [0.9, 0.85, 0.78, 0.8] as rgbaArray,
  GANYMEDE: [0.72, 0.68, 0.62, 0.8] as rgbaArray,
  CALLISTO: [0.55, 0.5, 0.45, 0.8] as rgbaArray,
  MIMAS: [0.82, 0.82, 0.84, 0.8] as rgbaArray,
  ENCELADUS: [0.97, 0.98, 1.0, 0.8] as rgbaArray,
  TETHYS: [0.88, 0.89, 0.9, 0.8] as rgbaArray,
  DIONE: [0.85, 0.85, 0.86, 0.8] as rgbaArray,
  RHEA: [0.8, 0.8, 0.82, 0.8] as rgbaArray,
  TITAN: [0.92, 0.66, 0.32, 0.8] as rgbaArray,
  IAPETUS: [0.72, 0.63, 0.5, 0.8] as rgbaArray,
  MIRANDA: [0.75, 0.75, 0.78, 0.8] as rgbaArray,
  ARIEL: [0.8, 0.8, 0.82, 0.8] as rgbaArray,
  UMBRIEL: [0.55, 0.55, 0.58, 0.8] as rgbaArray,
  TITANIA: [0.76, 0.72, 0.68, 0.8] as rgbaArray,
  OBERON: [0.7, 0.64, 0.6, 0.8] as rgbaArray,
  TRITON: [0.9, 0.85, 0.85, 0.8] as rgbaArray,
  // Deep-space satellites
  VOYAGER1: [0.7, 0.85, 1.0, 0.9] as rgbaArray,
  VOYAGER2: [0.85, 0.75, 1.0, 0.9] as rgbaArray,
  PIONEER10: [1.0, 0.85, 0.6, 0.9] as rgbaArray,
  PIONEER11: [1.0, 0.7, 0.55, 0.9] as rgbaArray,
  NEWHORIZONS: [0.7, 1.0, 0.85, 0.9] as rgbaArray,
} as const;

export abstract class CelestialBody {
  readonly RADIUS: number;
  protected readonly NUM_HEIGHT_SEGS: number;
  protected readonly NUM_WIDTH_SEGS: number;

  /**
   * Radius the camera's surface-zoom floor must clear, km. `RADIUS` is a MEAN radius, so any
   * body with a procedural irregular shape has to report its longest axis instead: at
   * 1.2 x mean, the camera can end up INSIDE the mesh, and since the fragment shader discards
   * every face pointing away from it, the body then renders as a completely empty black frame
   * with no error anywhere. See planets-core.getBodyViewConfig.
   */
  get zoomFloorRadiusKm(): number {
    return this.RADIUS;
  }

  protected gl_: WebGL2RenderingContext;
  protected isLoaded_ = false;
  protected modelViewMatrix_ = null as unknown as mat4;
  protected readonly normalMatrix_ = mat3.create();

  color = PlanetColors.EARTH;
  /** RGB tint applied to the texture in the fragment shader. Default [1,1,1] = no tint. */
  tintColor: [number, number, number] = [1, 1, 1];
  /** Position in EME2000 */
  position = [0, 0, 0] as EciArr3;
  rotation = [0, 0, 0];
  mesh: Mesh;
  type: SpaceObjectType = SpaceObjectType.TERRESTRIAL_PLANET;
  planetObject: Planet | null = null;
  relativeSatPos: TemeVec3 = { x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

  orbitPathSegments_ = 8192;
  orbitalPeriod: Seconds;
  /** Only meaningful for a body that orbits the Sun. Moons leave this undefined and set the two below. */
  meanDistanceToSun: Kilometers;
  /** The body this one orbits, when that is not the Sun. `PlanetMoon` requires both of these. */
  parentBody?: SolarBody;
  /** Mean orbital radius about `parentBody`, in kilometres. */
  semiMajorAxisKm?: number;
  fullOrbitPath: OrbitPathLine | null = null;
  fullOrbitPathEarthCentered: OrbitPathLine | null = null;
  isDrawOrbitPath: boolean = false;
  svCache: { x: Kilometers; y: Kilometers; z: Kilometers }[] = [];
  lastOrbitCalcTime_: number = 0;

  abstract getName(): SolarBody;
  abstract getTexturePath(): string;

  typeToString(): string {
    switch (this.type) {
      case SpaceObjectType.TERRESTRIAL_PLANET:
        return 'Terrestrial Planet';
      case SpaceObjectType.GAS_GIANT:
        return 'Gas Planet';
      case SpaceObjectType.ICE_GIANT:
        return 'Ice Giant';
      case SpaceObjectType.DWARF_PLANET:
        return 'Dwarf Planet';
      case SpaceObjectType.MOON:
        return 'Moon';
      default:
        return 'Planet';
    }
  }

  /**
   * Build this body's geometry. Overridden by bodies that are not spheres (the Martian
   * moons swap in a procedural irregular shape); everything else gets a UV sphere.
   */
  protected createGeometry_(gl: WebGL2RenderingContext): BufferGeometry {
    return new SphereGeometry(gl, {
      radius: this.RADIUS,
      widthSegments: this.NUM_HEIGHT_SEGS,
      heightSegments: this.NUM_WIDTH_SEGS,
    });
  }

  async init(gl: WebGL2RenderingContext): Promise<void> {
    try {
      this.gl_ = gl;
      const geometry = this.createGeometry_(gl);
      const texture = await GlUtils.initTexture(gl, this.getTexturePath());
      const material = new ShaderMaterial(gl, {
        uniforms: {
          sampler: null as unknown as WebGLUniformLocation,
          sunPos: null as unknown as WebGLUniformLocation,
          tintColor: null as unknown as WebGLUniformLocation,
        },
        map: texture,
        vertexShader: this.shaders.vert,
        fragmentShader: this.shaders.frag,
        glslVersion: GLSL3,
      });

      this.mesh = new Mesh(gl, geometry, material, {
        name: this.getName(),
        precision: 'highp',
        disabledUniforms: {
          modelMatrix: true,
          viewMatrix: true,
        },
      });
      this.mesh.geometry.initVao(this.mesh.program);

      EventBus.getInstance().on(EventBusEvent.onLinesCleared, () => {
        this.hideFullOrbitPath();
        if (this.fullOrbitPathEarthCentered) {
          this.fullOrbitPathEarthCentered.isGarbage = true;
        }
      });

      this.isLoaded_ = true;
    } catch (e) {
      errorManagerInstance.warn(t7e('errorMsgs.Rendering.bodyInitError').replace('{name}', this.getName()), e);
    }
  }

  loadTexture(): void {
    const gl = this.gl_;

    GlUtils.initTexture(gl, this.getTexturePath())
      .then((texture) => {
        this.mesh.material.map = texture;
      })
      .catch((e) => {
        errorManagerInstance.warn(t7e('errorMsgs.Rendering.bodyTextureError').replace('{name}', this.getName()), e);
      });
  }

  abstract useHighestQualityTexture(): void;

  lastJ2000: J2000 | null = null;
  lastCenterBody: SolarBody | null = null;
  minimumUpdateIntervalSeconds = 600; // 10 minutes

  /** Sim time (ms) of the last actual position recompute; NaN until the first update. */
  private lastPositionUpdateSimMs_ = Number.NaN;
  /**
   * Skip re-interpolating this body's position until the simulation clock advances at least
   * this far. Planets, dwarf planets and deep-space satellites move imperceptibly between
   * frames, so recomputing an identical position every frame is pure waste - most visibly
   * when time is paused (sim time never changes, yet every body re-interpolated per frame).
   * The gate self-disengages at high propagation rates (sim delta exceeds it every frame).
   */
  protected minimumPositionUpdateIntervalMs_ = 1000;

  /**
   * Returns true when the cached `position` is still fresh enough to reuse for `simTime`
   * (skip the recompute). On a miss it records `simTime` as the new reference and returns
   * false so the caller proceeds to recompute.
   */
  /**
   * Override the position-recompute gate, in milliseconds of sim time.
   *
   * Zero means recompute every frame. Worth paying when something small is drawn against
   * this body up close: the gate freezes the position between ticks, so the body lurches
   * by a full tick's motion (~90 km for Mars) each time it expires, and anything stored in
   * absolute float32 - the dot buffer - re-rounds and visibly pops with it.
   */
  setPositionUpdateIntervalMs(intervalMs: number): void {
    this.minimumPositionUpdateIntervalMs_ = intervalMs;
  }

  protected canReusePosition_(simTime: Date): boolean {
    const nowMs = simTime.getTime();

    if (!Number.isNaN(this.lastPositionUpdateSimMs_) && Math.abs(nowMs - this.lastPositionUpdateSimMs_) < this.minimumPositionUpdateIntervalMs_) {
      return true;
    }

    this.lastPositionUpdateSimMs_ = nowMs;

    return false;
  }

  getJ2000(simTime: Date, centerBody = SolarBody.Earth): J2000 {
    if (this.lastJ2000 && Math.abs(simTime.getTime() - this.lastJ2000.epoch.posix * 1000) < this.minimumUpdateIntervalSeconds * 1000 && this.lastCenterBody === centerBody) {
      return this.lastJ2000;
    }

    const pos = backdatePosition(simTime, centerBody as unknown as Body, this.getName() as unknown as Body, false);
    const j2000Data = new J2000(
      new EpochUTC((simTime.getTime() / 1000) as Seconds), // convert ms to s
      new Vector3D((pos.x * KM_PER_AU) as Kilometers, (pos.y * KM_PER_AU) as Kilometers, (pos.z * KM_PER_AU) as Kilometers),
      new Vector3D(0 as KilometersPerSecond, 0 as KilometersPerSecond, 0 as KilometersPerSecond)
    );

    this.lastJ2000 = j2000Data;
    this.lastCenterBody = centerBody;

    return j2000Data;
  }

  getTeme(simTime: Date, centerBody = SolarBody.Earth): TEME {
    return this.getJ2000(simTime, centerBody).toTEME();
  }

  /**
   * Update the position of the celestial body relative to earth based on the simulation time.
   */
  updatePosition(simTime: Date): void {
    if (this.canReusePosition_(simTime)) {
      return;
    }

    const posTeme = this.getTeme(simTime, SolarBody.Sun).position;
    const sunEntity = ServiceLocator.getScene().sun;

    sunEntity.updateEci();
    const sunPos = sunEntity.eci;

    posTeme.x = (posTeme.x + sunPos.x) as Kilometers;
    posTeme.y = (posTeme.y + sunPos.y) as Kilometers;
    posTeme.z = (posTeme.z + sunPos.z) as Kilometers;

    this.position = [posTeme.x, posTeme.y, posTeme.z];

    if (settingsManager.centerBody === this.getName()) {
      const ros = rotationAxis(this.getName() as unknown as Body, simTime);

      this.rotation = [0, (ros.dec - 90) * DEG2RAD, ros.spin * DEG2RAD];
    }
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_) {
      return;
    }
    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    this.setUniforms_(gl, sunPosition);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);
    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLFramebuffer): void {
    if (!this.isLoaded_) {
      return;
    }
    if (settingsManager.isDisableGodrays) {
      return;
    }

    const gl = this.gl_;
    // Change to the earth shader

    gl.useProgram(occlusionPrgm.program);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.depthMask(true);

    occlusionPrgm.attrSetup(this.mesh.geometry.getCombinedBuffer());

    // Set the uniforms
    occlusionPrgm.uniformSetup(this.modelViewMatrix_, pMatrix, camMatrix, [-this.relativeSatPos.x, -this.relativeSatPos.y, -this.relativeSatPos.z]);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
  }

  protected setUniforms_(gl: WebGL2RenderingContext, sunPosition: vec3) {
    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, ServiceLocator.getRenderer().projectionCameraMatrix);
    gl.uniform3fv(this.mesh.material.uniforms.sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform3fv(this.mesh.material.uniforms.worldOffset, [-this.relativeSatPos.x, -this.relativeSatPos.y, -this.relativeSatPos.z]);
    gl.uniform1f(this.mesh.material.uniforms.drawPosition, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.sampler, 0);
    gl.uniform3fv(this.mesh.material.uniforms.cameraPosition, ServiceLocator.getMainCamera().getForwardVector());
    gl.uniform1f(this.mesh.material.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    gl.uniform3fv(this.mesh.material.uniforms.tintColor, this.tintColor);
  }

  update(simTime: Date) {
    if (!this.isLoaded_) {
      return;
    }
    this.updatePosition(simTime);
    this.updateOrbitPathForProximity_();
    this.modelViewMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);
    if (settingsManager.centerBody !== this.getName()) {
      const worldShift = Scene.getInstance().worldShift;

      /*
       * Sum in JS doubles, then translate once. Translating by the absolute position and
       * then by the (nearly opposite) world shift is the same arithmetic, but it pushes
       * ~2.5e8 km through a float32 matrix first and only resolves the result to ~30 km -
       * enough to visibly separate a planet from anything drawn against its true position,
       * such as its moons' orbit rings.
       */
      mat4.translate(
        this.modelViewMatrix_,
        this.modelViewMatrix_,
        vec3.fromValues(this.position[0] + worldShift[0], this.position[1] + worldShift[1], this.position[2] + worldShift[2])
      );
    }
    mat4.rotateX(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[0]);
    mat4.rotateY(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[1]);
    mat4.rotateZ(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[2]);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);

    this.calculateRelativeSatPos();

    const positionData = ServiceLocator.getDotsManager().positionData;

    if (positionData && this.planetObject?.id) {
      positionData[Number(this.planetObject.id) * 3] = this.position[0];
      positionData[Number(this.planetObject.id) * 3 + 1] = this.position[1];
      positionData[Number(this.planetObject.id) * 3 + 2] = this.position[2];
    }
  }

  /** Last dot visibility written to the GPU buffers, so the writes only happen on a change. */
  protected isDotVisible_: boolean | null = null;
  /** Pickability upload the last write went out against; a newer one means it was clobbered. */
  protected lastPickableGeneration_ = -1;

  /**
   * Minimum on-screen separation from the parent body, in radians, for this body's dot to
   * be shown.
   *
   * Zoomed far enough out the moons collapse onto the planet's own pixel, where their dots
   * are both useless and in the way - clicking Jupiter would hit whichever dot happens to be
   * on top. Below this the dot is hidden AND unpickable.
   */
  protected static readonly DOT_MIN_SEPARATION_RAD_ = 0.02;

  /**
   * The dot stands in for the body only in the range where it is the better marker, and is
   * hidden (and made unpickable) at both ends of that range. Only meaningful for a body
   * drawn as a mesh beside its parent - the catalog moons and Charon, i.e. anything with a
   * `parentBody`/`semiMajorAxisKm` pair. A lone center body's dot is already handled by
   * `DotsManager.hiddenCenterBodySlot_`.
   *
   * Far end: zoomed out the moons collapse onto the planet's own pixel, where their dots are
   * in the way - clicking the planet would select whichever dot won the depth test. Hiding
   * is not enough on its own, because a size-0 dot still owns its pick square; only
   * `a_pickable` clears it.
   *
   * Near end: the dot buffer is a Float32Array of absolute coordinates, and out at Saturn
   * that resolves to no better than ~100 km, which visibly swims against the body it is
   * marking. The mesh is placed in doubles and is already several pixels wide by then, so
   * the dot has nothing left to contribute.
   *
   * The state is reasserted whenever the color scheme re-uploads the pickability buffer.
   * That upload rebuilds every dot from the scheme, which hands all planet dots
   * `Pickable.Yes` unconditionally, so a moon that had gone unpickable silently became
   * clickable again while its dot stayed hidden - you would aim at Jupiter, hit Io, and have
   * nothing on screen explaining why. Comparing the generation costs an integer per body per
   * frame and issues no GPU work unless something actually clobbered the byte.
   */
  protected updateDotVisibility_(): void {
    const planetObject = this.planetObject;
    const parent = this.parentBody ? (ServiceLocator.getScene()?.getBodyById(this.parentBody) as CelestialBody | null) : null;

    // The render loop reaches here before every singleton registers; guard each lookup.
    const camera = ServiceLocator.getMainCamera();

    if (!planetObject || !parent || typeof this.semiMajorAxisKm !== 'number' || !camera) {
      return;
    }

    const cameraDistanceToParent = Math.max(camera.getDistFromEntity(vec3.fromValues(parent.position[0], parent.position[1], parent.position[2])), 1);
    // Small-angle separation between this body's orbit and its parent, as the camera sees it.
    const separationRad = this.semiMajorAxisKm / cameraDistanceToParent;
    const cameraDistanceToBody = Math.max(camera.getDistFromEntity(vec3.fromValues(this.position[0], this.position[1], this.position[2])), 1);
    const nearLimitKm = this.RADIUS * DOT_HIDE_BODY_RADII;
    /*
     * Hysteresis on the near limit: the camera-to-body distance swings by the orbit
     * diameter as the body goes round, so a bare threshold would flicker the dot on and
     * off once per orbit for any view parked near it.
     */
    const nearLimitWithHysteresisKm = this.isDotVisible_ === false ? nearLimitKm * 1.25 : nearLimitKm;
    const isVisible = separationRad >= CelestialBody.DOT_MIN_SEPARATION_RAD_ && cameraDistanceToBody > nearLimitWithHysteresisKm;
    // Undefined until the color scheme registers itself, which is later than the first frames.
    const pickableGeneration = ServiceLocator.getColorSchemeManager()?.pickableUploadGeneration ?? -1;

    if (isVisible === this.isDotVisible_ && pickableGeneration === this.lastPickableGeneration_) {
      return;
    }

    this.isDotVisible_ = isVisible;
    this.lastPickableGeneration_ = pickableGeneration;

    const gl = this.gl_;

    planetObject.setHoverDotSize(gl, isVisible ? 1 : 0);
    planetObject.setPickable(gl, isVisible);
  }

  protected readonly shaders = {
    frag: glsl`
      uniform sampler2D sampler;
      uniform vec3 sunPos;
      uniform vec3 tintColor;
      in vec2 v_texcoord;
      in vec3 v_normal;
      in vec3 vVertToCamera;
      out vec4 fragColor;
      void main(void) {
        vec3 fragToCamera = normalize(vVertToCamera);
        if (dot(fragToCamera, v_normal) < 0.0) {
          discard;
        }
        vec3 lightDirection = sunPos - vec3(0.0,0.0,0.0);
        lightDirection = normalize(lightDirection);
        float lightFromBody = max(dot(v_normal, lightDirection), 0.0) * 1.0;
        vec3 litTexColor = texture(sampler, v_texcoord).rgb * tintColor * (vec3(0.0025, 0.0025, 0.0025) + lightFromBody);
        fragColor = vec4(litTexColor, 1.0);
        ${DepthManager.getLogDepthFragCode()}
      }
    `,
    vert: glsl`
      uniform float drawPosition;
      out vec2 v_texcoord;
      out vec3 v_normal;
      out vec3 vVertToCamera;
      void main(void) {
        vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
        worldPosition.xyz += worldOffset;
        vVertToCamera = normalize(vec3(cameraPosition) - worldPosition.xyz);
        v_texcoord = uv;
        v_normal = normalMatrix * normal;
        gl_Position = projectionMatrix * worldPosition;
        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };

  /**
   * Camera distance, in body radii, at which this body's own orbit path is fully faded out
   * and fully faded in.
   *
   * An orbit path is enormous compared to the body on it - Mars's is a 2.3e8 km circle - so
   * from close up it stops reading as an orbit and becomes a straight line drawn across the
   * planet you are looking at. Expressed in radii so the same numbers work for a 3389 km
   * planet and an 11 km moon: both start fading when they are about 5 deg wide on screen.
   */
  protected static readonly ORBIT_PATH_FADE_OUT_RADII_ = 50;
  protected static readonly ORBIT_PATH_FADE_IN_RADII_ = 200;

  /** False for bodies whose own path is meaningless from their surface (planets, seen from themselves). */
  protected get isOrbitPathDrawnAsCenterBody_(): boolean {
    return false;
  }

  /** How opaque this body's orbit path should be right now, 0-1, based on camera proximity. */
  protected orbitPathProximityOpacity_(): number {
    const distanceKm = ServiceLocator.getMainCamera().getDistFromEntity(vec3.fromValues(this.position[0], this.position[1], this.position[2]));
    const radii = distanceKm / Math.max(this.RADIUS, 1);
    const span = CelestialBody.ORBIT_PATH_FADE_IN_RADII_ - CelestialBody.ORBIT_PATH_FADE_OUT_RADII_;

    return Math.min(Math.max((radii - CelestialBody.ORBIT_PATH_FADE_OUT_RADII_) / span, 0), 1);
  }

  /**
   * Keep the orbit path in step with the camera: faded by proximity, dropped entirely once
   * it reaches zero, and brought back when the camera pulls away again.
   */
  protected updateOrbitPathForProximity_(): void {
    if (!this.isDrawOrbitPath) {
      return;
    }

    const opacity = this.orbitPathProximityOpacity_();

    if (opacity <= 0) {
      this.suspendFullOrbitPath_();

      return;
    }

    if (settingsManager.centerBody !== this.getName() || this.isOrbitPathDrawnAsCenterBody_) {
      this.drawFullOrbitPath();
    } else if (this.fullOrbitPath?.isGarbage) {
      this.fullOrbitPath.isGarbage = false;
      ServiceLocator.getLineManager().add(this.fullOrbitPath);
    }

    if (this.fullOrbitPath) {
      this.fullOrbitPath.opacity = opacity;
    }
  }

  /**
   * Stop drawing the path without clearing {@link isDrawOrbitPath}, so it returns on its
   * own once the camera backs off. {@link hideFullOrbitPath} is the deliberate, sticky
   * version used when the user leaves this body's system entirely.
   */
  protected suspendFullOrbitPath_(): void {
    if (!this.fullOrbitPath || this.fullOrbitPath.isGarbage) {
      return;
    }

    this.fullOrbitPath.isGarbage = true;
    ServiceLocator.getLineManager().removeLine(this.fullOrbitPath);
  }

  drawFullOrbitPath(): void {
    if (this.fullOrbitPath?.isGarbage === false) {
      return;
    }

    const lineManager = ServiceLocator.getLineManager();

    if (this.fullOrbitPath) {
      this.fullOrbitPath.isGarbage = false;
      lineManager.add(this.fullOrbitPath);

      return;
    }

    const simulationTimeObj = ServiceLocator.getTimeManager().simulationTimeObj;
    const now = (simulationTimeObj.getTime() / 1000) as Seconds; // convert ms to s
    const timeslice = this.orbitalPeriod / this.orbitPathSegments_;
    const orbitPositions: [number, number, number][] = [];

    for (let i = 0; i < this.orbitPathSegments_; i++) {
      const t = now + i * timeslice;
      const newTime = new Date(t * 1000);

      this.svCache[i] ??= this.getTeme(newTime, SolarBody.Sun).position; // convert s to ms
      let x = this.svCache[i].x;
      let y = this.svCache[i].y;
      let z = this.svCache[i].z;

      if (settingsManager.centerBody === SolarBody.Sun) {
        // Do nothing
      } else if (settingsManager.centerBody !== SolarBody.Earth && settingsManager.centerBody !== SolarBody.Moon) {
        const centerBodyPlanet = ServiceLocator.getScene().getBodyById(settingsManager.centerBody);

        x = (x + (centerBodyPlanet?.position[0] ?? 0)) as Kilometers;
        y = (y + (centerBodyPlanet?.position[1] ?? 0)) as Kilometers;
        z = (z + (centerBodyPlanet?.position[2] ?? 0)) as Kilometers;
      }

      orbitPositions.push([x, y, z]);
    }

    this.fullOrbitPath = lineManager.createOrbitPath(orbitPositions, this.color, SolarBody.Sun);
  }

  /**
   * Stops drawing this body's heliocentric orbit path and drops its line, leaving
   * every other line alone (unlike `LineManager.clear()`). The Earth-centered path
   * is untouched: it is drawn on its own by the Draw Lines menu and stays valid
   * with an Earth-centered camera.
   */
  hideFullOrbitPath(): void {
    this.isDrawOrbitPath = false;

    if (!this.fullOrbitPath) {
      return;
    }

    this.fullOrbitPath.isGarbage = true;
    // Pull it out of the manager now instead of waiting for the draw-loop prune:
    // drawFullOrbitPath re-adds this same instance later, so a line left in the
    // array would be queued (and drawn) twice.
    ServiceLocator.getLineManager().removeLine(this.fullOrbitPath);
  }

  drawFullOrbitPathRelativeToEarth(): void {
    const now = (ServiceLocator.getTimeManager().simulationTimeObj.getTime() / 1000) as Seconds; // convert ms to s
    const lineManager = ServiceLocator.getLineManager();
    const timeslice = this.orbitalPeriod / this.orbitPathSegments_;
    const orbitPositions: [number, number, number][] = [];

    for (let i = 0; i < this.orbitPathSegments_; i++) {
      const t = now + i * timeslice;
      const sv = this.getTeme(new Date(t * 1000)).position; // convert s to ms

      if (settingsManager.centerBody === SolarBody.Sun) {
        const sunPos = ServiceLocator.getScene().sun.position;

        sv.x = (sv.x + sunPos[0]) as Kilometers;
        sv.y = (sv.y + sunPos[1]) as Kilometers;
        sv.z = (sv.z + sunPos[2]) as Kilometers;
      } else if (settingsManager.centerBody !== SolarBody.Earth) {
        const centerBodyPlanet = ServiceLocator.getScene().getBodyById(settingsManager.centerBody);

        sv.x = (sv.x + (centerBodyPlanet?.position[0] ?? 0)) as Kilometers;
        sv.y = (sv.y + (centerBodyPlanet?.position[1] ?? 0)) as Kilometers;
        sv.z = (sv.z + (centerBodyPlanet?.position[2] ?? 0)) as Kilometers;
      }

      orbitPositions.push([sv.x as number, sv.y as number, sv.z as number]);
    }

    if (this.fullOrbitPathEarthCentered) {
      this.fullOrbitPathEarthCentered.isGarbage = true;
    }
    this.fullOrbitPathEarthCentered = lineManager.createOrbitPath(orbitPositions, this.color, SolarBody.Earth);
  }

  protected calculateRelativeSatPos() {
    const selectedSatPos = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj.position;

    this.relativeSatPos = { x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

    if (selectedSatPos) {
      this.relativeSatPos = SatMath.getPositionFromCenterBody(selectedSatPos, this);
    }
  }
}

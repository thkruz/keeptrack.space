/**
 * Base class for rendering non-Earth celestial bodies (Moon, Mars, etc.)
 */
import { SatMath } from '@app/app/analysis/sat-math';
import { Planet } from '@app/app/objects/planet';
import { EciArr3, rgbaArray } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { glsl } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { EciVec3, EpochUTC, J2000, Kilometers, KilometersPerSecond, Seconds, TEME, Vector3D } from '@ootk/src/main';
import { Body, KM_PER_AU, BackdatePosition as backdatePosition } from 'astronomy-engine';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { keepTrackApi } from '../../../../keepTrackApi';
import { DepthManager } from '../../depth-manager';
import { GlUtils } from '../../gl-utils';
import { OrbitPathLine } from '../../line-manager/orbit-path';
import { OcclusionProgram } from '../post-processing';

export const PlanetColors = {
  MERCURY: [0.6, 0.6, 0.6, 0.7] as rgbaArray,
  VENUS: [0.9, 0.8, 0.45, 0.7] as rgbaArray,
  EARTH: [0, 0.6, 0.8, 0.7] as rgbaArray,
  MOON: [0, 0.6, 0.8, 0.7] as rgbaArray,
  MARS: [0.89, 0.51, 0.35, 0.7] as rgbaArray,
  JUPITER: [0.95, 0.71, 0.64, 0.7] as rgbaArray,
  SATURN: [0.72, 0.65, 0.52, 0.7] as rgbaArray,
  URANUS: [0.67, 0.92, 1, 0.7] as rgbaArray,
  NEPTUNE: [0.48, 0.69, 1, 0.7] as rgbaArray,
} as const;

export abstract class CelestialBody {
  readonly RADIUS: number;
  protected readonly NUM_HEIGHT_SEGS: number;
  protected readonly NUM_WIDTH_SEGS: number;

  protected gl_: WebGL2RenderingContext;
  protected isLoaded_ = false;
  protected modelViewMatrix_ = null as unknown as mat4;
  protected readonly normalMatrix_ = mat3.create();

  color = PlanetColors.EARTH;
  /** Position in EME2000 */
  position = [0, 0, 0] as EciArr3;
  rotation = [0, 0, 0];
  mesh: Mesh;
  planetObject: Planet | null = null;
  relativeSatPos: EciVec3 = { x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

  orbitPathSegments_ = 8192;
  orbitalPeriod: Seconds;
  meanDistanceToSun: Kilometers;
  fullOrbitPath: OrbitPathLine | null = null;
  fullOrbitPathEarthCentered: OrbitPathLine | null = null;
  isDrawOrbitPath: boolean = false;
  svCache: { x: Kilometers; y: Kilometers; z: Kilometers }[] = [];
  lastOrbitCalcTime_: number = 0;

  abstract getName(): Body;
  abstract getTexturePath(): string;

  async init(gl: WebGL2RenderingContext): Promise<void> {
    try {
      this.gl_ = gl;
      const geometry = new SphereGeometry(gl, {
        radius: this.RADIUS,
        widthSegments: this.NUM_HEIGHT_SEGS,
        heightSegments: this.NUM_WIDTH_SEGS,
      });
      const texture = await GlUtils.initTexture(gl, this.getTexturePath());
      const material = new ShaderMaterial(gl, {
        uniforms: {
          sampler: null as unknown as WebGLUniformLocation,
          sunPos: null as unknown as WebGLUniformLocation,
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
        this.isDrawOrbitPath = false;
        if (this.fullOrbitPath) {
          this.fullOrbitPath.isGarbage = true;
          this.fullOrbitPath = null;
        }
        if (this.fullOrbitPathEarthCentered) {
          this.fullOrbitPathEarthCentered.isGarbage = true;
          this.fullOrbitPathEarthCentered = null;
        }
      });

      this.isLoaded_ = true;
    } catch (e) {
      errorManagerInstance.warn(`Error initializing ${this.getName()}:`, e);
    }
  }

  getJ2000(simTime: Date, centerBody = Body.Earth): J2000 {
    const pos = backdatePosition(simTime, centerBody, this.getName(), false);

    return new J2000(
      new EpochUTC((simTime.getTime() / 1000) as Seconds), // convert ms to s
      new Vector3D(pos.x * KM_PER_AU as Kilometers, pos.y * KM_PER_AU as Kilometers, pos.z * KM_PER_AU as Kilometers),
      new Vector3D(0 as KilometersPerSecond, 0 as KilometersPerSecond, 0 as KilometersPerSecond),
    );
  }

  getTeme(simTime: Date, centerBody = Body.Earth): TEME {
    return this.getJ2000(simTime, centerBody).toTEME();
  }

  updatePosition(simTime: Date): void {
    const posTeme = this.getTeme(simTime, Body.Earth).position;

    this.position = [posTeme.x, posTeme.y, posTeme.z];
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
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, keepTrackApi.getRenderer().projectionCameraMatrix);
    gl.uniform3fv(this.mesh.material.uniforms.sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform3fv(this.mesh.material.uniforms.worldOffset, [-this.relativeSatPos.x, -this.relativeSatPos.y, -this.relativeSatPos.z]);
    gl.uniform1f(this.mesh.material.uniforms.drawPosition, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.sampler, 0);
    gl.uniform3fv(this.mesh.material.uniforms.cameraPosition, keepTrackApi.getMainCamera().getForwardVector());
    gl.uniform1f(this.mesh.material.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
  }

  update(simTime: Date) {
    if (!this.isLoaded_) {
      return;
    }
    this.updatePosition(simTime);
    if (this.isDrawOrbitPath) {
      this.drawFullOrbitPath();
    }
    this.modelViewMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);
    if (settingsManager.centerBody !== this.getName()) {
      mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, this.position);
      const worldShift = Scene.getInstance().worldShift;

      mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, vec3.fromValues(worldShift[0], worldShift[1], worldShift[2]));
    }
    mat4.rotateX(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[0]);
    mat4.rotateY(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[1]);
    mat4.rotateZ(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[2]);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);

    this.calculateRelativeSatPos();
  }

  protected readonly shaders = {
    frag: glsl`
      uniform sampler2D sampler;
      uniform vec3 sunPos;
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
        vec3 litTexColor = texture(sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFromBody);
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

  drawFullOrbitPath(): void {
    const simulationTimeObj = ServiceLocator.getTimeManager().simulationTimeObj;

    if (this.fullOrbitPath && Math.abs(simulationTimeObj.getTime() - this.lastOrbitCalcTime_) < 1000 * 60 * 60 * 24) { // 24 hour
      return;
    }
    this.lastOrbitCalcTime_ = simulationTimeObj.getTime();

    const now = simulationTimeObj.getTime() / 1000 as Seconds; // convert ms to s
    const lineManager = ServiceLocator.getLineManager();
    const timeslice = this.orbitalPeriod / this.orbitPathSegments_;
    const orbitPositions: [number, number, number][] = [];
    const { j } = SatMath.calculateTimeVariables(simulationTimeObj);
    const sunPos = ServiceLocator.getScene().sun.getEci(j);

    for (let i = 0; i < this.orbitPathSegments_; i++) {
      const t = now + i * timeslice;
      const newTime = new Date(t * 1000);

      this.svCache[i] ??= this.getTeme(newTime, settingsManager.centerBody).position; // convert s to ms
      let x = this.svCache[i].x;
      let y = this.svCache[i].y;
      let z = this.svCache[i].z;

      if (settingsManager.centerBody === Body.Sun) {

        x = x + sunPos[0] as Kilometers;
        y = y + sunPos[1] as Kilometers;
        z = z + sunPos[2] as Kilometers;
      } else if (settingsManager.centerBody !== Body.Earth && settingsManager.centerBody !== Body.Moon) {
        const centerBodyPlanet = ServiceLocator.getScene().planets[settingsManager.centerBody];

        x += centerBodyPlanet.position[0];
        y += centerBodyPlanet.position[1];
        z += centerBodyPlanet.position[2];
      }

      orbitPositions.push([x, y, z]);
    }

    if (this.fullOrbitPath) {
      this.fullOrbitPath.isGarbage = true;
    }

    this.fullOrbitPath = lineManager.createOrbitPath(orbitPositions, this.color);
  }

  drawFullOrbitPathRelativeToEarth(): void {
    const now = ServiceLocator.getTimeManager().simulationTimeObj.getTime() / 1000 as Seconds; // convert ms to s
    const lineManager = ServiceLocator.getLineManager();
    const timeslice = this.orbitalPeriod / this.orbitPathSegments_;
    const orbitPositions: [number, number, number][] = [];

    for (let i = 0; i < this.orbitPathSegments_; i++) {
      const t = now + i * timeslice;
      const sv = this.getTeme(new Date(t * 1000)).position; // convert s to ms

      if (settingsManager.centerBody === Body.Sun) {
        const sunPos = ServiceLocator.getScene().sun.position;

        sv.x = sv.x + sunPos[0] as Kilometers;
        sv.y = sv.y + sunPos[1] as Kilometers;
        sv.z = sv.z + sunPos[2] as Kilometers;
      } else if (settingsManager.centerBody !== Body.Earth) {
        const centerBodyPlanet = ServiceLocator.getScene().planets[settingsManager.centerBody];

        sv.x += centerBodyPlanet.position[0];
        sv.y += centerBodyPlanet.position[1];
        sv.z += centerBodyPlanet.position[2];
      }

      orbitPositions.push([sv.x as number, sv.y as number, sv.z as number]);
    }

    if (this.fullOrbitPathEarthCentered) {
      this.fullOrbitPathEarthCentered.isGarbage = true;
    }
    this.fullOrbitPathEarthCentered = lineManager.createOrbitPath(orbitPositions, this.color);
  }

  protected calculateRelativeSatPos() {
    const selectedSatPos = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj.position;

    this.relativeSatPos = { x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

    if (selectedSatPos) {
      this.relativeSatPos = SatMath.getPositionFromCenterBody(selectedSatPos, this);
    }
  }
}

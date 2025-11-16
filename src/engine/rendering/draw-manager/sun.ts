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
/* eslint-disable camelcase */
import { EciArr3, SolarBody } from '@app/engine/core/interfaces';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { GlUtils } from '@app/engine/rendering/gl-utils';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { glsl } from '@app/engine/utils/development/formatter';
import { DEG2RAD, EciVec3, Kilometers } from '@ootk/src/main';
import { Body, RotationAxis as rotationAxis } from 'astronomy-engine';
import { mat3, mat4, vec2, vec3 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';

export enum SunTextureQuality {
  POTATO = '512',
  LOW = '1k',
  MEDIUM = '2k',
  HIGH = '4k',
}

export class Sun {
  /** The radius of the sun. */
  private readonly DRAW_RADIUS = 696340;
  /** The number of height segments for the sun. */
  private readonly NUM_HEIGHT_SEGS = 32;
  /** The number of width segments for the sun. */
  private readonly NUM_WIDTH_SEGS = 32;
  /** The distance scalar for the sun. */
  readonly DISTANCE_FROM_EARTH = 149600000;

  /** The WebGL context. */
  private gl_: WebGL2RenderingContext;
  /** Whether the sun has been loaded. */
  private isLoaded_ = false;
  /** The model view matrix. */
  private modelViewMatrix_: mat4;
  /** The normal matrix. */
  private readonly normalMatrix_ = mat3.create();

  /** The position of the sun in TEME ECI coordinates. */
  eci: EciVec3 = { x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };
  /** The mesh for the sun. */
  mesh: Mesh;
  /** The position of the sun in WebGL coordinates accounting for worldShift
   * from earth. This is NOT the same as the eci parameter */
  position = [0, 0, 0] as vec3;
  sizeRandomFactor_ = 0.0;
  /**
   * Keeps the last 1 sun direction calculations in memory to avoid unnecessary calculations.
   */
  sunDirectionCache: { jd: number; sunDirection: EciArr3; } = { jd: 0, sunDirection: [0, 0, 0] };
  textureDirection = [0, 0] as vec2;
  rotation: vec3 = [0, 0, 0];
  lastUpdateTime: number;

  /**
   * This is run once per frame to render the sun.
   */
  draw(earthLightDirection: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_) {
      return;
    }
    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setUniforms_(earthLightDirection);

    if (this.mesh.material.map) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);
    }

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  /**
   * This is run once per session to initialize the sun.
   */
  async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;

    const geometry = new SphereGeometry(this.gl_, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_WIDTH_SEGS,
      heightSegments: this.NUM_HEIGHT_SEGS,
    });
    const sunTextureQuality = settingsManager.sunTextureQuality ?? SunTextureQuality.POTATO;
    const texture = settingsManager.isDrawSun ? await GlUtils.initTexture(gl, `${settingsManager.installDirectory}textures/sun${sunTextureQuality}.jpg`) : null;
    const material = new ShaderMaterial(this.gl_, {
      uniforms: {
        u_sampler: null as unknown as WebGLUniformLocation,
        u_lightDirection: null as unknown as WebGLUniformLocation,
        u_sizeOfSun: null as unknown as WebGLUniformLocation,
        u_sunDistance: null as unknown as WebGLUniformLocation,
        u_isTexture: null as unknown as WebGLUniformLocation,
        u_textureBlend: null as unknown as WebGLUniformLocation,
        u_time: null as unknown as WebGLUniformLocation,
      },
      map: texture,
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh = new Mesh(this.gl_, geometry, material, {
      name: 'sun',
      precision: 'highp',
      disabledUniforms: {
        modelMatrix: true,
        viewMatrix: true,
        cameraPosition: true,
        worldOffset: true,
      },
    });

    this.mesh.geometry.initVao(this.mesh.program);
    this.isLoaded_ = true;

    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
      this.updateEci();
    });
  }

  /**
   * This is run once per frame to update the sun's position.
   */
  update() {
    if (!this.isLoaded_) {
      return;
    }

    const worldShift = Scene.getInstance().worldShift as [number, number, number];

    this.position[0] = this.eci.x + worldShift[0];
    this.position[1] = this.eci.y + worldShift[1];
    this.position[2] = this.eci.z + worldShift[2];

    this.modelViewMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);

    // Translate the sphere to the sun position
    mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, this.position);

    /*
     * Since everything is drawn in ECI with the north pole aligned to the +Z axis,
     * we need to rotate the sun to match the Earth's current orientation.
     * This is only necessary if the Earth or Moon is the center body.
     * TODO: We should be rotating the unvierse not just the sun
     */
    if (settingsManager.centerBody === SolarBody.Earth || settingsManager.centerBody === SolarBody.Moon) {

      const ros = rotationAxis(Body.Earth, ServiceLocator.getTimeManager().simulationTimeObj);

      mat4.rotateY(this.modelViewMatrix_, this.modelViewMatrix_, (ros.dec - 90) * DEG2RAD);
    }

    if (settingsManager.centerBody === SolarBody.Sun) {
      this.rotation[0] += 0.001 * (Math.random() - 0.5);
      this.rotation[1] += 0.001 * (Math.random() - 0.5);
      this.rotation[2] += 0.001 * (Math.random() - 0.5);

      // Trend back to 0 over time
      this.rotation[0] *= 0.99;
      this.rotation[1] *= 0.99;
      this.rotation[2] *= 0.99;

      // Clamp the rotation to prevent it from getting too large
      this.rotation[0] = Math.max(-15 * DEG2RAD, Math.min(15 * DEG2RAD, this.rotation[0]));
      this.rotation[1] = Math.max(-15 * DEG2RAD, Math.min(15 * DEG2RAD, this.rotation[1]));
      this.rotation[2] = Math.max(-15 * DEG2RAD, Math.min(15 * DEG2RAD, this.rotation[2]));

      // Apply the rotation
      mat4.rotateX(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[0]);
      mat4.rotateY(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[1]);
      mat4.rotateZ(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[2]);
    }

    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);
  }

  getEci(simulationTimeObj: Date): EciArr3 {
    if (ServiceLocator.getTimeManager().simulationTimeObj.getTime() === simulationTimeObj.getTime()) {
      return [this.eci.x, this.eci.y, this.eci.z];
    }

    const eci = Scene.getInstance().earth.getTeme(simulationTimeObj, SolarBody.Sun).position.toArray();

    this.eci = { x: <Kilometers>-eci[0], y: <Kilometers>-eci[1], z: <Kilometers>-eci[2] };

    return [this.eci.x, this.eci.y, this.eci.z];
  }

  updateEci() {
    const simulationTimeObj = ServiceLocator.getTimeManager().simulationTimeObj;

    if (simulationTimeObj.getTime() === this.lastUpdateTime) {
      return;
    }

    const eci = Scene.getInstance().earth.getTeme(simulationTimeObj, SolarBody.Sun).position.toArray();

    this.eci = { x: <Kilometers>-eci[0], y: <Kilometers>-eci[1], z: <Kilometers>-eci[2] };

    this.lastUpdateTime = simulationTimeObj.getTime();
  }

  /**
   * This is run once per frame to set the uniforms for the sun.
   */
  private setUniforms_(earthLightDirection: vec3) {
    const gl = this.gl_;

    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, ServiceLocator.getRenderer().projectionCameraMatrix);

    // Animate the fireball effect by passing time to the shader
    const time = performance.now() * 0.0001;

    gl.uniform1f(this.mesh.material.uniforms.u_time, time);

    let adjustedSize = settingsManager.sizeOfSun;

    // Apply a random factor to the sun size (±0.1% per frame, clamped to ±5% total)
    if (settingsManager.centerBody === SolarBody.Sun && ServiceLocator.getMainCamera().zoomLevel() < 0.4) {
      // No random size changes if we are centered on the sun and zoomed in very close
    } else {
      this.sizeRandomFactor_ += (Math.random() - 0.5) * 0.01;
      this.sizeRandomFactor_ = Math.max(0.85, Math.min(1.15, this.sizeRandomFactor_));
      adjustedSize = settingsManager.isUseSunTexture ? settingsManager.sizeOfSun * 1.5 : settingsManager.sizeOfSun * this.sizeRandomFactor_;
    }

    const sunEci = Scene.getInstance().sun.eci;
    const distanceFromSun = ServiceLocator.getMainCamera().getDistFromEntity([sunEci.x, sunEci.y, sunEci.z]);

    // Increase sun size when far away to keep it visible
    if (distanceFromSun >= 1e9) {
      adjustedSize *= 1.0 + (distanceFromSun - 1e9) / 1e9;
    }

    gl.uniform3fv(this.mesh.material.uniforms.u_sizeOfSun, [adjustedSize, adjustedSize, adjustedSize]);
    gl.uniform3fv(this.mesh.material.uniforms.u_lightDirection, earthLightDirection);
    gl.uniform1f(this.mesh.material.uniforms.u_sunDistance, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.u_sampler, 0);
    gl.uniform1f(this.mesh.material.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    gl.uniform1i(this.mesh.material.uniforms.u_isTexture, settingsManager.isUseSunTexture ? 1 : 0);
    const isSunCenterBody = settingsManager.centerBody === SolarBody.Sun;

    gl.uniform1f(this.mesh.material.uniforms.u_textureBlend, isSunCenterBody ? 0.001 : 0.0);
  }

  /**
   * The shaders for the sun.
   *
   * NOTE: Keep these at the bottom of the file to ensure proper syntax highlighting.
   */
  private readonly shaders_ = {
    frag: glsl`
    uniform sampler2D u_sampler;
    uniform bool u_isTexture;
    uniform vec3 u_lightDirection;
    uniform float u_textureBlend;
    uniform float u_time;

    in vec3 v_normal;
    in float v_dist;
    in vec2 vUv;

    out vec4 fragColor;

    // Enhanced fireball noise function for more visible effect
    // Seamless fireball noise function
    float fireNoise(vec2 uv, float t) {
      // Wrap UVs to [0,1] for seamless tiling
      vec2 wrappedUv = vec2(mod(uv.x, 1.0), mod(uv.y, 1.0));
      float n = sin(wrappedUv.x * 2.0 * 3.1415926 + t * 4.0) * cos(wrappedUv.y * 2.0 * 3.1415926 - t * 3.0);
      n += sin(wrappedUv.x * 4.0 * 3.1415926 - t * 2.4) * 0.7;
      n += cos(wrappedUv.y * 4.0 * 3.1415926 + t * 3.4) * 0.7;
      n += sin((wrappedUv.x + wrappedUv.y) * 8.0 * 3.1415926 + t * 6.0) * 0.3;
      return n * 0.5;
    }

    void main(void) {
        vec3 baseColor = texture(u_sampler, vUv).rgb;
        float fire = fireNoise(vUv, u_time);

        if (u_isTexture) {
          // Stronger animated fireball effect to the texture
          vec3 fireColor = vec3(1.0, 0.7, 0.2) * (1.0 + fire * 0.7);
          baseColor = mix(baseColor, fireColor, 0.7 + fire * 0.3);
          fragColor = vec4(baseColor, 1.0);
        } else {
          float a = max(dot(v_normal, -u_lightDirection), 0.1);
          a = pow(a, 0.005);

          float r = 1.0 * a + fire * 0.5;
          float g = 0.85 * a + fire * 0.3;
          float b = 0.7 * a + fire * 0.2;

          vec3 sunColor = vec3(r, g, b);
          vec3 blendedColor = mix(sunColor, baseColor, u_textureBlend);

          fragColor = vec4(blendedColor, 1.0);
        }
        ${DepthManager.getLogDepthFragCode()}
    }`,
    vert: glsl`
        uniform vec3 u_sizeOfSun;
        uniform float u_sunDistance;
        uniform float u_time;

        out vec2 vUv;
        out vec3 v_normal;
        out float v_dist;

        void main(void) {
            vec4 worldPosition = modelViewMatrix * vec4(position * u_sizeOfSun, 1.0);
            gl_Position = projectionMatrix * worldPosition;

            v_dist = distance(worldPosition.xyz,vec3(0.0,0.0,0.0)) / u_sunDistance;

            vUv = uv;
            v_normal = normalMatrix * normal;

            ${DepthManager.getLogDepthVertCode()}
        }`,
  };
}

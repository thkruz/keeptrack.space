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
import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { GlUtils } from '@app/static/gl-utils';
import { GLSL3 } from '@app/static/material';
import { Mesh } from '@app/static/mesh';
import { SatMath } from '@app/static/sat-math';
import { ShaderMaterial } from '@app/static/shader-material';
import { SphereGeometry } from '@app/static/sphere-geometry';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { EciVec3, Kilometers } from 'ootk';

export class Sun {
  /** The radius of the sun. */
  private readonly DRAW_RADIUS = 1500;
  /** The number of height segments for the sun. */
  private readonly NUM_HEIGHT_SEGS = 32;
  /** The number of width segments for the sun. */
  private readonly NUM_WIDTH_SEGS = 32;
  /** The distance scalar for the sun. */
  private readonly SCALAR_DISTANCE = 220000;

  /** The WebGL context. */
  private gl_: WebGL2RenderingContext;
  /** Whether the sun has been loaded. */
  private isLoaded_ = false;
  /** The model view matrix. */
  private modelViewMatrix_: mat4;
  /** The normal matrix. */
  private readonly normalMatrix_ = mat3.create();

  /** The position of the sun in ECI coordinates. */
  eci: EciVec3;
  /** The mesh for the sun. */
  mesh: Mesh;
  /** The position of the sun in WebGL coordinates. */
  position = [0, 0, 0] as vec3;
  sizeRandomFactor_ = 0.0;
  /**
   * Keeps the last 1 sun direction calculations in memory to avoid unnecessary calculations.
   */
  sunDirectionCache: { jd: number; sunDirection: EciArr3; } = { jd: 0, sunDirection: [0, 0, 0] };

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
    const texture = await GlUtils.initTexture(gl, `${settingsManager.installDirectory}textures/sun-1024.jpg`);
    const material = new ShaderMaterial(this.gl_, {
      uniforms: {
        u_sampler: null as unknown as WebGLUniformLocation,
        u_lightDirection: null as unknown as WebGLUniformLocation,
        u_sizeOfSun: null as unknown as WebGLUniformLocation,
        u_sunDistance: null as unknown as WebGLUniformLocation,
        u_isTexture: null as unknown as WebGLUniformLocation,
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
      },
    });

    this.mesh.geometry.initVao(this.mesh.program);
    this.isLoaded_ = true;
  }

  /**
   * This is run once per frame to update the sun's position.
   */
  update(j: number) {
    const eci = SatMath.getSunDirection(j);

    this.eci = { x: <Kilometers>eci[0], y: <Kilometers>eci[1], z: <Kilometers>eci[2] };

    const sunMaxDist = Math.max(Math.max(Math.abs(eci[0]), Math.abs(eci[1])), Math.abs(eci[2]));

    this.position[0] = (eci[0] / sunMaxDist) * this.SCALAR_DISTANCE;
    this.position[1] = (eci[1] / sunMaxDist) * this.SCALAR_DISTANCE;
    this.position[2] = (eci[2] / sunMaxDist) * this.SCALAR_DISTANCE;

    this.modelViewMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);
    mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, this.position);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);
  }

  /**
   * This is run once per frame to set the uniforms for the sun.
   */
  private setUniforms_(earthLightDirection: vec3) {
    const gl = this.gl_;

    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, keepTrackApi.getRenderer().projectionCameraMatrix);
    // Apply a random factor to the sun size (±0.1% per frame, clamped to ±5% total)

    // Add a small random change (±0.25%)
    this.sizeRandomFactor_ += (Math.random() - 0.5) * 0.005;
    // Clamp to ±5% range
    this.sizeRandomFactor_ = Math.max(0.85, Math.min(1.15, this.sizeRandomFactor_));
    const adjustedSize = settingsManager.sizeOfSun * this.sizeRandomFactor_;

    gl.uniform3fv(this.mesh.material.uniforms.u_sizeOfSun, [adjustedSize, adjustedSize, adjustedSize]);
    gl.uniform3fv(this.mesh.material.uniforms.u_lightDirection, earthLightDirection);
    gl.uniform1f(this.mesh.material.uniforms.u_sunDistance, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.u_sampler, 0);
    gl.uniform1i(this.mesh.material.uniforms.u_isTexture, settingsManager.isUseSunTexture ? 1 : 0);
  }

  /**
   * The shaders for the sun.
   *
   * NOTE: Keep these at the bottom of the file to ensure proper syntax highlighting.
   */
  private readonly shaders_ = {
    frag: keepTrackApi.glsl`
        uniform bool u_isTexture;
        uniform vec3 u_lightDirection;
        uniform sampler2D u_sampler;

        in vec3 v_normal;
        in float v_dist;
        in vec2 v_texcoord;

        out vec4 fragColor;

        void main(void) {
            // Hide the Back Side of the Sphere to prevent duplicate suns
            if (v_dist > 1.0) {
            discard;
            }

            if (u_isTexture) {
              fragColor = texture(u_sampler, v_texcoord);
            } else {
              // Improved sun appearance with smoother gradient
              float a = max(dot(v_normal, -u_lightDirection), 0.1);

              // Apply a more realistic falloff using pow() for solar limb darkening
              a = pow(a, 0.005); // Softer falloff

              float r = 0.9 * a;
              float g = 0.8 * a;
              float b = 0.65 * a;
              fragColor = vec4(vec3(r,g,b), a);
            }
        }`,
    vert: keepTrackApi.glsl`
        uniform vec3 u_sizeOfSun;
        uniform float u_sunDistance;

        out vec2 v_texcoord;
        out vec3 v_normal;
        out float v_dist;

        void main(void) {
            vec4 worldPosition = modelViewMatrix * vec4(position * u_sizeOfSun, 1.0);
            gl_Position = projectionMatrix * worldPosition;

            v_dist = distance(worldPosition.xyz,vec3(0.0,0.0,0.0)) / u_sunDistance;

            v_texcoord = uv;
            v_normal = normalMatrix * normal;
        }`,
  };
}

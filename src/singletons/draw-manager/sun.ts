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
import { Component } from '@app/doris/components/component';
import { Doris } from '@app/doris/doris';
import { GlUtils } from '@app/doris/webgl/gl-utils';
import { GLSL3 } from '@app/doris/webgl/material';
import { Mesh } from '@app/doris/webgl/mesh';
import { ShaderMaterial } from '@app/doris/webgl/shader-material';
import { SphereGeometry } from '@app/doris/webgl/sphere-geometry';
import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SatMath } from '@app/static/sat-math';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { EciVec3, Kilometers } from 'ootk';

export class Sun extends Component {
  /** The radius of the sun. */
  private readonly DRAW_RADIUS = 1500;
  /** The number of height segments for the sun. */
  private readonly NUM_HEIGHT_SEGS = 32;
  /** The number of width segments for the sun. */
  private readonly NUM_WIDTH_SEGS = 32;
  /** The distance scalar for the sun. */
  private readonly SCALAR_DISTANCE = 200000;
  /** The normal matrix. */
  private readonly normalMatrix_ = mat3.create();

  /** The position of the sun in ECI coordinates. */
  eci: EciVec3;
  /** The mesh for the sun. */
  private mesh_: Mesh;
  private sizeRandomFactor_ = 0.0;
  /**
   * Keeps the last 1 sun direction calculations in memory to avoid unnecessary calculations.
   */
  sunDirectionCache: { jd: number; sunDirection: EciArr3; } = { jd: 0, sunDirection: [0, 0, 0] };

  /**
   * This is run once per session to initialize the sun.
   */
  async initialize(): Promise<void> {
    const gl = Doris.getInstance().getRenderer().gl;

    const geometry = new SphereGeometry(gl, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_WIDTH_SEGS,
      heightSegments: this.NUM_HEIGHT_SEGS,
    });
    const texture = await GlUtils.initTexture(gl, `${settingsManager.installDirectory}textures/sun-1024.jpg`);
    const material = new ShaderMaterial(gl, {
      uniforms: {
        u_sampler: null as unknown as WebGLUniformLocation,
        u_lightDirection: null as unknown as WebGLUniformLocation,
        u_sizeOfSun: null as unknown as WebGLUniformLocation,
        u_isTexture: null as unknown as WebGLUniformLocation,
      },
      map: texture,
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh_ = new Mesh(gl, geometry, material, {
      name: 'sun',
      precision: 'highp',
      disabledUniforms: {
        modelMatrix: true,
        viewMatrix: true,
        cameraPosition: true,
      },
    });

    // Set the local matrix based on the geometry
    mat4.copy(this.node.transform.localMatrix, this.mesh_.geometry.localMvMatrix);

    this.mesh_.geometry.initVao(this.mesh_.program);
  }

  /**
   * This is run once per frame to update the sun's position.
   */
  update() {
    this.updateEciPosition_();

    mat4.translate(this.node.transform.worldMatrix, this.node.transform.worldMatrix, this.node.transform.position);
    mat3.normalFromMat4(this.normalMatrix_, this.node.transform.worldMatrix);
  }

  /**
   * Updates the ECI (Earth-Centered Inertial) position of the moon and then scale it down to fit the camera's max distance.
   */
  private updateEciPosition_() {
    const j = keepTrackApi.getTimeManager().j;
    const eci = SatMath.getSunDirection(j);

    this.eci = { x: <Kilometers>eci[0], y: <Kilometers>eci[1], z: <Kilometers>eci[2] };

    const sunMaxDist = Math.max(Math.max(Math.abs(eci[0]), Math.abs(eci[1])), Math.abs(eci[2]));
    const cameraPos = this.node.parent!.transform.position;

    const sunPositionRelative = vec3.fromValues(
      (eci[0] / sunMaxDist) * this.SCALAR_DISTANCE - cameraPos[0],
      (eci[1] / sunMaxDist) * this.SCALAR_DISTANCE - cameraPos[1],
      (eci[2] / sunMaxDist) * this.SCALAR_DISTANCE + cameraPos[2],
    );

    this.node.transform.setPosition(sunPositionRelative);
  }

  /**
   * This is run once per frame to render the sun.
   */
  draw(earthLightDirection: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isInitialized_ || !settingsManager.isDrawSun) {
      return;
    }
    const gl = Doris.getInstance().getRenderer().gl;

    this.mesh_.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setUniforms_(gl, earthLightDirection);

    if (this.mesh_.material.map) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.mesh_.material.map);
    }

    gl.bindVertexArray(this.mesh_.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh_.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  /**
   * This is run once per frame to set the uniforms for the sun.
   */
  private setUniforms_(gl: WebGL2RenderingContext, earthLightDirection: vec3) {
    gl.uniformMatrix3fv(this.mesh_.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh_.material.uniforms.modelViewMatrix, false, this.node.transform.worldMatrix);
    gl.uniformMatrix4fv(this.mesh_.material.uniforms.projectionMatrix, false, keepTrackApi.getMainCamera().projectionCameraMatrix);
    // Apply a random factor to the sun size (±0.1% per frame, clamped to ±5% total)

    // Add a small random change (±0.25%)
    this.sizeRandomFactor_ += (Math.random() - 0.5) * 0.005;
    // Clamp to ±5% range
    this.sizeRandomFactor_ = Math.max(0.85, Math.min(1.15, this.sizeRandomFactor_));
    const adjustedSize = settingsManager.sizeOfSun * this.sizeRandomFactor_;

    gl.uniform3fv(this.mesh_.material.uniforms.u_sizeOfSun, [adjustedSize, adjustedSize, adjustedSize]);
    gl.uniform3fv(this.mesh_.material.uniforms.u_lightDirection, earthLightDirection);
    gl.uniform1i(this.mesh_.material.uniforms.u_sampler, 0);
    gl.uniform1i(this.mesh_.material.uniforms.u_isTexture, settingsManager.isUseSunTexture ? 1 : 0);
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
        in vec2 v_texcoord;

        out vec4 fragColor;

        void main(void) {
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

        out vec2 v_texcoord;
        out vec3 v_normal;

        void main(void) {
            vec4 worldPosition = modelViewMatrix * vec4(position * u_sizeOfSun, 1.0);
            gl_Position = projectionMatrix * worldPosition;

            v_texcoord = uv;
            v_normal = normalMatrix * normal;
        }`,
  };
}

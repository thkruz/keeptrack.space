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

import { GLSL3 } from '@app/static/material';
import { Mesh } from '@app/static/mesh';
import { ShaderMaterial } from '@app/static/shader-material';
import { SphereGeometry } from '@app/static/sphere-geometry';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { EciVec3, EpochUTC, Moon as MoonMath } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { GlUtils } from '../../static/gl-utils';

export class Moon {
  /** The radius of the moon. */
  private readonly DRAW_RADIUS = 2000;
  /** The distance scalar for the moon. */
  private readonly SCALAR_DISTANCE = 200000;
  /** The number of height segments for the moon. */
  private readonly NUM_HEIGHT_SEGS = 16;
  /** The number of width segments for the moon. */
  private readonly NUM_WIDTH_SEGS = 16;

  /** The WebGL context. */
  private gl_: WebGL2RenderingContext;
  /** Whether the moon has been loaded. */
  private isLoaded_ = false;
  /** The model view matrix. */
  private modelViewMatrix_ = null as unknown as mat4;
  /** The normal matrix. */
  private readonly normalMatrix_ = mat3.create();

  /** The position of the moon in WebGL coordinates. */
  position = [0, 0, 0] as vec3;
  /** The position of the moon in ECI coordinates. */
  eci: EciVec3;
  /** The mesh for the moon. */
  mesh: Mesh;

  /**
   * This is run once per frame to render the moon.
   */
  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisableMoon) {
      return;
    }
    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setUniforms_(gl, sunPosition);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  /**
   * This is run once per session to initialize the moon.
   */
  private setUniforms_(gl: WebGL2RenderingContext, sunPosition: vec3) {
    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, keepTrackApi.getRenderer().projectionCameraMatrix);
    gl.uniform3fv(this.mesh.material.uniforms.sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform1f(this.mesh.material.uniforms.drawPosition, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.sampler, 0);
  }

  /**
   * This is run once per session to initialize the moon.
   */
  async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;

    const geometry = new SphereGeometry(gl, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_HEIGHT_SEGS,
      heightSegments: this.NUM_WIDTH_SEGS,
    });
    const texture = await GlUtils.initTexture(gl, `${settingsManager.installDirectory}textures/moon-1024.jpg`);
    const material = new ShaderMaterial(gl, {
      uniforms: {
        sampler: null as unknown as WebGLUniformLocation,
        drawPosition: null as unknown as WebGLUniformLocation,
        sunPos: null as unknown as WebGLUniformLocation,
      },
      map: texture,
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh = new Mesh(gl, geometry, material, {
      name: 'moon',
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
   * This is run once per frame to update the moon.
   */
  update(simTime: Date) {
    if (!this.isLoaded_) {
      return;
    }

    this.updateEciPosition_(simTime);

    this.modelViewMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);
    mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, this.position);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);
  }

  /**
   * Updates the ECI (Earth-Centered Inertial) position of the moon. We calculate the range, azimuth, and elevation of the moon
   * at lat/lon 0/0, then convert that to ECF (Earth-Centered Fixed) coordinates, then convert that to ECI coordinates.
   *
   * @param simTime - The simulation time.
   * @param gmst - The Greenwich Mean Sidereal Time.
   */
  private updateEciPosition_(simTime: Date) {
    this.eci = MoonMath.eci(EpochUTC.fromDateTime(simTime));

    if (this.eci.x && this.eci.y && this.eci.z) {
      const scaleFactor = this.SCALAR_DISTANCE / Math.max(Math.max(Math.abs(this.eci.x), Math.abs(this.eci.y)), Math.abs(this.eci.z));

      this.position[0] = this.eci.x * scaleFactor;
      this.position[1] = this.eci.y * scaleFactor;
      this.position[2] = this.eci.z * scaleFactor;
    }
  }

  /** The shaders for the moon. */
  private readonly shaders_ = {
    frag: keepTrackApi.glsl`
      uniform sampler2D sampler;
      uniform vec3 sunPos;

      in vec2 v_texcoord;
      in vec3 v_normal;
      in float v_dist;

      out vec4 fragColor;

      void main(void) {
        // Don't draw the back of the sphere
        if (v_dist > 1.0) {
          discard;
        }

        // sun is shining opposite of its direction from the center of the earth
        vec3 lightDirection = sunPos - vec3(0.0,0.0,0.0);

        // Normalize this to a max of 1.0
        lightDirection = normalize(lightDirection);

        // Smooth the light across the sphere
        float lightFrommoon = max(dot(v_normal, lightDirection), 0.0)  * 1.0;

        // Calculate the color by merging the texture with the light
        vec3 litTexColor = texture(sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFrommoon);


        fragColor = vec4(litTexColor, 1.0);
      }
      `,
    vert: keepTrackApi.glsl`
      uniform float drawPosition;

      out vec2 v_texcoord;
      out vec3 v_normal;
      out float v_dist;

      void main(void) {
          vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * worldPosition;

          // Ratio of the vertex distance compared to the center of the sphere
          // This lets us figure out which verticies are on the back half
          v_dist = distance(worldPosition.xyz,vec3(0.0,0.0,0.0)) \/ drawPosition;

          v_texcoord = uv;
          v_normal = normalMatrix * normal;
      }
      `,
  };
}

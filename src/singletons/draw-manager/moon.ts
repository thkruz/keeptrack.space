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

import { Component } from '@app/doris/components/component';
import { Doris } from '@app/doris/doris';
import { GLSL3 } from '@app/doris/webgl/material';
import { Mesh } from '@app/doris/webgl/mesh';
import { ShaderMaterial } from '@app/doris/webgl/shader-material';
import { SphereGeometry } from '@app/doris/webgl/sphere-geometry';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { EpochUTC, Moon as MoonMath } from 'ootk';
import { GlUtils } from '../../doris/webgl/gl-utils';
import { keepTrackApi } from '../../keepTrackApi';

/* eslint-disable camelcase */
export class Moon extends Component {
  /** The radius of the moon. */
  private readonly DRAW_RADIUS = 2000;
  /** The distance scalar for the moon. */
  private readonly SCALAR_DISTANCE = 300000;
  /** The number of height segments for the moon. */
  private readonly NUM_HEIGHT_SEGS = 16;
  /** The number of width segments for the moon. */
  private readonly NUM_WIDTH_SEGS = 16;
  /** The normal matrix. */
  private readonly normalMatrix_ = mat3.create();
  /** The mesh for the moon. */
  private mesh_: Mesh;

  /**
   * This is run once per session to initialize the moon.
   */
  async initialize(): Promise<void> {
    if (settingsManager.isDisableMoon) {
      return;
    }

    const gl = Doris.getInstance().getRenderer().gl;
    const geometry = new SphereGeometry(gl, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_HEIGHT_SEGS,
      heightSegments: this.NUM_WIDTH_SEGS,
    });
    const texture = await GlUtils.initTexture(gl, `${settingsManager.installDirectory}textures/moon-1024.jpg`);
    const material = new ShaderMaterial(gl, {
      uniforms: {
        u_sampler: null as unknown as WebGLUniformLocation,
        sunPos: null as unknown as WebGLUniformLocation,
      },
      map: texture,
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh_ = new Mesh(gl, geometry, material, {
      name: 'moon',
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
   * This is run once per frame to update the moon.
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
    const simTime = keepTrackApi.getTimeManager().simulationTimeObj;
    const eci = MoonMath.eci(EpochUTC.fromDateTime(simTime));

    if (eci.x && eci.y && eci.z) {
      const scaleFactor = this.SCALAR_DISTANCE / Math.max(Math.max(Math.abs(eci.x), Math.abs(eci.y)), Math.abs(eci.z));
      const earthPosition = keepTrackApi.getScene().earth.node.transform.position;
      const cameraPosition = this.node.parent!.transform.position;

      this.node.transform.setPosition([
        earthPosition[0] + eci.x * scaleFactor - cameraPosition[0],
        earthPosition[1] + eci.y * scaleFactor - cameraPosition[1],
        earthPosition[2] + eci.z * scaleFactor + cameraPosition[2],
      ]);
    }
  }

  /**
   * This is run once per frame to render the moon.
   */
  render(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isInitialized_ || settingsManager.isDisableMoon) {
      return;
    }
    const gl = Doris.getInstance().getRenderer().gl;

    this.mesh_.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setUniforms_(gl, sunPosition);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh_.material.map);

    gl.bindVertexArray(this.mesh_.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh_.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  /**
   * Setup the uniforms for the moon shader.
   */
  private setUniforms_(gl: WebGL2RenderingContext, sunPosition: vec3) {
    gl.uniformMatrix3fv(this.mesh_.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh_.material.uniforms.modelViewMatrix, false, this.node.transform.worldMatrix);
    gl.uniformMatrix4fv(this.mesh_.material.uniforms.projectionMatrix, false, keepTrackApi.getMainCamera().projectionCameraMatrix);
    gl.uniform3fv(this.mesh_.material.uniforms.sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform1i(this.mesh_.material.uniforms.u_sampler, 0);
  }

  /**
   * The shaders for the moon.
   */
  private readonly shaders_ = {
    frag: keepTrackApi.glsl`
      uniform sampler2D u_sampler;
      uniform vec3 sunPos;

      in vec2 v_texcoord;
      in vec3 v_normal;

      out vec4 fragColor;

      void main(void) {
        // sun is shining opposite of its direction from the center of the earth
        vec3 lightDirection = sunPos - vec3(0.0,0.0,0.0);

        // Normalize this to a max of 1.0
        lightDirection = normalize(lightDirection);

        // Smooth the light across the sphere
        float lightFrommoon = max(dot(v_normal, lightDirection), 0.0)  * 1.0;

        // Calculate the color by merging the texture with the light
        vec3 litTexColor = texture(u_sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFrommoon);


        fragColor = vec4(litTexColor, 1.0);
      }
      `,
    vert: keepTrackApi.glsl`
      out vec2 v_texcoord;
      out vec3 v_normal;

      void main(void) {
          vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * worldPosition;

          v_texcoord = uv;
          v_normal = normalMatrix * normal;
      }
      `,
  };
}

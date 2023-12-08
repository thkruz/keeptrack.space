import { keepTrackApi } from '@app/js/keepTrackApi';
import { BufferAttribute } from '@app/js/static/buffer-attribute';
import { GLSL3 } from '@app/js/static/material';
import { Mesh } from '@app/js/static/mesh';
import { SatMath } from '@app/js/static/sat-math';
import { ShaderMaterial } from '@app/js/static/shader-material';
import { SphereGeometry } from '@app/js/static/sphere-geometry';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { EciVec3, Kilometers } from 'ootk';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General License for more details.
 *
 * You should have received a copy of the GNU Affero General License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

export class Sun {
  private readonly DRAW_RADIUS = 1500;
  private readonly NUM_HEIGHT_SEGS = 32;
  private readonly NUM_WIDTH_SEGS = 32;
  private readonly SCALAR_DISTANCE = 220000;

  mesh: Mesh;
  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private positionModifier_ = [0, 0, 0];
  position: EciVec3;
  drawPosition = [0, 0, 0] as vec3;

  draw(earthLightDirection: vec3, pMatrix: mat4, camMatrix: mat4, tgtBuffer: WebGLFramebuffer = null) {
    if (!this.isLoaded_) return;
    const gl = this.gl_;

    gl.useProgram(this.mesh.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.uniformMatrix3fv(this.mesh.material.uniforms.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.u_camMatrix, false, camMatrix);
    gl.uniform3fv(this.mesh.material.uniforms.u_lightDir, earthLightDirection);
    gl.uniform1f(this.mesh.material.uniforms.u_sunDistance, Math.sqrt(this.drawPosition[0] ** 2 + this.drawPosition[1] ** 2 + this.drawPosition[2] ** 2));

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;

    const geometry = new SphereGeometry(this.gl_, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_WIDTH_SEGS,
      heightSegments: this.NUM_HEIGHT_SEGS,
      isSkipTexture: true,
      attributes: {
        a_position: new BufferAttribute({
          location: 0,
          vertices: 3,
          stride: Float32Array.BYTES_PER_ELEMENT * 6,
          offset: 0,
        }),
        a_normal: new BufferAttribute({
          location: 1,
          vertices: 3,
          stride: Float32Array.BYTES_PER_ELEMENT * 6,
          offset: Float32Array.BYTES_PER_ELEMENT * 3,
        }),
      },
    });
    const material = new ShaderMaterial(this.gl_, {
      uniforms: {
        u_nMatrix: <WebGLUniformLocation>null,
        u_mvMatrix: <WebGLUniformLocation>null,
        u_pMatrix: <WebGLUniformLocation>null,
        u_camMatrix: <WebGLUniformLocation>null,
        u_lightDir: <WebGLUniformLocation>null,
        u_sunDistance: <WebGLUniformLocation>null,
      },
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });
    this.mesh = new Mesh(this.gl_, geometry, material);
    this.mesh.geometry.initVao(this.mesh.program);

    this.isLoaded_ = true;
  }

  update(j: number) {
    this.calculatePosition_(j);

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.drawPosition);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private calculatePosition_(j: number) {
    const eci = SatMath.getSunDirection(j);
    this.position = { x: <Kilometers>eci[0], y: <Kilometers>eci[1], z: <Kilometers>eci[2] };

    const sunMaxDist = Math.max(Math.max(Math.abs(eci[0]), Math.abs(eci[1])), Math.abs(eci[2]));
    this.drawPosition[0] = (eci[0] / sunMaxDist) * this.SCALAR_DISTANCE + this.positionModifier_[0];
    this.drawPosition[1] = (eci[1] / sunMaxDist) * this.SCALAR_DISTANCE + this.positionModifier_[1];
    this.drawPosition[2] = (eci[2] / sunMaxDist) * this.SCALAR_DISTANCE + this.positionModifier_[2];
  }

  private shaders_ = {
    frag: keepTrackApi.glsl`
        precision highp float;
        uniform vec3 u_lightDir;

        in vec3 v_normal;
        in float v_dist2;

        out vec4 fragColor;

        void main(void) {
            // Hide the Back Side of the Sphere to prevent duplicate suns
            if (v_dist2 > 1.0) {
            discard;
            }

            float a = max(dot(v_normal, -u_lightDir), 0.1);
            // Set colors
            float r = 1.0 * a;
            float g = 1.0 * a;
            float b = 0.9 * a;
            fragColor = vec4(vec3(r,g,b), a);
        }
        `,
    vert: keepTrackApi.glsl`
        in vec3 a_position;
        in vec3 a_normal;

        uniform mat4 u_pMatrix;
        uniform mat4 u_camMatrix;
        uniform mat4 u_mvMatrix;
        uniform mat3 u_nMatrix;
        uniform float u_sunDistance;

        out vec3 v_normal;
        out float v_dist2;

        void main(void) {
            vec4 position = u_mvMatrix * vec4(a_position / 1.6, 1.0);
            gl_Position = u_pMatrix * u_camMatrix * position;
            v_dist2 = distance(position.xyz,vec3(0.0,0.0,0.0)) / u_sunDistance;
            v_normal = u_nMatrix * a_normal;
        }
      `,
  };
}

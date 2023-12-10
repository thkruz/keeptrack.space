/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
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
import { RAD2DEG } from '@app/js/lib/constants';
import { GLSL3 } from '@app/js/static/material';
import { Mesh } from '@app/js/static/mesh';
import { ShaderMaterial } from '@app/js/static/shader-material';
import { SphereGeometry } from '@app/js/static/sphere-geometry';
import { mat3, mat4, vec3 } from 'gl-matrix';
import * as Ootk from 'ootk';
import { Degrees, Kilometers, Radians } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { CoordinateTransforms } from '../../static/coordinate-transforms';
import { GlUtils } from '../../static/gl-utils';
import { errorManagerInstance } from '../errorManager';

export class Moon {
  private readonly DRAW_RADIUS = 2500;
  private readonly SCALAR_DISTANCE = 200000;
  private readonly NUM_HEIGHT_SEGS = 16;
  private readonly NUM_WIDTH_SEGS = 16;

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private modelViewMatrix = <mat4>null;
  private normalMatrix = mat3.create();

  position = [0, 0, 0] as vec3;
  eci: Ootk.EciVec3;
  mesh: Mesh;

  draw(sunPosition: vec3, pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_ || settingsManager.isDisableMoon) return;
    const gl = this.gl_;

    gl.useProgram(this.mesh.program);
    if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setUniforms_(gl, pMatrix, camMatrix, sunPosition);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private setUniforms_(gl: WebGL2RenderingContext, pMatrix: mat4, camMatrix: mat4, sunPosition: vec3) {
    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix);
    const uPCamMatrix = mat4.mul(mat4.create(), pMatrix, camMatrix);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, uPCamMatrix);
    gl.uniform3fv(this.mesh.material.uniforms.sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform1f(this.mesh.material.uniforms.drawPosition, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.sampler, 0);
  }

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
        sampler: <WebGLUniformLocation>null,
        drawPosition: <WebGLUniformLocation>null,
        sunPos: <WebGLUniformLocation>null,
      },
      map: texture,
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });
    this.mesh = new Mesh(gl, geometry, material, 'moon');
    this.mesh.geometry.initVao(this.mesh.program);
    this.isLoaded_ = true;
  }

  update(simTime: Date, gmst: Ootk.GreenwichMeanSiderealTime) {
    if (!this.isLoaded_) return;

    const rae = Ootk.Utils.MoonMath.getMoonPosition(simTime, <Degrees>0, <Degrees>0);
    this.eci = Ootk.Transforms.ecf2eci(
      CoordinateTransforms.rae2ecf(<Degrees>(180 + rae.az * RAD2DEG), <Degrees>(rae.el * RAD2DEG), rae.rng as Kilometers, <Radians>0, <Radians>0, <Kilometers>0),
      gmst
    );

    if (!this.eci.x || !this.eci.y || !this.eci.z) {
      errorManagerInstance.debug('Moon position is undefined.');
      return;
    }

    const scaleFactor = this.SCALAR_DISTANCE / Math.max(Math.max(Math.abs(this.eci.x), Math.abs(this.eci.y)), Math.abs(this.eci.z));
    this.position[0] = this.eci.x * scaleFactor;
    this.position[1] = this.eci.y * scaleFactor;
    this.position[2] = this.eci.z * scaleFactor;

    this.modelViewMatrix = mat4.clone(this.mesh.geometry.localMvMatrix);
    mat4.translate(this.modelViewMatrix, this.modelViewMatrix, this.position);
    mat3.normalFromMat4(this.normalMatrix, this.modelViewMatrix);
  }

  private shaders_ = {
    frag: keepTrackApi.glsl`
      uniform sampler2D sampler;
      uniform vec3 sunPos;

      in vec2 v_texcoord;
      in vec3 v_normal;
      in float v_dist;

      out vec4 fragColor;

      void main(void) {
          // sun is shining opposite of its direction from the center of the earth
          vec3 lightDirection = sunPos - vec3(0.0,0.0,0.0);

          // Normalize this to a max of 1.0
          lightDirection = normalize(lightDirection);

          // Smooth the light across the sphere
          float lightFrommoon = max(dot(v_normal, lightDirection), 0.0)  * 1.0;

          // Calculate the color by merging the texture with the light
          vec3 litTexColor = texture(sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFrommoon);

          // Don't draw the back of the sphere
          if (v_dist > 1.0) {
            discard;
          }

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

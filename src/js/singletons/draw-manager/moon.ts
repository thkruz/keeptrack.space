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
/* eslint-disable camelcase */

export class Moon {
  private readonly DRAW_RADIUS = 2500;
  private readonly SCALAR_DISTANCE = 200000;
  private readonly numLatSegs_ = 16;
  private readonly numLonSegs_ = 16;

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private rae_: { az: Radians; el: Radians; rng: number; parallacticAngle: number };
  private texture = <WebGLTexture>null;
  private uPCamMatrix_: mat4;
  private vao: WebGLVertexArrayObject;

  drawPosition = [0, 0, 0] as vec3;
  eci: Ootk.EciVec3;
  mesh: Mesh;

  draw(sunPosition: vec3, pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_ || settingsManager.isDisableMoon) return;
    const gl = this.gl_;

    gl.useProgram(this.mesh.program);
    if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set the uniforms
    gl.uniformMatrix3fv(this.mesh.material.uniforms.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.u_mvMatrix, false, this.mvMatrix_);
    this.uPCamMatrix_ = mat4.mul(mat4.create(), pMatrix, camMatrix);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.u_pCamMatrix, false, this.uPCamMatrix_);
    gl.uniform3fv(this.mesh.material.uniforms.u_sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform1f(this.mesh.material.uniforms.u_drawPosition, Math.sqrt(this.drawPosition[0] ** 2 + this.drawPosition[1] ** 2 + this.drawPosition[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.u_sampler, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  forceLoaded() {
    this.isLoaded_ = true;
  }

  async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;

    this.initTextures_();
    const geometry = new SphereGeometry(this.gl_, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.numLatSegs_,
      heightSegments: this.numLonSegs_,
      isSkipTexture: false,
      attributes: {
        a_position: 0,
        a_texCoord: 0,
        a_normal: 0,
      },
    });
    const material = new ShaderMaterial(this.gl_, {
      uniforms: {
        u_nMatrix: <WebGLUniformLocation>null,
        u_pCamMatrix: <WebGLUniformLocation>null,
        u_mvMatrix: <WebGLUniformLocation>null,
        u_sampler: <WebGLUniformLocation>null,
        u_drawPosition: <WebGLUniformLocation>null,
        u_sunPos: <WebGLUniformLocation>null,
      },
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });
    this.mesh = new Mesh(this.gl_, geometry, material);
    this.initVao_();
    this.isLoaded_ = true;
  }

  update(simTime: Date, gmst: Ootk.GreenwichMeanSiderealTime) {
    if (!this.isLoaded_) return;
    // Calculate RAE
    this.rae_ = Ootk.Utils.MoonMath.getMoonPosition(simTime, <Degrees>0, <Degrees>0);

    // RAE2ECF and then ECF2ECI
    this.eci = Ootk.Transforms.ecf2eci(
      CoordinateTransforms.rae2ecf(<Degrees>(180 + this.rae_.az * RAD2DEG), <Degrees>(this.rae_.el * RAD2DEG), this.rae_.rng as Kilometers, <Radians>0, <Radians>0, <Kilometers>0),
      gmst
    );

    // If the ECI position is undefined, we cannot draw this moon.
    if (!this.eci.x || !this.eci.y || !this.eci.z) {
      console.warn('Moon position is undefined.');
      return;
    }

    const scaleFactor = this.SCALAR_DISTANCE / Math.max(Math.max(Math.abs(this.eci.x), Math.abs(this.eci.y)), Math.abs(this.eci.z));
    this.drawPosition[0] = this.eci.x * scaleFactor;
    this.drawPosition[1] = this.eci.y * scaleFactor;
    this.drawPosition[2] = this.eci.z * scaleFactor;

    this.mvMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.drawPosition);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private async initTextures_() {
    this.texture = this.gl_.createTexture();
    const img = new Image();
    img.src = `${settingsManager.installDirectory}textures/moon-1024.jpg`;
    await img.decode();
    GlUtils.bindImageToTexture(this.gl_, this.texture, img);
  }

  private initVao_() {
    const gl = this.gl_;
    // Make New Vertex Array Objects
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.geometry.combinedBuffer);
    gl.enableVertexAttribArray(this.mesh.geometry.attributes.a_position);
    gl.vertexAttribPointer(this.mesh.geometry.attributes.a_position, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    gl.enableVertexAttribArray(this.mesh.geometry.attributes.a_normal);
    gl.vertexAttribPointer(this.mesh.geometry.attributes.a_normal, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 3);

    gl.enableVertexAttribArray(this.mesh.geometry.attributes.a_texCoord);
    gl.vertexAttribPointer(this.mesh.geometry.attributes.a_texCoord, 2, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 6);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.index);

    gl.bindVertexArray(null);
  }

  private shaders_ = {
    frag: keepTrackApi.glsl`
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      uniform sampler2D u_sampler;
      uniform vec3 u_sunPos;

      in vec2 v_texcoord;
      in vec3 v_normal;
      in float v_dist;

      out vec4 fragColor;

      void main(void) {
          // sun is shining opposite of its direction from the center of the earth
          vec3 lightDirection = u_sunPos - vec3(0.0,0.0,0.0);

          // Normalize this to a max of 1.0
          lightDirection = normalize(lightDirection);

          // Smooth the light across the sphere
          float lightFrommoon = max(dot(v_normal, lightDirection), 0.0)  * 1.0;

          // Calculate the color by merging the texture with the light
          vec3 litTexColor = texture(u_sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFrommoon);

          // Don't draw the back of the sphere
          if (v_dist > 1.0) {
            discard;
          }

          fragColor = vec4(litTexColor, 1.0);
      }
      `,
    vert: keepTrackApi.glsl`
      uniform mat4 u_pCamMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;
      uniform float u_drawPosition;

      in vec3 a_position;
      in vec2 a_texCoord;
      in vec3 a_normal;

      out vec2 v_texcoord;
      out vec3 v_normal;
      out float v_dist;

      void main(void) {
          vec4 position = u_mvMatrix * vec4(a_position, 1.0);
          gl_Position = u_pCamMatrix * position;

          // Ratio of the vertex distance compared to the center of the sphere
          // This lets us figure out which verticies are on the back half
          v_dist = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ u_drawPosition;

          v_texcoord = a_texCoord;
          v_normal = u_nMatrix * a_normal;
      }
      `,
  };
}

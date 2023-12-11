/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
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
import { keepTrackApi } from '@app/js/keepTrackApi';
import { BufferAttribute } from '@app/js/static/buffer-attribute';
import { GLSL3 } from '@app/js/static/material';
import { Mesh } from '@app/js/static/mesh';
import { SatMath } from '@app/js/static/sat-math';
import { ShaderMaterial } from '@app/js/static/shader-material';
import { SphereGeometry } from '@app/js/static/sphere-geometry';
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
  private normalMatrix_ = mat3.create();

  /** The position of the sun in ECI coordinates. */
  eci: EciVec3;
  /** The mesh for the sun. */
  mesh: Mesh;
  /** The position of the sun in WebGL coordinates. */
  position = [0, 0, 0] as vec3;

  /**
   * This is run once per frame to render the sun.
   */
  draw(earthLightDirection: vec3, tgtBuffer: WebGLFramebuffer = null) {
    if (!this.isLoaded_) return;
    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setUniforms_(earthLightDirection);

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
      isSkipTexture: true,
      attributes: {
        position: new BufferAttribute({
          location: 0,
          vertices: 3,
          stride: Float32Array.BYTES_PER_ELEMENT * 6,
          offset: 0,
        }),
        normal: new BufferAttribute({
          location: 1,
          vertices: 3,
          stride: Float32Array.BYTES_PER_ELEMENT * 6,
          offset: Float32Array.BYTES_PER_ELEMENT * 3,
        }),
      },
    });
    const material = new ShaderMaterial(this.gl_, {
      uniforms: {
        lightDirection: <WebGLUniformLocation>null,
        sunDistance: <WebGLUniformLocation>null,
      },
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
      disabledAttributes: {
        uv: true,
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
    gl.uniform3fv(this.mesh.material.uniforms.lightDirection, earthLightDirection);
    gl.uniform1f(this.mesh.material.uniforms.sunDistance, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
  }

  /**
   * The shaders for the sun.
   *
   * NOTE: Keep these at the bottom of the file to ensure proper syntax highlighting.
   */
  private shaders_ = {
    frag: keepTrackApi.glsl`
        uniform vec3 lightDirection;

        in vec3 v_normal;
        in float v_dist2;

        out vec4 fragColor;

        void main(void) {
            // Hide the Back Side of the Sphere to prevent duplicate suns
            if (v_dist2 > 1.0) {
            discard;
            }

            float a = max(dot(v_normal, -lightDirection), 0.1);
            // Set colors
            float r = 1.0 * a;
            float g = 1.0 * a;
            float b = 0.9 * a;
            fragColor = vec4(vec3(r,g,b), a);
        }`,
    vert: keepTrackApi.glsl`
        uniform float sunDistance;

        out vec3 v_normal;
        out float v_dist2;

        void main(void) {
            vec4 worldPosition = modelViewMatrix * vec4(position / 1.6, 1.0);
            v_dist2 = distance(worldPosition.xyz,vec3(0.0,0.0,0.0)) / sunDistance;
            v_normal = normalMatrix * normal;

            gl_Position = projectionMatrix * worldPosition;
        }`,
  };
}

import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { FlatGeometry } from '@app/engine/rendering/flat-geometry';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { glsl } from '@app/engine/utils/development/formatter';
import { keepTrackApi } from '@app/keepTrackApi';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { Sun } from './sun';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

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

export class Godrays {
  mesh: Mesh;
  private sun_: Sun;
  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  /**
   * TODO: Verify we need a render buffer for godrays
   */
  renderBuffer: WebGLRenderbuffer;

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer: WebGLFramebuffer | null) {
    if (!this.isLoaded_ || settingsManager.isDisableGodrays) {
      return;
    }
    // Calculate sun position immediately before drawing godrays
    const screenPosition = this.getScreenCoords_(pMatrix, camMatrix);

    if (isNaN(screenPosition[0]) || isNaN(screenPosition[1])) {
      return;
    }

    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.depthMask(false);

    gl.uniform1i(this.mesh.material.uniforms.u_sampler, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);
    gl.uniform2f(this.mesh.material.uniforms.u_sunPosition, screenPosition[0], screenPosition[1]);
    gl.uniform2f(this.mesh.material.uniforms.u_resolution, gl.canvas.width, gl.canvas.height);

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    // Future writing needs to have a depth test
    gl.depthMask(true);
  }

  init(gl: WebGL2RenderingContext, sun: Sun): void {
    this.gl_ = gl;
    this.sun_ = sun;

    const geometry = new FlatGeometry(this.gl_, {
      attributes: {
        a_position: new BufferAttribute({
          location: 0,
          vertices: 2,
          offset: 0,
          stride: Float32Array.BYTES_PER_ELEMENT * 4,
        }),
        a_texCoord: new BufferAttribute({
          location: 1,
          vertices: 2,
          offset: Float32Array.BYTES_PER_ELEMENT * 2,
          stride: Float32Array.BYTES_PER_ELEMENT * 4,
        }),
      },
    });
    const material = new ShaderMaterial(this.gl_, {
      uniforms: {
        u_sunPosition: <WebGLUniformLocation><unknown>null,
        u_sampler: <WebGLUniformLocation><unknown>null,
        u_resolution: <WebGLUniformLocation><unknown>null,
      },
      map: gl.createTexture(),
      textureType: 'flat',
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh = new Mesh(this.gl_, geometry, material, {
      name: 'godrays',
      precision: 'highp',
      disabledUniforms: {
        modelMatrix: true,
        modelViewMatrix: true,
        projectionMatrix: true,
        viewMatrix: true,
        normalMatrix: true,
        cameraPosition: true,
        worldOffset: true,
      },
      disabledAttributes: {
        normal: true,
      },
    });
    this.mesh.geometry.initVao(this.mesh.program);
    this.initFrameBuffer_();

    this.isLoaded_ = true;
  }

  private getScreenCoords_(pMatrix: mat4, camMatrix: mat4): vec2 {
    const posVec4 = vec4.fromValues(this.sun_.position[0], this.sun_.position[1], this.sun_.position[2], 1);

    vec4.transformMat4(posVec4, posVec4, camMatrix);
    vec4.transformMat4(posVec4, posVec4, pMatrix);

    // In 0.0 to 1.0 space
    const screenPosition = <vec2>[posVec4[0] / posVec4[3], posVec4[1] / posVec4[3]];

    screenPosition[0] = (screenPosition[0] + 1) * 0.5; // * window.innerWidth;
    screenPosition[1] = (-screenPosition[1] + 1) * 0.5; // * window.innerHeight;

    return screenPosition;
  }

  private initFrameBuffer_(): void {
    const gl = this.gl_;

    keepTrackApi.getScene().frameBuffers.godrays = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, keepTrackApi.getScene().frameBuffers.godrays);

    this.renderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.mesh.material.map, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderBuffer);
  }

  /*
   * Instead of a large kernel, use a separable blur or multi-pass radial sampling.
   * Here, we use a wide radial sampling for godrays, which is much cheaper than a huge blur kernel.
   */
  private readonly shaders_ = {
    frag: glsl`
      uniform int u_samples;
      uniform float u_decay;
      uniform float u_exposure;
      uniform float u_density;
      uniform float u_weight;
      uniform sampler2D u_sampler;
      uniform vec2 u_sunPosition;
      uniform vec2 u_resolution;

      in vec2 v_texCoord;
      out vec4 fragColor;

      float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        int samples = 40;
        float decay = 0.95;
        float exposure = 0.2;
        float density = 1.0;
        float weight = 0.6;

        if (u_samples > 0) samples = u_samples;
        if (u_decay > 0.0) decay = u_decay;
        if (u_exposure > 0.0) exposure = u_exposure;
        if (u_density > 0.0) density = u_density;
        if (u_weight > 0.0) weight = u_weight;

        vec2 lightPositionOnScreen = vec2(u_sunPosition.x, 1.0 - u_sunPosition.y);
        vec2 texCoord = v_texCoord;

        vec2 deltaTexCoord = (texCoord - lightPositionOnScreen.xy);

        float dist = length(deltaTexCoord * vec2(u_resolution.x / u_resolution.y, 1.0));

        // Define sun radius in normalized screen space (now aspect-corrected)
        float sunRadius = 0.02;

        if (lightPositionOnScreen.x < 0.0 || lightPositionOnScreen.x > 1.0 ||
            lightPositionOnScreen.y < 0.0 || lightPositionOnScreen.y > 1.0 ||
            dist > 1.5) {
          fragColor = texture(u_sampler, v_texCoord);
          return;
        }

        float noise = 0.0;
        if (dist > sunRadius) {
          noise = rand(v_texCoord * u_resolution + float(gl_FragCoord.x + gl_FragCoord.y));
        }

        vec4 color = vec4(0.0);
        float illum = 1.0;

        float angle = rand(v_texCoord * 100.0 + gl_FragCoord.xy) * 6.2831853;
        float sinA = sin(angle) * 0.0002;
        float cosA = cos(angle) * 0.0002;
        vec2 randomOffset = vec2(cosA, sinA);

        vec2 step = (deltaTexCoord + randomOffset) * density / float(samples);

        texCoord -= step * noise;

        for(int i = 0; i < samples; i++) {
          texCoord -= step;

          if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
            break;
          }

          vec4 sampleColor = texture(u_sampler, texCoord);
          sampleColor *= illum * weight;
          color += sampleColor;
          illum *= decay;
        }

        vec4 scene = texture(u_sampler, v_texCoord);
        vec3 rays = 1.0 - exp(-color.rgb * exposure);

        float blendFactor = 0.7 + 0.3 * noise;
        vec3 blended = dist > sunRadius ? mix(scene.rgb + rays, rays, blendFactor) : scene.rgb + rays;

        fragColor = vec4(blended, 1.0);

        ${DepthManager.getLogDepthFragCode()}
      }
    `,
    vert: glsl`
      in vec2 a_position;
      in vec2 a_texCoord;

      uniform vec2 u_resolution;

      out vec2 v_texCoord;

      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace, 0, 1);
        v_texCoord = a_texCoord;

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}

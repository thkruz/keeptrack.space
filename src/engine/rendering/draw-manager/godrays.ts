import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { FlatGeometry } from '@app/engine/rendering/flat-geometry';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { keepTrackApi } from '@app/keepTrackApi';
import { mat4, vec2, vec4 } from 'gl-matrix';
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

    gl.uniform1i(this.mesh.material.uniforms.u_samples, settingsManager.godraysSamples ?? 32);
    gl.uniform1f(this.mesh.material.uniforms.u_decay, settingsManager.godraysDecay ?? 0.985);
    gl.uniform1f(this.mesh.material.uniforms.u_exposure, settingsManager.godraysExposure ?? 0.4);
    gl.uniform1f(this.mesh.material.uniforms.u_density, settingsManager.godraysDensity ?? 1.05);
    gl.uniform1f(this.mesh.material.uniforms.u_weight, settingsManager.godraysWeight ?? 0.075);
    gl.uniform1f(this.mesh.material.uniforms.u_illuminationDecay, settingsManager.godraysIlluminationDecay ?? 1.0);
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
        u_samples: <WebGLUniformLocation><unknown>null,
        u_sunPosition: <WebGLUniformLocation><unknown>null,
        u_sampler: <WebGLUniformLocation><unknown>null,
        u_resolution: <WebGLUniformLocation><unknown>null,
        u_decay: <WebGLUniformLocation><unknown>null,
        u_exposure: <WebGLUniformLocation><unknown>null,
        u_density: <WebGLUniformLocation><unknown>null,
        u_weight: <WebGLUniformLocation><unknown>null,
        u_illuminationDecay: <WebGLUniformLocation><unknown>null,
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

  private readonly shaders_ = {
    frag: keepTrackApi.glsl`
      uniform int u_samples;
      uniform float u_decay;
      uniform float u_exposure;
      uniform float u_density;
      uniform float u_weight;
      uniform float u_illuminationDecay;
      uniform sampler2D u_sampler;
      uniform vec2 u_sunPosition;
      uniform vec2 u_resolution;

      // the texCoords passed in from the vertex shader.
      in vec2 v_texCoord;
      out vec4 fragColor;

      // Gaussian blur function (3x3 kernel) with variable blur amount
      vec4 blur(sampler2D tex, vec2 uv, vec2 resolution, float blurScale) {
        // Account for aspect ratio to prevent stretching
        float aspectRatio = resolution.x / resolution.y;
        // Scale the blur size by blurScale
        vec2 blurSize = vec2(1.5 / resolution.x, 1.5 / resolution.y) * blurScale;
        vec4 sum = vec4(0.0);
        float totalWeight = 0.0;

        // 5x5 kernel for Gaussian blur
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
                vec2 offset = vec2(float(x) * blurSize.x, float(y) * blurSize.y);
                vec2 sampleCoord = clamp(uv + offset, 0.0, 1.0);
                float weight = exp(-dot(offset * vec2(1.0, aspectRatio), offset * vec2(1.0, aspectRatio)) * 0.5);
                sum += texture(tex, sampleCoord) * weight;
                totalWeight += weight;
            }
        }

        return sum / totalWeight;
      }

      void main() {
        // Use uniforms if provided, otherwise use defaults
        float decay = 0.983;
        float exposure = 0.4;
        float density = 1.8;
        float weight = 0.085;
        float illuminationDecay = 2.7;

        // Override with uniforms if set
        if (u_decay > 0.0) decay = u_decay;
        if (u_exposure > 0.0) exposure = u_exposure;
        if (u_density > 0.0) density = u_density;
        if (u_weight > 0.0) weight = u_weight;
        if (u_illuminationDecay > 0.0) illuminationDecay = u_illuminationDecay;

        vec2 lightPositionOnScreen = vec2(u_sunPosition.x, 1.0 - u_sunPosition.y);
        vec2 texCoord = v_texCoord;

        // Calculate vector from pixel to light source
        vec2 deltaTexCoord = (texCoord - lightPositionOnScreen.xy);

        // Distance from current pixel to light source (0 to sqrt(2))
        float dist = length(deltaTexCoord);

        // Early out: if the sun is offscreen or too far, skip effect
        if (lightPositionOnScreen.x < 0.0 || lightPositionOnScreen.x > 1.0 ||
            lightPositionOnScreen.y < 0.0 || lightPositionOnScreen.y > 1.0 ||
            dist > 1.5) {
          fragColor = texture(u_sampler, v_texCoord);
          return;
        }

        // Blur increases with distance, min 1.0, max 3.0 (tweak as needed)
        float blurScale = mix(1.0, 3.0, clamp(dist / 1.4142, 0.0, 1.0));

        deltaTexCoord *= 1.0 / float(u_samples) * density;

        // Initial blur
        vec4 color = blur(u_sampler, texCoord.xy, u_resolution, blurScale);

        // Early out: if initial blur is almost black, skip further computation
        if (color.a < 0.01 && color.r < 0.01 && color.g < 0.01 && color.b < 0.01) {
          fragColor = color;
          return;
        }

        for(int i = 0; i <= u_samples; i++) {
          texCoord -= deltaTexCoord;

          // Early out: if texCoord is out of bounds, break the loop
          if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
            break;
          }

          // Increase blur as we move away from the sun
          float sampleDist = length(texCoord - lightPositionOnScreen.xy);
          float sampleBlurScale = mix(1.0, 3.0, clamp(sampleDist / 1.4142, 0.0, 1.0));

          vec4 sampleColor = blur(u_sampler, texCoord, u_resolution, sampleBlurScale);

          // Early out: if sampleColor is almost black, skip further computation
          if (sampleColor.a < 0.01 && sampleColor.r < 0.01 && sampleColor.g < 0.01 && sampleColor.b < 0.01) {
            break;
          }

          sampleColor *= illuminationDecay * weight;
          // Accumulate the color
          color += sampleColor;
          // Update the illumination decay factor
          illuminationDecay *= decay;
        }
        vec4 scene = texture(u_sampler, v_texCoord);

        // Optional simple tone map for stability (prevents blowout):
        vec3 rays = 1.0 - exp(-color.rgb * exposure);

        // Additive compose the shafts over the scene
        fragColor = vec4(scene.rgb + rays, 1.0);

        // If you don’t want tone mapping yet, use this instead:
        // vec3 rays = color.rgb * exposure;
        // fragColor = vec4(min(scene.rgb + rays, 1.0), 1.0);
      }
    `,
    vert: keepTrackApi.glsl`
      in vec2 a_position;
      in vec2 a_texCoord;

      uniform vec2 u_resolution;

      out vec2 v_texCoord;

      void main() {
        // convert the rectangle from pixels to 0.0 to 1.0
        vec2 zeroToOne = a_position / u_resolution;

        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;

        // convert from 0->2 to -1->+1 (clipspace)
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace, 0, 1);

        // pass the texCoord to the fragment shader
        // The GPU will interpolate this value between points.
        v_texCoord = a_texCoord;
      }
    `,
  };
}

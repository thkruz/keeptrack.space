import { keepTrackApi } from '@app/js/keepTrackApi';
import { BufferAttribute } from '@app/js/static/buffer-attribute';
import { FlatGeometry } from '@app/js/static/flat-geometry';
import { GLSL3 } from '@app/js/static/material';
import { Mesh } from '@app/js/static/mesh';
import { ShaderMaterial } from '@app/js/static/shader-material';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { Sun } from './sun';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

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

export class Godrays {
  mesh: Mesh;
  private sun_: Sun;
  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  /**
   * TODO: Verify we need a render buffer for godrays
   */
  renderBuffer: WebGLRenderbuffer;

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer: WebGLFramebuffer) {
    if (!this.isLoaded_ || settingsManager.isDisableGodrays) return;
    // Calculate sun position immediately before drawing godrays
    const screenPosition = this.getScreenCoords_(pMatrix, camMatrix);
    if (isNaN(screenPosition[0]) || isNaN(screenPosition[1])) return;

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

  async init(gl: WebGL2RenderingContext, sun: Sun): Promise<void> {
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
        u_sunPosition: <WebGLUniformLocation>null,
        u_sampler: <WebGLUniformLocation>null,
        u_resolution: <WebGLUniformLocation>null,
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

  private shaders_ = {
    frag: keepTrackApi.glsl`
      uniform sampler2D u_sampler;
      uniform vec2 u_sunPosition;

      // the texCoords passed in from the vertex shader.
      in vec2 v_texCoord;

      out vec4 fragColor;

      void main() {
        float decay=1.0;
        float exposure=0.95;
        float density=0.99;
        float weight=0.035;
        float illuminationDecay = 1.0;
        vec2 lightPositionOnScreen = vec2(u_sunPosition.x,1.0 - u_sunPosition.y);
        vec2 texCoord = v_texCoord;

        /// samples will describe the rays quality, you can play with
        const int samples = 75;

        vec2 deltaTexCoord = (v_texCoord - lightPositionOnScreen.xy);
        deltaTexCoord *= 1.0 / float(samples) * density;
        vec4 color = texture(u_sampler, texCoord.xy);

        for(int i= 0; i <= samples ; i++)
        {
          // Calcualte the current sampling coord
          texCoord -= deltaTexCoord;
          // Sample the color from the texture at this texCoord
          vec4 newColor = texture(u_sampler, texCoord);

          // Apply the illumination decay factor
          newColor *= illuminationDecay * weight;

          // Accumulate the color
          color += newColor;

          // Update the illumination decay factor
          illuminationDecay *= decay;
        }
        color = color * exposure;

        // Mix the color with the original texture
        fragColor = mix(color, vec4(0.0,0.0,0.0,1.0), 0.5);
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

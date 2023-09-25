import { keepTrackApi } from '@app/js/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import { A } from '@app/js/lib/external/meuusjs';
import { CoordinateTransforms } from '@app/js/static/coordinate-transforms';
import { GlUtils } from '@app/js/static/gl-utils';
import { mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';
import * as Ootk from 'ootk';
import { Degrees, Kilometers, Radians } from 'ootk';
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

export class Sun {
  private readonly DRAW_RADIUS = 1500;
  private readonly NUM_LAT_SEGS = 32;
  private readonly NUM_LON_SEGS = 32;
  private readonly SCALAR_DISTANCE = 220000;

  private attribs_ = {
    a_position: 0,
    a_texCoord: 0,
    a_normal: 0,
  };

  private buffers_ = {
    vertCount: 0,
    combinedBuf: null as WebGLBuffer,
    vertIndexBuf: null as WebGLBuffer,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private positionModifier_ = [0, 0, 0];
  private program_: WebGLProgram;
  private sunvar_ = {
    jdo: 0,
    coord: {
      lat: 0,
      lng: 0,
      h: 0,
    },
    tp: {
      hz: {
        az: 0,
        alt: 0,
      },
    },
    azimuth: <Degrees>0,
    elevation: <Degrees>0,
    g: 0,
    R: 0,
    range: <Kilometers>0,
  };

  private uniforms_ = {
    u_nMatrix: <WebGLUniformLocation>null,
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_lightDir: <WebGLUniformLocation>null,
    u_sunDistance: <WebGLUniformLocation>null,
    u_sunPos: <WebGLUniformLocation>null,
    u_drawPosition: <WebGLUniformLocation>null,
  };

  private vao: WebGLVertexArrayObject;

  public drawPosition = [0, 0, 0] as vec3;
  public eci: Ootk.EciVec3;
  public godrays = {
    program: <WebGLProgram>null,
    attribs: {
      a_position: 0,
      a_texCoord: 0,
    },
    uniforms: {
      u_sunPosition: <WebGLUniformLocation>null,
      u_sampler: <WebGLUniformLocation>null,
      u_resolution: <WebGLUniformLocation>null,
    },
    vao: <WebGLVertexArrayObject>null,
    textureMap: {
      src: <string>null,
      texture: <WebGLTexture>null,
    },
    frameBuffer: <WebGLFramebuffer>null,
    renderBuffer: <WebGLRenderbuffer>null,
    buffers: {
      position: <WebGLBuffer>null,
      vertPosBuf: <WebGLBuffer>null,
      texCoordBuf: <WebGLBuffer>null,
    },
  };

  public screenPosition: vec2;

  public draw(earthLightDirection: vec3, pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_) return;
    const gl = this.gl_;

    gl.useProgram(this.program_);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform3fv(this.uniforms_.u_lightDir, earthLightDirection);
    gl.uniform1f(this.uniforms_.u_sunDistance, Math.sqrt(this.drawPosition[0] ** 2 + this.drawPosition[1] ** 2 + this.drawPosition[2] ** 2));

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  public drawGodrays(pMatrix: mat4, camMatrix: mat4, tgtBuffer: WebGLFramebuffer) {
    if (!this.isLoaded_) return;
    const gl = this.gl_;
    gl.useProgram(this.godrays.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.depthMask(false);

    gl.uniform1i(this.godrays.uniforms.u_sampler, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.godrays.textureMap.texture);

    // Calculate sun position immediately before drawing godrays
    this.screenPosition = this.getScreenCoords_(pMatrix, camMatrix);
    gl.uniform2f(this.godrays.uniforms.u_sunPosition, this.screenPosition[0], this.screenPosition[1]);
    gl.uniform2f(this.godrays.uniforms.u_resolution, gl.canvas.width, gl.canvas.height);

    gl.bindVertexArray(this.godrays.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Future writing needs to have a depth test
    gl.depthMask(true);
  }

  public async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;

    this.initProgram_();
    this.initBuffers_();
    this.initVao_();
    this.initGodrays();

    this.isLoaded_ = true;
  }

  public initGodrays() {
    this.initGodraysProgram_();
    this.initGodraysBuffers_();
    this.initGodraysVao_();
    this.initGodraysTextures_();
    this.initGodraysFrameBuffer_();
  }

  public initGodraysBuffers_() {
    const gl = this.gl_;
    this.godrays.buffers.vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.godrays.buffers.vertPosBuf);
    const x1 = 0;
    const x2 = 0 + gl.drawingBufferWidth;
    const y1 = 0;
    const y2 = 0 + gl.drawingBufferHeight;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);

    // provide texture coordinates for the rectangle.
    this.godrays.buffers.texCoordBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.godrays.buffers.texCoordBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);
  }

  public initGodraysProgram_() {
    this.godrays.program = GlUtils.createProgramFromCode(this.gl_, this.shaders_.godrays.vert, this.shaders_.godrays.frag);
    this.gl_.useProgram(this.godrays.program);
    GlUtils.assignAttributes(this.godrays.attribs, this.gl_, this.godrays.program, ['a_position', 'a_texCoord']);
    GlUtils.assignUniforms(this.godrays.uniforms, this.gl_, this.godrays.program, ['u_sunPosition', 'u_sampler', 'u_resolution']);
  }

  public initGodraysTextures_() {
    const gl = this.gl_;
    this.godrays.textureMap.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.godrays.textureMap.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  public initGodraysVao_() {
    const gl = this.gl_;
    this.godrays.vao = gl.createVertexArray();
    gl.bindVertexArray(this.godrays.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.godrays.buffers.vertPosBuf);
    gl.enableVertexAttribArray(this.godrays.attribs.a_position);
    gl.vertexAttribPointer(this.godrays.attribs.a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.godrays.buffers.texCoordBuf);
    gl.enableVertexAttribArray(this.godrays.attribs.a_texCoord);
    gl.vertexAttribPointer(this.godrays.attribs.a_texCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  public update(simTime: Date, gmst: Ootk.GreenwichMeanSiderealTime, j: number) {
    this.sunvar_.jdo = new A.JulianDay(j); // now
    this.sunvar_.coord = A.EclCoordfromWgs84(0, 0, 0);

    // AZ / EL Calculation
    // TODO: Figure out the correct type of this library
    const coords = {
      lat: this.sunvar_.coord.lat,
      lng: this.sunvar_.coord.lng,
      alt: this.sunvar_.coord.h,
      h: this.sunvar_.coord.h,
    };

    this.sunvar_.tp = <any>A.Solar.topocentricPosition(this.sunvar_.jdo, coords, false);
    this.sunvar_.azimuth = <Degrees>(this.sunvar_.tp.hz.az * RAD2DEG + (180 % 360));
    this.sunvar_.elevation = <Degrees>((this.sunvar_.tp.hz.alt * RAD2DEG) % 360);

    // Range Calculation
    const T = new A.JulianDay(A.JulianDay.dateToJD(simTime)).jdJ2000Century();
    this.sunvar_.g = (A.Solar.meanAnomaly(T) * 180) / Math.PI;
    this.sunvar_.g = this.sunvar_.g % 360.0;
    this.sunvar_.R = 1.00014 - 0.01671 * Math.cos(this.sunvar_.g) - 0.00014 * Math.cos(2 * this.sunvar_.g);
    this.sunvar_.range = <Kilometers>((this.sunvar_.R * 149597870700) / 1000); // au to km conversion

    // RAE to ECI
    this.eci = Ootk.Transforms.ecf2eci(CoordinateTransforms.rae2ecf(this.sunvar_.azimuth, this.sunvar_.elevation, this.sunvar_.range, <Radians>0, <Radians>0, <Kilometers>0), gmst);

    const sunMaxDist = Math.max(Math.max(Math.abs(this.eci.x), Math.abs(this.eci.y)), Math.abs(this.eci.z));
    this.drawPosition[0] = (this.eci.x / sunMaxDist) * this.SCALAR_DISTANCE + this.positionModifier_[0];
    this.drawPosition[1] = (this.eci.y / sunMaxDist) * this.SCALAR_DISTANCE + this.positionModifier_[1];
    this.drawPosition[2] = (this.eci.z / sunMaxDist) * this.SCALAR_DISTANCE + this.positionModifier_[2];

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.drawPosition);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private getScreenCoords_(pMatrix: mat4, camMatrix: mat4): vec2 {
    const posVec4 = vec4.fromValues(this.drawPosition[0], this.drawPosition[1], this.drawPosition[2], 1);

    vec4.transformMat4(posVec4, posVec4, camMatrix);
    vec4.transformMat4(posVec4, posVec4, pMatrix);

    // In 0.0 to 1.0 space
    const screenPosition = <vec2>[posVec4[0] / posVec4[3], posVec4[1] / posVec4[3]];

    screenPosition[0] = (screenPosition[0] + 1) * 0.5; // * window.innerWidth;
    screenPosition[1] = (-screenPosition[1] + 1) * 0.5; // * window.innerHeight;

    return screenPosition;
  }

  private initBuffers_() {
    const { combinedArray, vertIndex } = GlUtils.createSphere(this.DRAW_RADIUS, this.NUM_LAT_SEGS, this.NUM_LON_SEGS, true);
    this.buffers_.vertCount = vertIndex.length;

    this.buffers_.combinedBuf = GlUtils.createArrayBuffer(this.gl_, new Float32Array(combinedArray));
    this.buffers_.vertIndexBuf = GlUtils.createElementArrayBuffer(this.gl_, new Uint16Array(vertIndex));
  }

  private initGodraysFrameBuffer_(): void {
    const gl = this.gl_;
    this.godrays.frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.godrays.frameBuffer);

    this.godrays.renderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.godrays.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.godrays.textureMap.texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.godrays.renderBuffer);
  }

  private initProgram_() {
    this.program_ = GlUtils.createProgramFromCode(this.gl_, this.shaders_.sun.vert, this.shaders_.sun.frag);
    this.gl_.useProgram(this.program_);
    GlUtils.assignAttributes(this.attribs_, this.gl_, this.program_, ['a_position', 'a_normal']);
    GlUtils.assignUniforms(this.uniforms_, this.gl_, this.program_, ['u_pMatrix', 'u_camMatrix', 'u_mvMatrix', 'u_nMatrix', 'u_lightDir', 'u_sunDistance']);
  }

  private initVao_() {
    const gl = this.gl_;
    gl.useProgram(this.program_);
    // Make New Vertex Array Objects
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.combinedBuf);
    gl.enableVertexAttribArray(this.attribs_.a_position);
    gl.vertexAttribPointer(this.attribs_.a_position, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, 0);

    gl.enableVertexAttribArray(this.attribs_.a_normal);
    gl.vertexAttribPointer(this.attribs_.a_normal, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, Float32Array.BYTES_PER_ELEMENT * 3);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  private shaders_ = {
    sun: {
      frag: keepTrackApi.glsl`#version 300 es
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
      vert: keepTrackApi.glsl`#version 300 es
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
    },
    godrays: {
      frag: keepTrackApi.glsl`#version 300 es
      precision highp float;

      // our texture
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
      vert: keepTrackApi.glsl`#version 300 es
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
    },
  };
}

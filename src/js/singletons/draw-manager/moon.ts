import { RAD2DEG } from '@app/js/lib/constants';
import { mat3, mat4, vec3 } from 'gl-matrix';
import * as Ootk from 'ootk';
import { Degrees, Kilometers, Radians } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { CoordinateTransforms } from '../../static/coordinate-transforms';
import { GlUtils } from '../../static/gl-utils';

/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

export class Moon {
  private readonly DRAW_RADIUS = 2500;
  private numLatSegs_ = 16;
  private numLonSegs_ = 16;
  private readonly SCALAR_DISTANCE = 200000;

  public setSphereDetail(numLatSegs: number, numLonSegs: number) {
    this.numLatSegs_ = numLatSegs;
    this.numLonSegs_ = numLonSegs;
    this.initBuffers_();
  }

  private attribs_ = {
    a_position: 0,
    a_texCoord: 0,
    a_normal: 0,
  };

  private buffers_ = {
    vertCount: 0,
    combinedBuf: null as WebGLBuffer,
    texCoordBuf: null as WebGLBuffer,
    vertPosBuf: null as WebGLBuffer,
    vertNormBuf: null as WebGLBuffer,
    vertIndexBuf: null as WebGLBuffer,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private positionModifier_ = [0, 0, 0];
  private program_: WebGLProgram;
  private rae_: { az: Radians; el: Radians; rng: Kilometers; parallacticAngle: number };
  private shaders_ = {
    frag: keepTrackApi.glsl`#version 300 es
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
    vert: keepTrackApi.glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
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
          gl_Position = u_pMatrix * u_camMatrix * position;

          // Ratio of the vertex distance compared to the center of the sphere
          // This lets us figure out which verticies are on the back half
          v_dist = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ u_drawPosition;

          v_texcoord = a_texCoord;
          v_normal = u_nMatrix * a_normal;
      }
      `,
  };

  private textureMap_ = {
    src: <string>null,
    texture: <WebGLTexture>null,
  };

  private uniforms_ = {
    u_nMatrix: <WebGLUniformLocation>null,
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
    u_sampler: <WebGLUniformLocation>null,
    u_drawPosition: <WebGLUniformLocation>null,
    u_sunPos: <WebGLUniformLocation>null,
  };

  private vao: WebGLVertexArrayObject;

  public drawPosition = [0, 0, 0] as vec3;
  public eci: Ootk.EciVec3;

  public draw(sunPosition: vec3, pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_ || settingsManager.isDisableMoon) return;
    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set the uniforms
    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform3fv(this.uniforms_.u_sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform1f(this.uniforms_.u_drawPosition, Math.sqrt(this.drawPosition[0] ** 2 + this.drawPosition[1] ** 2 + this.drawPosition[2] ** 2));
    gl.uniform1i(this.uniforms_.u_sampler, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textureMap_.texture);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  public forceLoaded() {
    this.isLoaded_ = true;
  }

  public async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;
    this.textureMap_.src = `${settingsManager.installDirectory}textures/moon-1024.jpg`;

    this.initProgram_();
    this.initTextures_();
    this.initBuffers_();
    this.initVao_();
    this.isLoaded_ = true;
  }

  public update(simTime: Date, gmst: Ootk.GreenwichMeanSiderealTime) {
    if (!this.isLoaded_) return;
    // Calculate RAE
    this.rae_ = <any>Ootk.Utils.MoonMath.getMoonPosition(simTime, <Degrees>0, <Degrees>0);

    // RAE2ECF and then ECF2ECI
    this.eci = Ootk.Transforms.ecf2eci(
      CoordinateTransforms.rae2ecf(<Degrees>(180 + this.rae_.az * RAD2DEG), <Degrees>(this.rae_.el * RAD2DEG), this.rae_.rng, <Radians>0, <Radians>0, <Kilometers>0),
      gmst
    );

    // If the ECI position is undefined, we cannot draw this moon.
    if (!this.eci.x || !this.eci.y || !this.eci.z) {
      console.warn('Moon position is undefined.');
      return;
    }

    const scaleFactor = this.SCALAR_DISTANCE / Math.max(Math.max(Math.abs(this.eci.x), Math.abs(this.eci.y)), Math.abs(this.eci.z));
    this.drawPosition[0] = this.eci.x * scaleFactor + this.positionModifier_[0];
    this.drawPosition[1] = this.eci.y * scaleFactor + this.positionModifier_[1];
    this.drawPosition[2] = this.eci.z * scaleFactor + this.positionModifier_[2];

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.drawPosition);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private initBuffers_() {
    const { combinedArray, vertIndex } = GlUtils.createSphere(this.DRAW_RADIUS, this.numLatSegs_, this.numLonSegs_);
    this.buffers_.vertCount = vertIndex.length;
    this.buffers_.combinedBuf = GlUtils.createArrayBuffer(this.gl_, new Float32Array(combinedArray));
    this.buffers_.vertIndexBuf = GlUtils.createElementArrayBuffer(this.gl_, new Uint16Array(vertIndex));
  }

  private initProgram_() {
    const gl = this.gl_;
    this.program_ = GlUtils.createProgramFromCode(gl, this.shaders_.vert, this.shaders_.frag);
    this.gl_.useProgram(this.program_);

    // Assign Attributes
    GlUtils.assignAttributes(this.attribs_, gl, this.program_, ['a_position', 'a_normal', 'a_texCoord']);
    GlUtils.assignUniforms(this.uniforms_, gl, this.program_, ['u_pMatrix', 'u_camMatrix', 'u_mvMatrix', 'u_nMatrix', 'u_sunPos', 'u_drawPosition', 'u_sampler']);
  }

  private async initTextures_() {
    this.textureMap_.texture = this.gl_.createTexture();
    const img = new Image();
    img.src = this.textureMap_.src;
    await img.decode();
    GlUtils.bindImageToTexture(this.gl_, this.textureMap_.texture, img);
  }

  private initVao_() {
    const gl = this.gl_;
    // Make New Vertex Array Objects
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.combinedBuf);
    gl.enableVertexAttribArray(this.attribs_.a_position);
    gl.vertexAttribPointer(this.attribs_.a_position, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    gl.enableVertexAttribArray(this.attribs_.a_normal);
    gl.vertexAttribPointer(this.attribs_.a_normal, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 3);

    gl.enableVertexAttribArray(this.attribs_.a_texCoord);
    gl.vertexAttribPointer(this.attribs_.a_texCoord, 2, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 6);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }
}

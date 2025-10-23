import { Scene } from '@app/engine/core/scene';
import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { WebGlProgramHelper } from '@app/engine/rendering/webgl-program';
import { mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { BaseObject, EciVec3 } from '@ootk/src/main';
import { GlUtils } from '../gl-utils';
import { glsl } from '@app/engine/utils/development/formatter';

/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

export class Ellipsoid {
  private readonly attribs_ = {
    a_position: new BufferAttribute({
      location: 0,
      vertices: 3,
      offset: 0,
      stride: Float32Array.BYTES_PER_ELEMENT * 6,
    }),
    a_normal: new BufferAttribute({
      location: 1,
      vertices: 3,
      offset: Float32Array.BYTES_PER_ELEMENT * 3,
      stride: Float32Array.BYTES_PER_ELEMENT * 6,
    }),
  };

  private readonly buffers_ = {
    vertCount: 0,
    combinedBuf: null as unknown as WebGLBuffer,
    vertIndexBuf: null as unknown as WebGLBuffer,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private readonly nMatrix_ = mat3.create();
  private program_: WebGLProgram;
  private vao: WebGLVertexArrayObject;

  drawPosition = [0, 0, 0] as vec3;

  private readonly uniforms_ = {
    u_nMatrix: <WebGLUniformLocation><unknown>null,
    u_pMatrix: <WebGLUniformLocation><unknown>null,
    u_camMatrix: <WebGLUniformLocation><unknown>null,
    u_mvMatrix: <WebGLUniformLocation><unknown>null,
    u_color: <WebGLUniformLocation><unknown>null,
    worldShift: <WebGLUniformLocation><unknown>null,
  };

  private radii_: vec3;
  private color_ = [0.5, 0.5, 0.5, 0.5]; // Set color to gray with alpha

  constructor(radii: vec3) {
    this.radii_ = radii;
  }

  setRadii(gl: WebGL2RenderingContext, radii: vec3) {
    this.radii_ = radii;
    this.init(gl);
  }

  setDrawPosition(eci: EciVec3) {
    this.drawPosition[0] = eci.x;
    this.drawPosition[1] = eci.y;
    this.drawPosition[2] = eci.z;
  }

  setColor(color: vec4) {
    this.color_[0] = color[0];
    this.color_[1] = color[1];
    this.color_[2] = color[2];
    this.color_[3] = color[3];
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer = null as WebGLFramebuffer | null) {
    if (!this.isLoaded_ || !settingsManager.isDrawCovarianceEllipsoid) {
      return;
    }
    if (this.drawPosition[0] === 0 && this.drawPosition[1] === 0 && this.drawPosition[2] === 0) {
      return;
    }

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniform4fv(this.uniforms_.u_color, this.color_);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform3fv(this.uniforms_.worldShift, Scene.getInstance().worldShift);

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  forceLoaded() {
    this.isLoaded_ = true;
  }

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;

    if (!settingsManager.isDrawCovarianceEllipsoid) {
      return;
    }

    this.initProgram_();
    this.initBuffers_();
    this.initVao_();
    this.isLoaded_ = true;
  }

  update(obj: BaseObject) {
    if (!this.isLoaded_ || !settingsManager.isDrawCovarianceEllipsoid) {
      return;
    }
    if (!obj?.position) {
      this.drawPosition[0] = 0;
      this.drawPosition[1] = 0;
      this.drawPosition[2] = 0;

      return;
    }

    this.drawPosition[0] = obj.position.x;
    this.drawPosition[1] = obj.position.y;
    this.drawPosition[2] = obj.position.z;

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.drawPosition);

    const lookAtPos = [obj.position.x + obj.velocity.x, obj.position.y + obj.velocity.y, obj.position.z + obj.velocity.z];
    const up = vec3.normalize(vec3.create(), this.drawPosition);

    mat4.targetTo(this.mvMatrix_, this.drawPosition, lookAtPos, up);

    // Calculate normal matrix
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private initBuffers_() {
    const { combinedArray, vertIndex } = GlUtils.ellipsoidFromCovariance(this.radii_);

    this.buffers_.vertCount = vertIndex.length;
    this.buffers_.combinedBuf = GlUtils.createArrayBuffer(this.gl_, new Float32Array(combinedArray));
    this.buffers_.vertIndexBuf = GlUtils.createElementArrayBuffer(this.gl_, new Uint16Array(vertIndex));
  }

  private initProgram_() {
    const gl = this.gl_;

    this.program_ = new WebGlProgramHelper(gl, this.shaders_.vert, this.shaders_.frag).program;
    this.gl_.useProgram(this.program_);

    GlUtils.assignAttributes(this.attribs_, gl, this.program_, ['a_position', 'a_normal']);
    GlUtils.assignUniforms(this.uniforms_, gl, this.program_, ['u_pMatrix', 'u_camMatrix', 'u_mvMatrix', 'u_nMatrix', 'u_color', 'worldShift']);
  }

  private initVao_() {
    const gl = this.gl_;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.combinedBuf);
    gl.enableVertexAttribArray(this.attribs_.a_position.location);
    gl.vertexAttribPointer(this.attribs_.a_position.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, 0);

    gl.enableVertexAttribArray(this.attribs_.a_normal.location);
    gl.vertexAttribPointer(this.attribs_.a_normal.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, Float32Array.BYTES_PER_ELEMENT * 3);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  private shaders_ = {
    frag: glsl`#version 300 es
      precision mediump float;
      in vec3 v_normal;
      out vec4 fragColor;
      uniform vec4 u_color;

      void main(void) {
        float dummy = v_normal.x + v_normal.y + v_normal.z;
        fragColor = vec4(u_color.rgb * u_color.a, u_color.a);
      }
    `,
    vert: glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;
      uniform vec3 worldShift;

      in vec3 a_position;
      in vec3 a_normal;

      out vec3 v_normal;

      void main(void) {
        vec4 position = u_mvMatrix * vec4(a_position, 1.0);
        position.xyz += worldShift;
        gl_Position = u_pMatrix * u_camMatrix * position;
        v_normal = u_nMatrix * a_normal;
      }
    `,
  };
}

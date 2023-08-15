import { mat3, mat4 } from 'gl-matrix';
import * as Ootk from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { GlUtils } from '../../static/gl-utils';

/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

// ////////////////////////////////////////////////////////////////////////////
// TODO: This is a WIP for a radar dome. It is not currently used.
// ////////////////////////////////////////////////////////////////////////////

/* istanbul ignore file */

export class RadarDome {
  public id = 0;
  private attribs_ = {
    a_position: 0,
    a_normal: 0,
  };

  private buffers_ = {
    vertCount: 0,
    combinedBuf: null as WebGLBuffer,
    vertPosBuf: null as WebGLBuffer,
    vertNormBuf: null as WebGLBuffer,
    vertIndexBuf: null as WebGLBuffer,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private program_: WebGLProgram;
  private shaders_ = {
    frag: keepTrackApi.glsl`#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      in vec3 v_normal;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(1.0, 0.0, 0.0, 0.5);
      }
      `,
    vert: keepTrackApi.glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;

      in vec3 a_position;
      in vec3 a_normal;

      out vec3 v_normal;

      void main(void) {
          vec4 position = u_mvMatrix * vec4(a_position, 1.0);
          gl_Position = u_pMatrix * u_camMatrix * position;
          v_normal = u_nMatrix * a_normal;
      }
      `,
  };

  private uniforms_ = {
    u_nMatrix: <WebGLUniformLocation>null,
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
  };

  private vao: WebGLVertexArrayObject;

  public eci: Ootk.EciVec3;

  public draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_) return;

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set the uniforms
    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);

    // Enable alpha blending
    gl.enable(gl.BLEND);
    // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    gl.disable(gl.CULL_FACE);

    // Disable alpha blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.BLEND);
  }

  public forceLoaded() {
    this.isLoaded_ = true;
  }

  public async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;

    this.initProgram_();
    this.initBuffers_();
    this.initVao_();
    this.isLoaded_ = true;
  }

  public update() {
    if (!this.isLoaded_) return;

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, [0, 15000, 0]);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  vertexList: Float32Array = null;

  public updateVertexList(vertexList: Float32Array) {
    if (!this.isLoaded_) throw new Error('CustomMesh not loaded');

    if (this.vertexList.length !== vertexList.length) {
      this.vertexList = vertexList;
      this.initBuffers_();
    } else {
      const flatVerticies = vertexList;
      for (let i = 0; i < flatVerticies.length; i++) {
        this.vertexList[i] = flatVerticies[i];
      }
    }
  }

  private initBuffers_() {
    const { combinedArray, vertIndex } = GlUtils.createRadarDomeVertices(200, 5556, 3, 85, 347, 227);

    this.buffers_.vertCount = vertIndex.length;
    this.buffers_.combinedBuf = GlUtils.createArrayBuffer(this.gl_, new Float32Array(combinedArray));
    this.buffers_.vertIndexBuf = GlUtils.createElementArrayBuffer(this.gl_, new Uint16Array(vertIndex));
  }

  private initProgram_() {
    const gl = this.gl_;
    this.program_ = GlUtils.createProgramFromCode(gl, this.shaders_.vert, this.shaders_.frag);
    this.gl_.useProgram(this.program_);

    // Assign Attributes
    GlUtils.assignAttributes(this.attribs_, gl, this.program_, ['a_position', 'a_normal']);
    GlUtils.assignUniforms(this.uniforms_, gl, this.program_, ['u_pMatrix', 'u_camMatrix', 'u_mvMatrix', 'u_nMatrix']);
  }

  private initVao_() {
    const gl = this.gl_;
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
}

import { mat3, mat4 } from 'gl-matrix';
import * as Ootk from '@ootk/src/main';
import { BufferAttribute } from '../buffer-attribute';
import { GlUtils } from '../gl-utils';
import { WebGlProgramHelper } from '../webgl-program';

/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

export class CustomMesh {
  public id = 0;
  private attribs_ = {
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
    frag: glsl`#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      in vec3 v_normal;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(0.2, 0.0, 0.0, 0.7);
      }
      `,
    vert: glsl`#version 300 es
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
    u_nMatrix: null as unknown as WebGLUniformLocation,
    u_pMatrix: null as unknown as WebGLUniformLocation,
    u_camMatrix: null as unknown as WebGLUniformLocation,
    u_mvMatrix: null as unknown as WebGLUniformLocation,
  };

  private vao: WebGLVertexArrayObject;

  public eci: Ootk.EciVec3;

  public draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_) {
      return;
    }

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    // Set the uniforms
    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);

    gl.disable(gl.DEPTH_TEST); // Enable depth testing
    // gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    /*
     * Enable alpha blending
     * gl.enable(gl.BLEND);
     * gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
     */

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, this.buffers_.vertCount);
    gl.bindVertexArray(null);

    /*
     * Disable alpha blending
     * gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
     * gl.disable(gl.BLEND);
     */

    gl.enable(gl.DEPTH_TEST); // Enable depth testing
  }

  public forceLoaded() {
    this.isLoaded_ = true;
  }

  public async init(gl: WebGL2RenderingContext, vertexList: Float32Array): Promise<void> {
    this.gl_ = gl;
    this.vertexList = vertexList;

    this.initProgram_();
    this.initBuffers_();
    this.initVao_();
    this.isLoaded_ = true;
  }

  public update() {
    if (!this.isLoaded_) {
      return;
    }

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  vertexList: Float32Array = null;

  public updateVertexList(vertexList: Float32Array) {
    if (!this.isLoaded_) {
      throw new Error('CustomMesh not loaded');
    }

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
    const { combinedArray, vertIndex } = GlUtils.customMesh(this.vertexList);

    this.buffers_.vertCount = vertIndex.length;
    this.buffers_.combinedBuf = GlUtils.createArrayBuffer(this.gl_, new Float32Array(combinedArray));
    this.buffers_.vertIndexBuf = GlUtils.createElementArrayBuffer(this.gl_, new Uint16Array(vertIndex));
  }

  private initProgram_() {
    const gl = this.gl_;

    this.program_ = new WebGlProgramHelper(this.gl_, this.shaders_.vert, this.shaders_.frag, this.attribs_, this.uniforms_).program;
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
    gl.enableVertexAttribArray(this.attribs_.a_position.location);
    gl.vertexAttribPointer(this.attribs_.a_position.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, 0);

    gl.enableVertexAttribArray(this.attribs_.a_normal.location);
    gl.vertexAttribPointer(this.attribs_.a_normal.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, Float32Array.BYTES_PER_ELEMENT * 3);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }
}

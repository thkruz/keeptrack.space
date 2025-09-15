/* eslint-disable camelcase */
import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { WebGlProgramHelper } from '@app/engine/rendering/webgl-program';
import { mat4 } from 'gl-matrix';

export abstract class CustomMesh {
  id: number = 0;
  protected isLoaded_ = false;
  protected program_: WebGLProgram;
  protected vao_: WebGLVertexArrayObject;
  protected vertices_: Float32Array;
  protected indices_: Uint16Array;
  protected mvMatrix_: mat4;
  protected gl_: WebGL2RenderingContext;
  protected sortedIndices: number[] = [];
  protected readonly NUM_BUCKETS = 100; // Adjust based on your needs

  protected buffers_ = {
    vertCount: 0,
    combinedBuf: null as WebGLBuffer | null,
    vertPosBuf: null as WebGLBuffer | null,
    vertNormBuf: null as WebGLBuffer | null,
    vertIndexBuf: null as WebGLBuffer | null,
  };

  protected attribs_ = {
    a_position: new BufferAttribute({
      location: 0,
      vertices: 3,
      offset: 0,
    }),
  };

  protected uniforms_: {
    u_pMatrix: WebGLUniformLocation | null;
    u_camMatrix: WebGLUniformLocation | null;
    u_mvMatrix: WebGLUniformLocation | null;
  } = {
      u_pMatrix: null,
      u_camMatrix: null,
      u_mvMatrix: null,
    };

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;

    this.program_ = new WebGlProgramHelper(this.gl_, this.shaders_.vert, this.shaders_.frag, this.attribs_, this.uniforms_).program;
    this.initGeometry_();
    this.initBuffers_();
    this.initVao_();

    this.isLoaded_ = true;
  }

  protected initBuffers_() {
    const gl = this.gl_;

    this.buffers_.vertCount = this.indices_.length;
    this.buffers_.vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices_, gl.STATIC_DRAW);

    this.buffers_.vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices_, gl.STATIC_DRAW);
  }

  abstract initGeometry_(): void;

  protected initVao_() {
    const gl = this.gl_;

    this.vao_ = gl.createVertexArray();
    gl.bindVertexArray(this.vao_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.enableVertexAttribArray(this.attribs_.a_position.location);
    gl.vertexAttribPointer(this.attribs_.a_position.location, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  /**
   * An abstract object containing the vertex and fragment shader code.
   * This object is expected to have two properties:
   * - `vert`: A string representing the code for a vertex shader in GLSL (OpenGL Shading Language).
   * - `frag`: A string representing the code for a fragment shader in GLSL (OpenGL Shading Language).
   */
  abstract shaders_: {
    vert: string,
    frag: string
  };
}


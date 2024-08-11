/* eslint-disable camelcase */
import { keepTrackApi } from '@app/keepTrackApi';
import { BufferAttribute } from '@app/static/buffer-attribute';
import { WebGlProgramHelper } from '@app/static/webgl-program';
import { mat4, vec3 } from 'gl-matrix';

export abstract class CustomMesh {
  id: number = 0;
  protected isLoaded_: boolean = false;
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
    combinedBuf: null as WebGLBuffer,
    vertPosBuf: null as WebGLBuffer,
    vertNormBuf: null as WebGLBuffer,
    vertIndexBuf: null as WebGLBuffer,
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
    this.createMesh_();
    this.initBuffers_();
    this.initVao_();

    this.sortFacesByDistance(keepTrackApi.getMainCamera().getCamPos());

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

  protected sortFacesByDistance(camPos: vec3): void {
    const buckets: number[][] = Array(this.NUM_BUCKETS).fill(null).map(() => []);
    const faceCenters: vec3[] = [];

    // Pre-compute face centers
    for (let i = 0; i < this.indices_.length; i += 3) {
      const centerX = (this.vertices_[this.indices_[i] * 3] + this.vertices_[this.indices_[i + 1] * 3] + this.vertices_[this.indices_[i + 2] * 3]) / 3;
      const centerY = (this.vertices_[this.indices_[i] * 3 + 1] + this.vertices_[this.indices_[i + 1] * 3 + 1] + this.vertices_[this.indices_[i + 2] * 3 + 1]) / 3;
      const centerZ = (this.vertices_[this.indices_[i] * 3 + 2] + this.vertices_[this.indices_[i + 1] * 3 + 2] + this.vertices_[this.indices_[i + 2] * 3 + 2]) / 3;

      faceCenters.push(vec3.fromValues(centerX, centerY, centerZ));
    }

    // Find min and max distances
    let minDist = Infinity;
    let maxDist = -Infinity;

    faceCenters.forEach((center) => {
      const dist = vec3.squaredDistance(center, camPos);

      minDist = Math.min(minDist, dist);
      maxDist = Math.max(maxDist, dist);
    });

    // Distribute faces into buckets
    const bucketSize = (maxDist - minDist) / this.NUM_BUCKETS;

    for (let i = 0; i < this.indices_.length; i += 3) {
      const dist = vec3.squaredDistance(faceCenters[i / 3], camPos);
      const bucketIndex = Math.min(Math.floor((dist - minDist) / bucketSize), this.NUM_BUCKETS - 1);

      buckets[bucketIndex].push(this.indices_[i], this.indices_[i + 1], this.indices_[i + 2]);
    }

    // Concatenate buckets from far to near
    this.sortedIndices = buckets.reduceRight((acc, bucket) => acc.concat(bucket), []);
  }

  abstract createMesh_(): void;

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


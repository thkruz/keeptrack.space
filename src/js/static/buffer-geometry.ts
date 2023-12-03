import { mat4, vec3 } from 'gl-matrix';
import { v4 as uuidv4 } from 'uuid';
import { GlUtils } from './gl-utils';

export interface GeometryParams {
  type?: string;
  attributes?: Record<string, number>;
}

export class BufferGeometry {
  id: number;
  /**
   * Unique number for this {@link BufferGeometry | BufferGeometry} instance.
   * @remarks Expects a `Integer`
   */
  /**
   * {@link http://en.wikipedia.org/wiki/Universally_unique_identifier | UUID} of this object instance.
   * @remarks This gets automatically assigned and shouldn't be edited.
   */
  uuid: string;
  /**
   * A Read-only _string_ to check if `this` object type.
   * @remarks Sub-classes will update this value.
   * @defaultValue `BufferGeometry`
   */
  readonly type: string;

  /**
   * Allows for vertices to be re-used across multiple triangles; this is called using "indexed triangles".
   * Each triangle is associated with the indices of three vertices. This attribute therefore stores the index of each vertex for each triangular face.
   * If this attribute is not set, the {@link THREE.WebGLRenderer | renderer}  assumes that each three contiguous positions represent a single triangle.
   * @defaultValue `null`
   */
  index: WebGLBuffer;

  /**
   * Combination of geometry and uv buffers
   */
  combinedBuffer: WebGLBuffer;

  /**
   * The local model-view matrix for this object.
   */
  localMvMatrix = mat4.create();

  static id = -1;
  indexLength: number;
  attributes: Record<string, number> = {};
  gl: WebGL2RenderingContext;

  /**
   * Create a new instance of {@link BufferGeometry}
   */
  constructor({ attributes, type = 'BufferGeometry' }: GeometryParams = {}) {
    this.id = BufferGeometry.id++;
    this.uuid = uuidv4();
    this.type = type;
    this.setAttributes(attributes);
  }

  setCombinedBuffer(gl: WebGL2RenderingContext, array: number[]) {
    this.combinedBuffer = GlUtils.createArrayBuffer(gl, new Float32Array(array));
  }

  getCombinedBuffer() {
    return this.combinedBuffer;
  }

  setIndex(gl: WebGL2RenderingContext, array: number[]) {
    this.indexLength = array.length;
    this.index = GlUtils.createElementArrayBuffer(gl, new Uint16Array(array));
  }

  getIndex() {
    return this.index;
  }

  setAttribute(name: string, value: number) {
    this.attributes[name] = value;
  }

  setAttributes(attributes: any) {
    Object.keys(attributes).forEach((key) => {
      this.setAttribute(key, attributes[key]);
    });
  }

  rotateX(radians: number) {
    this.localMvMatrix = mat4.rotateX(this.localMvMatrix, this.localMvMatrix, radians);
  }

  rotateY(radians: number) {
    this.localMvMatrix = mat4.rotateY(this.localMvMatrix, this.localMvMatrix, radians);
  }

  rotateZ(radians: number) {
    this.localMvMatrix = mat4.rotateZ(this.localMvMatrix, this.localMvMatrix, radians);
  }

  translate(x: number, y: number, z: number) {
    this.localMvMatrix = mat4.translate(this.localMvMatrix, this.localMvMatrix, [x, y, z]);
  }

  scale(x: number, y: number, z: number) {
    this.localMvMatrix = mat4.scale(this.localMvMatrix, this.localMvMatrix, [x, y, z]);
  }

  /**
   * @deprecated
   * TODO: Fix this
   */
  lookAt(vector: vec3) {
    let up = vec3.fromValues(0, 0, 1);
    const center = vec3.fromValues(vector[0], vector[1], vector[2]);

    // Check if we are trying to aim up
    if (vector[0] === 0 && vector[1] === 0 && vector[2] > 0) {
      up = vec3.fromValues(0, 1, 0);
      mat4.lookAt(this.localMvMatrix, [0, 0, 0], vec3.fromValues(0, 0, 0), up);
    } else {
      mat4.lookAt(this.localMvMatrix, [0, 0, 0], center, up);
    }
  }
}

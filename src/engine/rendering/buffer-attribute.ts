export interface BufferAttributeParams {
  location: number;
  vertices: number;
  offset: number;
  stride?: number;
}

export class BufferAttribute {
  location: number;
  buffer: WebGLBuffer;
  vertices: number;
  offset: number;
  stride: number;
  constructor({ location, vertices, offset, stride = 0 }: BufferAttributeParams) {
    this.location = location;
    this.vertices = vertices;
    this.offset = offset;
    this.stride = stride;
  }

  setBuffer(buffer: WebGLBuffer) {
    this.buffer = buffer;
  }

  bindToArrayBuffer(gl: WebGL2RenderingContext) {
    gl.vertexAttribPointer(this.location, this.vertices, gl.FLOAT, false, this.stride, this.offset);
  }
}

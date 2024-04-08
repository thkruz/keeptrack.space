import { BufferGeometry, GeometryParams } from './buffer-geometry';

export class FlatGeometry extends BufferGeometry {
  /**
   * Some objects don't need texture mapping
   */
  isSkipTexture: boolean;
  constructor(gl: WebGL2RenderingContext, { attributes }: GeometryParams) {
    super({
      type: 'FlatGeometry',
      attributes,
    });
    this.gl = gl;

    this.calculateBuffers_();
  }

  /**
   * Generate a buffer for the geometry
   */
  private calculateBuffers_() {
    const gl = this.gl;

    const x1 = 0;
    const x2 = 0 + gl.drawingBufferWidth;
    const y1 = 0;
    const y2 = 0 + gl.drawingBufferHeight;
    const vertBuf = [x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2];
    const texCoordBuf = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1, 0.0, 1.0, 1.0];
    const combinedBuf = [];

    [0, 1, 2, 3, 4, 5].forEach((i) => {
      combinedBuf.push([vertBuf[i * 2], vertBuf[i * 2 + 1], texCoordBuf[i * 2], texCoordBuf[i * 2 + 1]]);
    });
    this.setCombinedBuffer(gl, combinedBuf.flat());
  }
}

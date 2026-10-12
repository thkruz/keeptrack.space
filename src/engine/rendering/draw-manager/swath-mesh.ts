/* eslint-disable camelcase */
import { CameraType } from '@app/engine/camera/camera-type';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { glsl } from '@app/engine/utils/development/formatter';
import { mat4 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { CustomMesh } from './custom-mesh';

/** Which strip a draw range belongs to: the nadir swath or the field of regard. */
export type SwathStripKind = 'nadir' | 'regard';

/** One triangle strip inside a {@link SwathMesh} vertex buffer. */
export interface SwathDrawRange {
  /** First vertex of the strip. */
  first: number;
  /** Vertex count (2 per sample: left, right). */
  count: number;
  kind: SwathStripKind;
  /** False for samples whose sub-point is below the minimum Sun elevation. */
  lit: boolean;
}

/** RGBA colours used by the swath layer. */
export interface SwathColors {
  nadir: [number, number, number, number];
  regard: [number, number, number, number];
  fan: [number, number, number, number];
}

/** Alpha multiplier for strips whose sub-point is in darkness. */
export const SWATH_UNLIT_ALPHA_SCALE = 0.4;

/**
 * Moves a WGS84 surface point onto the rendered globe, `liftKm` above it, writing into `out` at
 * `o`. The geometry is computed on the ellipsoid (true widths), but KeepTrack draws Earth as a
 * sphere of RADIUS_OF_EARTH, which sits up to 14 km above the ellipsoid at high latitude; a point
 * left on the ellipsoid would vanish under the textured globe there. The point keeps its
 * geocentric direction, so its latitude/longitude on the drawn globe are unchanged.
 */
export const liftSurfacePoint = (x: number, y: number, z: number, liftKm: number, out: Float32Array | Float64Array, o: number): void => {
  const scale = (RADIUS_OF_EARTH + liftKm) / Math.sqrt(x * x + y * y + z * z);

  out[o] = x * scale;
  out[o + 1] = y * scale;
  out[o + 2] = z * scale;
};

/**
 * Static ground-swath ribbon: Earth-fixed (ECEF) triangle strips, built on demand by
 * {@link SwathMeshFactory} and rotated to the inertial render frame by the current GMST in
 * the vertex shader, so the per-frame cost is one uniform upload and the draw calls.
 * Hidden in flat-map mode.
 */
export class SwathMesh extends CustomMesh {
  /** Uint16 index space caps a mesh at 65k vertices; the plan keeps each well under it. */
  static readonly MAX_VERTICES = 32000;

  uniforms_ = {
    u_pMatrix: null as unknown as WebGLUniformLocation,
    u_camMatrix: null as unknown as WebGLUniformLocation,
    u_mvMatrix: null as unknown as WebGLUniformLocation,
    u_color: null as unknown as WebGLUniformLocation,
    u_rot: null as unknown as WebGLUniformLocation,
    u_worldShift: null as unknown as WebGLUniformLocation,
    logDepthBufFC: null as unknown as WebGLUniformLocation,
  };

  /** Draw ranges, in draw order (field of regard before nadir so nadir sits on top). */
  ranges: SwathDrawRange[] = [];
  /** Vertices currently held in the GPU buffer. */
  vertexCount = 0;
  colors: SwathColors;

  private capacity_ = 0;
  private readonly color_ = new Float32Array(4);
  private static readonly IDENTITY_MATRIX_ = mat4.create();

  constructor(colors: SwathColors) {
    super();
    this.colors = colors;
  }

  initGeometry_(): void {
    this.vertices_ = new Float32Array(0);
    this.indices_ = new Uint16Array(0);
  }

  protected initBuffers_(): void {
    const gl = this.gl_;

    this.buffers_.vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices_, gl.STATIC_DRAW);
  }

  protected initVao_(): void {
    const gl = this.gl_;

    this.vao_ = gl.createVertexArray();
    gl.bindVertexArray(this.vao_);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.enableVertexAttribArray(this.attribs_.a_position.location);
    gl.vertexAttribPointer(this.attribs_.a_position.location, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /** CPU copy of the uploaded vertices (ECEF km, 3 per vertex). */
  get vertices(): Float32Array {
    return this.vertices_;
  }

  /**
   * Replace the ribbon. `vertices` holds `vertexCount` ECEF positions; the mesh keeps its own
   * copy and only reallocates the GPU buffer when the new geometry outgrows it.
   */
  setGeometry(vertices: Float32Array, vertexCount: number, ranges: SwathDrawRange[]): void {
    if (vertexCount > SwathMesh.MAX_VERTICES) {
      throw new Error(`SwathMesh holds at most ${SwathMesh.MAX_VERTICES} vertices`);
    }
    const floats = vertexCount * 3;
    const gl = this.gl_;

    if (floats > this.capacity_) {
      this.vertices_ = new Float32Array(floats);
      this.capacity_ = floats;
      this.vertices_.set(vertices.subarray(0, floats));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices_, gl.STATIC_DRAW);
    } else {
      this.vertices_.set(vertices.subarray(0, floats));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices_, 0, floats);
    }
    this.vertexCount = vertexCount;
    this.ranges = ranges;
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer): void {
    if (!this.isLoaded_ || this.vertexCount === 0 || ServiceLocator.getMainCamera().cameraType === CameraType.FLAT_MAP) {
      return;
    }
    const gl = this.gl_;
    const gmst = ServiceLocator.getTimeManager().gmst;
    const worldShift = Scene.getInstance().worldShift;

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, SwathMesh.IDENTITY_MATRIX_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform2f(this.uniforms_.u_rot, Math.cos(gmst), Math.sin(gmst));
    gl.uniform3f(this.uniforms_.u_worldShift, worldShift[0], worldShift[1], worldShift[2]);
    gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1.0, -1.0);

    gl.bindVertexArray(this.vao_);
    for (const range of this.ranges) {
      const base = range.kind === 'nadir' ? this.colors.nadir : this.colors.regard;
      const color = this.color_;

      color[0] = base[0];
      color[1] = base[1];
      color[2] = base[2];
      color[3] = range.lit ? base[3] : base[3] * SWATH_UNLIT_ALPHA_SCALE;
      gl.uniform4fv(this.uniforms_.u_color, color);
      gl.drawArrays(gl.TRIANGLE_STRIP, range.first, range.count);
    }
    gl.bindVertexArray(null);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  shaders_ = {
    frag: glsl`#version 300 es
      precision highp float;

      uniform vec4 u_color;

      out vec4 fragColor;

      void main(void) {
        fragColor = u_color;
      }
    `,
    vert: glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform float logDepthBufFC;
      // (cos gmst, sin gmst): rotates the Earth-fixed ribbon into the inertial render frame.
      uniform vec2 u_rot;
      uniform vec3 u_worldShift;

      in vec3 a_position;

      void main(void) {
        vec3 eci = vec3(
          a_position.x * u_rot.x - a_position.y * u_rot.y,
          a_position.x * u_rot.y + a_position.y * u_rot.x,
          a_position.z
        );
        vec4 worldPosition = u_mvMatrix * vec4(eci + u_worldShift, 1.0);

        gl_Position = u_pMatrix * u_camMatrix * worldPosition;

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}

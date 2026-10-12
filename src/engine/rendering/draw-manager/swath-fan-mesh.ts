/* eslint-disable camelcase */
import { CameraType } from '@app/engine/camera/camera-type';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { glsl } from '@app/engine/utils/development/formatter';
import { crossTrackEdgesInto } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { CustomMesh } from './custom-mesh';
import { liftSurfacePoint } from './swath-mesh';

/** Earth's sidereal rotation rate (rad/s). */
const EARTH_ROTATION_RAD_PER_SEC_ = 7.2921159e-5;

/**
 * Instantaneous imaging fan: one triangle from the satellite to the two nadir-swath edges,
 * recomputed every frame from the dot position and velocity with no allocation (same
 * world-shifted float64 path as ConeMesh). Hidden in flat-map mode.
 */
export class SwathFanMesh extends CustomMesh {
  uniforms_ = {
    u_pMatrix: null as unknown as WebGLUniformLocation,
    u_camMatrix: null as unknown as WebGLUniformLocation,
    u_mvMatrix: null as unknown as WebGLUniformLocation,
    u_color: null as unknown as WebGLUniformLocation,
    logDepthBufFC: null as unknown as WebGLUniformLocation,
  };

  /** Catalog id of the satellite the fan follows. */
  objId: number;
  /** Nadir half-angle (rad). */
  halfAngleRad: number;
  liftKm: number;
  color: [number, number, number, number];
  /** False until update() has produced a valid triangle. */
  isValid = false;

  private readonly edges_ = new Float64Array(6);
  private static readonly IDENTITY_MATRIX_ = mat4.create();

  constructor(objId: number, halfAngleRad: number, liftKm: number, color: [number, number, number, number]) {
    super();
    this.objId = objId;
    this.halfAngleRad = halfAngleRad;
    this.liftKm = liftKm;
    this.color = color;
  }

  /** The 9-float vertex array (satellite, left edge, right edge), reused every frame. */
  get vertices(): Float32Array {
    return this.vertices_;
  }

  initGeometry_(): void {
    this.vertices_ = new Float32Array(9);
    this.indices_ = new Uint16Array([0, 1, 2]);
  }

  protected initBuffers_(): void {
    const gl = this.gl_;

    this.buffers_.vertCount = 3;
    this.buffers_.vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices_, gl.DYNAMIC_DRAW);
    this.buffers_.vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices_, gl.STATIC_DRAW);
  }

  update(): void {
    this.isValid = false;
    if (!this.isLoaded_) {
      return;
    }
    const dotsManager = ServiceLocator.getDotsManager();
    const pos = dotsManager?.positionData;
    const vel = dotsManager?.velocityData;
    const i3 = this.objId * 3;

    if (!pos || !vel || i3 + 2 >= pos.length || i3 + 2 >= vel.length) {
      return;
    }
    const rx = pos[i3];
    const ry = pos[i3 + 1];
    const rz = pos[i3 + 2];

    if (rx === 0 && ry === 0 && rz === 0) {
      return;
    }
    /*
     * The ribbon is built from Earth-fixed velocity, so use the velocity relative to the
     * rotating Earth here too: v_rel = v - w x r with w = (0, 0, omega). The ellipsoid is
     * symmetric about z, so the geometry is identical in TEME.
     */
    const vx = vel[i3] + EARTH_ROTATION_RAD_PER_SEC_ * ry;
    const vy = vel[i3 + 1] - EARTH_ROTATION_RAD_PER_SEC_ * rx;
    const vz = vel[i3 + 2];
    const edges = this.edges_;

    if (crossTrackEdgesInto(rx, ry, rz, vx, vy, vz, this.halfAngleRad, edges) === -1) {
      return;
    }
    const shift = Scene.getInstance().worldShift;
    const v = this.vertices_;

    v[0] = rx + shift[0];
    v[1] = ry + shift[1];
    v[2] = rz + shift[2];
    liftSurfacePoint(edges[0], edges[1], edges[2], this.liftKm, edges, 0);
    liftSurfacePoint(edges[3], edges[4], edges[5], this.liftKm, edges, 3);
    v[3] = edges[0] + shift[0];
    v[4] = edges[1] + shift[1];
    v[5] = edges[2] + shift[2];
    v[6] = edges[3] + shift[0];
    v[7] = edges[4] + shift[1];
    v[8] = edges[5] + shift[2];

    const gl = this.gl_;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, v);
    this.isValid = true;
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer): void {
    if (!this.isLoaded_ || !this.isValid || ServiceLocator.getMainCamera().cameraType === CameraType.FLAT_MAP) {
      return;
    }
    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, SwathFanMesh.IDENTITY_MATRIX_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform4fv(this.uniforms_.u_color, this.color);
    gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);

    gl.bindVertexArray(this.vao_);
    gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
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

      in vec3 a_position;

      void main(void) {
        gl_Position = u_pMatrix * u_camMatrix * u_mvMatrix * vec4(a_position, 1.0);

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}

/* eslint-disable camelcase */
import { CameraType } from '@app/engine/camera/camera-type';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { glsl } from '@app/engine/utils/development/formatter';
import { BaseObject, Degrees, Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { CustomMesh } from './custom-mesh';

export interface ConeSettings {
  /** The field of view of the cone in degrees, default is 3 */
  fieldOfView: Degrees;
  /** The color of the cone, default is [0.2, 1.0, 1.0, 1.0] */
  color?: [number, number, number, number];
  /**
   * @deprecated
   * The range of the cone in kilometers, default is the distance to Earth from the attachmentPoint
   * This is not implemented yet
   */
  range?: Kilometers;
  /** When set, the cone points toward this target satellite instead of Earth center */
  targetObj?: BaseObject;
}

export class ConeMesh extends CustomMesh {
  private static readonly N_PHI_ = 100;

  uniforms_ = {
    u_pMatrix: null as unknown as WebGLUniformLocation,
    u_camMatrix: null as unknown as WebGLUniformLocation,
    u_mvMatrix: null as unknown as WebGLUniformLocation,
    u_color: null as unknown as WebGLUniformLocation,
    logDepthBufFC: null as unknown as WebGLUniformLocation,
    u_flatMapMode: null as unknown as WebGLUniformLocation,
    u_gmst: null as unknown as WebGLUniformLocation,
    u_earthRadius: null as unknown as WebGLUniformLocation,
    u_meshRefFlatX: null as unknown as WebGLUniformLocation,
  };
  private static readonly IDENTITY_MATRIX_ = mat4.create();
  /** The angle of the cone mesh. Tied to the object's FOV */
  fieldOfView: number;
  color: [number, number, number, number] = [0.2, 1.0, 1.0, 1.0];
  range: Kilometers = 0 as Kilometers;
  pos: vec3 = vec3.create();
  offsetDistance: number = (RADIUS_OF_EARTH + settingsManager.coneDistanceFromEarth) as Kilometers;
  obj: BaseObject;
  targetObj: BaseObject | null = null;


  constructor(obj: BaseObject, settings: ConeSettings) {
    super();
    this.obj = obj;
    this.fieldOfView = settings.fieldOfView;
    this.color = settings.color || this.color;
    this.range = settings.range || this.range;
    this.targetObj = settings.targetObj ?? null;

    this.updatePosition_();
  }

  editSettings(settings: ConeSettings) {
    this.fieldOfView = settings.fieldOfView;
    this.color = settings.color || this.color;
    this.range = settings.range || this.range;
    this.targetObj = settings.targetObj ?? this.targetObj;
  }

  private updatePosition_(): boolean {
    const positionData = ServiceLocator.getDotsManager()?.positionData;
    const idx = Number(this.obj.id) * 3;

    // positionData is nulled during catalog swap; resume on next cruncher message
    if (!positionData || idx + 2 >= positionData.length) {
      return false;
    }

    this.pos = vec3.fromValues(positionData[idx], positionData[idx + 1], positionData[idx + 2]);

    return true;
  }

  /**
   * Computes cone vertex positions directly in world-shifted coordinates using
   * float64 JS math, then uploads to the GPU. This avoids the accumulated float32
   * precision loss that occurs when using a translate*rotate*scale mvMatrix chain —
   * which caused visible jitter in FIXED_TO_SAT mode, especially for distant satellites
   * where the scale factor (coneHeight) is very large.
   */
  update() {
    if (!this.isLoaded_) {
      return;
    }

    if (!this.updatePosition_()) {
      return;
    }

    if (this.targetObj) {
      if (!this.updateSatToSat_()) {
        return;
      }
    } else {
      this.updateEarthCenter_();
    }

    // Upload updated positions to GPU
    const gl = this.gl_;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices_);
  }

  private updateEarthCenter_() {
    const worldShift = Scene.getInstance().worldShift;
    const isFlatMap = ServiceLocator.getMainCamera().cameraType === CameraType.FLAT_MAP;

    // All intermediate math uses float64 (regular JS numbers)
    const px = this.pos[0];
    const py = this.pos[1];
    const pz = this.pos[2];

    const satDistance = Math.sqrt(px * px + py * py + pz * pz);

    // Normalized satellite direction
    const dx = px / satDistance;
    const dy = py / satDistance;
    const dz = pz / satDistance;

    // Apex = satellite position + worldShift (float64 subtraction of large values)
    this.vertices_[0] = px + worldShift[0];
    this.vertices_[1] = py + worldShift[1];
    this.vertices_[2] = pz + worldShift[2];

    if (isFlatMap) {
      // Place base vertices on a spherical cap on the Earth's surface.
      // The angular radius rho is set directly so the footprint scales
      // linearly with satDistance * tan(FOV), avoiding arctan compression
      // that makes GEO cones appear too small for larger FOV angles.
      const fovRad = this.fieldOfView * Math.PI / 180;
      const maxAngle = 80 * Math.PI / 180;
      const rho = Math.min(satDistance * Math.tan(fovRad) / RADIUS_OF_EARTH, maxAngle);

      const cosRho = Math.cos(rho);
      const sinRho = Math.sin(rho);
      const baseCX = dx * RADIUS_OF_EARTH * cosRho + worldShift[0];
      const baseCY = dy * RADIUS_OF_EARTH * cosRho + worldShift[1];
      const baseCZ = dz * RADIUS_OF_EARTH * cosRho + worldShift[2];
      const baseRadius = RADIUS_OF_EARTH * sinRho;

      this.computeBaseCircle_(dx, dy, dz, baseCX, baseCY, baseCZ, baseRadius);
    } else {
      const coneHeight = satDistance - this.offsetDistance;
      const baseCX = dx * this.offsetDistance + worldShift[0];
      const baseCY = dy * this.offsetDistance + worldShift[1];
      const baseCZ = dz * this.offsetDistance + worldShift[2];
      const baseRadius = coneHeight * Math.tan((this.fieldOfView * Math.PI) / 180);

      this.computeBaseCircle_(dx, dy, dz, baseCX, baseCY, baseCZ, baseRadius);
    }
  }

  private updateSatToSat_(): boolean {
    const worldShift = Scene.getInstance().worldShift;
    const positionData = ServiceLocator.getDotsManager()?.positionData;
    const tIdx = Number(this.targetObj!.id) * 3;

    if (!positionData || tIdx + 2 >= positionData.length) {
      return false;
    }

    // Target position from position buffer
    const tx = positionData[tIdx];
    const ty = positionData[tIdx + 1];
    const tz = positionData[tIdx + 2];

    const px = this.pos[0];
    const py = this.pos[1];
    const pz = this.pos[2];

    // Direction from source to target
    const dirX = tx - px;
    const dirY = ty - py;
    const dirZ = tz - pz;
    const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

    if (dist < 1) {
      return false;
    }

    const dx = dirX / dist;
    const dy = dirY / dist;
    const dz = dirZ / dist;

    // Apex = source satellite position + worldShift
    this.vertices_[0] = px + worldShift[0];
    this.vertices_[1] = py + worldShift[1];
    this.vertices_[2] = pz + worldShift[2];

    // Base center = target satellite position + worldShift
    const baseCX = tx + worldShift[0];
    const baseCY = ty + worldShift[1];
    const baseCZ = tz + worldShift[2];

    // Base circle radius from FOV angle and inter-satellite distance
    const baseRadius = dist * Math.tan((this.fieldOfView * Math.PI) / 180);

    this.computeBaseCircle_(dx, dy, dz, baseCX, baseCY, baseCZ, baseRadius);

    return true;
  }

  private computeBaseCircle_(dx: number, dy: number, dz: number, baseCX: number, baseCY: number, baseCZ: number, baseRadius: number) {
    // Build orthonormal basis perpendicular to the direction
    // Pick a reference vector not parallel to d
    let refX = 0;
    let refY = 1;
    let refZ = 0;

    if (Math.abs(dy) > 0.9) {
      refX = 1;
      refY = 0;
      refZ = 0;
    }

    // u = normalize(cross(d, ref))
    let ux = dy * refZ - dz * refY;
    let uy = dz * refX - dx * refZ;
    let uz = dx * refY - dy * refX;
    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);

    ux /= uLen;
    uy /= uLen;
    uz /= uLen;

    // v = cross(d, u)
    const vx = dy * uz - dz * uy;
    const vy = dz * ux - dx * uz;
    const vz = dx * uy - dy * ux;

    // Base circle vertices
    const nPhi = ConeMesh.N_PHI_;
    const dPhi = (2 * Math.PI) / nPhi;

    for (let i = 0; i <= nPhi; i++) {
      const phi = i * dPhi;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const idx = (i + 1) * 3;

      this.vertices_[idx] = baseCX + baseRadius * (cosPhi * ux + sinPhi * vx);
      this.vertices_[idx + 1] = baseCY + baseRadius * (cosPhi * uy + sinPhi * vy);
      this.vertices_[idx + 2] = baseCZ + baseRadius * (cosPhi * uz + sinPhi * vz);
    }
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_) {
      return;
    }

    const { gl } = ServiceLocator.getRenderer();

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    const isFlatMap = ServiceLocator.getMainCamera().cameraType === CameraType.FLAT_MAP;

    // Set the uniforms — u_mvMatrix is identity because vertex positions are
    // pre-computed in world-shifted coordinates on the CPU (see update())
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, ConeMesh.IDENTITY_MATRIX_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);
    gl.uniform4fv(this.uniforms_.u_color, this.color);

    gl.uniform1i(this.uniforms_.u_flatMapMode, isFlatMap ? 1 : 0);
    if (isFlatMap) {
      const gmst = ServiceLocator.getTimeManager().gmst;
      const meshLon = Math.atan2(this.pos[1], this.pos[0]) - gmst;
      const mapW = 2 * Math.PI * RADIUS_OF_EARTH;
      const camCenterX = ServiceLocator.getMainCamera().flatMapPanX;
      const d = meshLon * RADIUS_OF_EARTH - camCenterX + mapW / 2;
      const meshRefFlatX = camCenterX + ((d % mapW) + mapW) % mapW - mapW / 2;

      gl.uniform1f(this.uniforms_.u_meshRefFlatX, meshRefFlatX);
      gl.uniform1f(this.uniforms_.u_gmst, gmst);
      gl.uniform1f(this.uniforms_.u_earthRadius, RADIUS_OF_EARTH);
      gl.uniform1f(this.uniforms_.logDepthBufFC, 0.0);
    } else {
      gl.uniform1f(this.uniforms_.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false); // Disable depth writing

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1.0, -1.0);

    gl.bindVertexArray(this.vao_);

    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.depthMask(true); // Re-enable depth writing
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  initGeometry_() {
    const nPhi = ConeMesh.N_PHI_;

    // Allocate vertex array — positions are computed each frame in update()
    // 1 apex + (nPhi+1) base vertices, 3 components each
    this.vertices_ = new Float32Array((1 + nPhi + 1) * 3);

    // Indices are static: nPhi triangles from apex to base
    const indices: number[] = [];

    for (let i = 0; i < nPhi; i++) {
      indices.push(0, i + 1, i + 2);
    }

    this.indices_ = new Uint16Array(indices);
  }

  protected initBuffers_() {
    const gl = this.gl_;

    this.buffers_.vertCount = this.indices_.length;

    // DYNAMIC_DRAW because vertex positions are updated every frame
    this.buffers_.vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices_, gl.DYNAMIC_DRAW);

    this.buffers_.vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices_, gl.STATIC_DRAW);
  }

  shaders_ = {
    frag: glsl`#version 300 es
      precision highp float;

      uniform vec4 u_color;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(u_color.rgba);
      }
    `,
    vert: glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform float logDepthBufFC;
      uniform bool u_flatMapMode;
      uniform float u_gmst;
      uniform float u_earthRadius;
      uniform float u_meshRefFlatX;

      in vec3 a_position;

      void main(void) {
        vec4 worldPosition = u_mvMatrix * vec4(a_position, 1.0);

        if (u_flatMapMode) {
          float PI = 3.14159265359;
          vec3 eciPos = worldPosition.xyz;
          float eciDist = length(eciPos);
          float lon = atan(eciPos.y, eciPos.x) - u_gmst;
          float lat = atan(eciPos.z, length(eciPos.xy));
          float alt = eciDist - u_earthRadius;

          // Wrap X relative to mesh center to keep all mesh vertices contiguous
          float mapW = 2.0 * PI * u_earthRadius;
          float flatX = lon * u_earthRadius;
          flatX = u_meshRefFlatX + mod(flatX - u_meshRefFlatX + mapW * 0.5, mapW) - mapW * 0.5;

          vec3 flatPos = vec3(flatX, lat * u_earthRadius, alt * 0.001);
          gl_Position = u_pMatrix * u_camMatrix * vec4(flatPos, 1.0);
        } else {
          gl_Position = u_pMatrix * u_camMatrix * worldPosition;
        }

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}

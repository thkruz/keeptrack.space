/* eslint-disable camelcase */
import { CameraType } from '@app/engine/camera/camera-type';
import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { glsl } from '@app/engine/utils/development/formatter';
import { BaseObject, Degrees, Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { CustomMesh } from './custom-mesh';

export interface FrustumSettings {
  /** Horizontal half-angle in degrees */
  horizontalFov: Degrees;
  /** Vertical half-angle in degrees */
  verticalFov: Degrees;
  /** Near-plane distance from satellite in km */
  nearDistance: Kilometers;
  /** Far-plane distance from satellite in km */
  farDistance: Kilometers;
  /** RGBA color, default [0.8, 0.2, 1.0, 0.15] */
  color?: [number, number, number, number];
  /** Roll angle in degrees about the boresight axis, default 0 */
  rollAngle?: Degrees;
  /** When set, the frustum points toward this target satellite */
  targetObj?: BaseObject;
  /** Free-direction mode: azimuth offset from nadir in degrees */
  azimuthOffset?: Degrees;
  /** Free-direction mode: elevation offset from nadir in degrees */
  elevationOffset?: Degrees;
}

export class FrustumMesh extends CustomMesh {
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

  horizontalFov: number;
  verticalFov: number;
  nearDistance: Kilometers;
  farDistance: Kilometers;
  color: [number, number, number, number] = [0.8, 0.2, 1.0, 0.15];
  rollAngle: number = 0;
  azimuthOffset: number = 0;
  elevationOffset: number = 0;
  pos: vec3 = vec3.create();
  obj: BaseObject;
  targetObj: BaseObject | null = null;

  constructor(obj: BaseObject, settings: FrustumSettings) {
    super();
    this.obj = obj;
    this.horizontalFov = settings.horizontalFov;
    this.verticalFov = settings.verticalFov;
    this.nearDistance = settings.nearDistance;
    this.farDistance = settings.farDistance;
    this.color = settings.color || this.color;
    this.rollAngle = settings.rollAngle || 0;
    this.targetObj = settings.targetObj ?? null;
    this.azimuthOffset = settings.azimuthOffset || 0;
    this.elevationOffset = settings.elevationOffset || 0;

    this.updatePosition_();
  }

  editSettings(settings: FrustumSettings) {
    this.horizontalFov = settings.horizontalFov;
    this.verticalFov = settings.verticalFov;
    this.nearDistance = settings.nearDistance;
    this.farDistance = settings.farDistance;
    this.color = settings.color || this.color;
    this.rollAngle = settings.rollAngle || 0;
    this.targetObj = settings.targetObj ?? this.targetObj;
    this.azimuthOffset = settings.azimuthOffset || 0;
    this.elevationOffset = settings.elevationOffset || 0;
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
    } else if (this.azimuthOffset !== 0 || this.elevationOffset !== 0) {
      this.updateFreeDirection_();
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

    const px = this.pos[0];
    const py = this.pos[1];
    const pz = this.pos[2];

    const satDistance = Math.sqrt(px * px + py * py + pz * pz);

    // Boresight = from satellite toward Earth center (nadir)
    const dx = -px / satDistance;
    const dy = -py / satDistance;
    const dz = -pz / satDistance;

    const ox = px + worldShift[0];
    const oy = py + worldShift[1];
    const oz = pz + worldShift[2];

    // Clamp far distance so the far plane stays above the Earth's surface,
    // matching the cone mesh's base altitude (RADIUS_OF_EARTH + buffer).
    // Without this, the far plane can extend inside the Earth, and depth
    // testing causes asymmetric occlusion that shifts with camera angle.
    const maxFarDist = satDistance - RADIUS_OF_EARTH - 15;
    const effectiveNear = Math.min(this.nearDistance, Math.max(maxFarDist, 0));
    const effectiveFar = Math.min(this.farDistance, Math.max(maxFarDist, 0));

    this.computeFrustumCorners_(dx, dy, dz, ox, oy, oz, effectiveNear, effectiveFar);
  }

  private updateSatToSat_(): boolean {
    const worldShift = Scene.getInstance().worldShift;
    const positionData = ServiceLocator.getDotsManager()?.positionData;
    const tIdx = Number(this.targetObj!.id) * 3;

    if (!positionData || tIdx + 2 >= positionData.length) {
      return false;
    }

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

    const ox = px + worldShift[0];
    const oy = py + worldShift[1];
    const oz = pz + worldShift[2];

    this.computeFrustumCorners_(dx, dy, dz, ox, oy, oz, this.nearDistance, this.farDistance);

    return true;
  }

  private updateFreeDirection_() {
    const worldShift = Scene.getInstance().worldShift;

    const px = this.pos[0];
    const py = this.pos[1];
    const pz = this.pos[2];

    const satDistance = Math.sqrt(px * px + py * py + pz * pz);

    // Nadir direction (toward Earth)
    const nadirX = -px / satDistance;
    const nadirY = -py / satDistance;
    const nadirZ = -pz / satDistance;

    // Build local frame from nadir using orthonormal basis
    let refX = 0;
    let refY = 1;
    let refZ = 0;

    if (Math.abs(nadirY) > 0.9) {
      refX = 1;
      refY = 0;
      refZ = 0;
    }

    // eastward = normalize(cross(nadir, ref))
    let ex = nadirY * refZ - nadirZ * refY;
    let ey = nadirZ * refX - nadirX * refZ;
    let ez = nadirX * refY - nadirY * refX;
    const eLen = Math.sqrt(ex * ex + ey * ey + ez * ez);

    ex /= eLen;
    ey /= eLen;
    ez /= eLen;

    // northward = cross(eastward, nadir)
    const nx = ey * nadirZ - ez * nadirY;
    const ny = ez * nadirX - ex * nadirZ;
    const nz = ex * nadirY - ey * nadirX;

    // Apply azimuth and elevation offsets
    const azRad = (this.azimuthOffset * Math.PI) / 180;
    const elRad = (this.elevationOffset * Math.PI) / 180;

    // Azimuth selects a horizontal direction in the north/east plane
    const cosAz = Math.cos(azRad);
    const sinAz = Math.sin(azRad);
    const hx = cosAz * nx + sinAz * ex;
    const hy = cosAz * ny + sinAz * ey;
    const hz = cosAz * nz + sinAz * ez;

    // Elevation tilts from nadir toward the horizontal direction
    const cosEl = Math.cos(elRad);
    const sinEl = Math.sin(elRad);
    const bx = cosEl * nadirX + sinEl * hx;
    const by = cosEl * nadirY + sinEl * hy;
    const bz = cosEl * nadirZ + sinEl * hz;

    const ox = px + worldShift[0];
    const oy = py + worldShift[1];
    const oz = pz + worldShift[2];

    this.computeFrustumCorners_(bx, by, bz, ox, oy, oz, this.nearDistance, this.farDistance);
  }

  private computeFrustumCorners_(dx: number, dy: number, dz: number, originX: number, originY: number, originZ: number, nearDist: number, farDist: number) {
    // Build orthonormal basis perpendicular to the boresight direction.
    // Use the satellite velocity vector so that 0° roll aligns the frustum's
    // "up" with the velocity direction (direction of travel).
    let refX = 0;
    let refY = 1;
    let refZ = 0;
    let hasVelocityRef = false;

    const velocityData = ServiceLocator.getDotsManager()?.velocityData;
    const vIdx = Number(this.obj.id) * 3;

    if (velocityData && vIdx + 2 < velocityData.length) {
      const vx = velocityData[vIdx];
      const vy = velocityData[vIdx + 1];
      const vz = velocityData[vIdx + 2];

      // Use -velocity as reference so cross-product math yields up = velocity projection.
      // Verify the cross product has sufficient magnitude (fails when velocity is
      // parallel to boresight or zero).
      const nvx = -vx;
      const nvy = -vy;
      const nvz = -vz;
      const cx = dy * nvz - dz * nvy;
      const cy = dz * nvx - dx * nvz;
      const cz = dx * nvy - dy * nvx;

      if (cx * cx + cy * cy + cz * cz > 1e-12) {
        refX = nvx;
        refY = nvy;
        refZ = nvz;
        hasVelocityRef = true;
      }
    }

    if (!hasVelocityRef) {
      // Fallback: arbitrary reference when velocity is unavailable or degenerate
      refX = 0;
      refY = 1;
      refZ = 0;
      if (Math.abs(dy) > 0.9) {
        refX = 1;
        refY = 0;
        refZ = 0;
      }
    }

    // right = normalize(cross(d, ref))
    let rx = dy * refZ - dz * refY;
    let ry = dz * refX - dx * refZ;
    let rz = dx * refY - dy * refX;
    const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz);

    rx /= rLen;
    ry /= rLen;
    rz /= rLen;

    // up = cross(d, right)
    let ux = dy * rz - dz * ry;
    let uy = dz * rx - dx * rz;
    let uz = dx * ry - dy * rx;

    // Apply roll rotation about boresight
    if (this.rollAngle !== 0) {
      const rollRad = (this.rollAngle * Math.PI) / 180;
      const cosR = Math.cos(rollRad);
      const sinR = Math.sin(rollRad);

      const newRx = cosR * rx + sinR * ux;
      const newRy = cosR * ry + sinR * uy;
      const newRz = cosR * rz + sinR * uz;

      ux = -sinR * rx + cosR * ux;
      uy = -sinR * ry + cosR * uy;
      uz = -sinR * rz + cosR * uz;

      rx = newRx;
      ry = newRy;
      rz = newRz;
    }

    // Compute half-extents
    const hFovRad = (this.horizontalFov * Math.PI) / 180;
    const vFovRad = (this.verticalFov * Math.PI) / 180;
    const nearHalfW = nearDist * Math.tan(hFovRad);
    const nearHalfH = nearDist * Math.tan(vFovRad);
    const farHalfW = farDist * Math.tan(hFovRad);
    const farHalfH = farDist * Math.tan(vFovRad);

    // Compute plane centers along boresight
    const ncX = originX + dx * nearDist;
    const ncY = originY + dy * nearDist;
    const ncZ = originZ + dz * nearDist;

    const fcX = originX + dx * farDist;
    const fcY = originY + dy * farDist;
    const fcZ = originZ + dz * farDist;

    // Near plane: TL=0, TR=1, BR=2, BL=3
    this.setVertex_(0, ncX - nearHalfW * rx + nearHalfH * ux, ncY - nearHalfW * ry + nearHalfH * uy, ncZ - nearHalfW * rz + nearHalfH * uz);
    this.setVertex_(1, ncX + nearHalfW * rx + nearHalfH * ux, ncY + nearHalfW * ry + nearHalfH * uy, ncZ + nearHalfW * rz + nearHalfH * uz);
    this.setVertex_(2, ncX + nearHalfW * rx - nearHalfH * ux, ncY + nearHalfW * ry - nearHalfH * uy, ncZ + nearHalfW * rz - nearHalfH * uz);
    this.setVertex_(3, ncX - nearHalfW * rx - nearHalfH * ux, ncY - nearHalfW * ry - nearHalfH * uy, ncZ - nearHalfW * rz - nearHalfH * uz);

    // Far plane: TL=4, TR=5, BR=6, BL=7
    this.setVertex_(4, fcX - farHalfW * rx + farHalfH * ux, fcY - farHalfW * ry + farHalfH * uy, fcZ - farHalfW * rz + farHalfH * uz);
    this.setVertex_(5, fcX + farHalfW * rx + farHalfH * ux, fcY + farHalfW * ry + farHalfH * uy, fcZ + farHalfW * rz + farHalfH * uz);
    this.setVertex_(6, fcX + farHalfW * rx - farHalfH * ux, fcY + farHalfW * ry - farHalfH * uy, fcZ + farHalfW * rz - farHalfH * uz);
    this.setVertex_(7, fcX - farHalfW * rx - farHalfH * ux, fcY - farHalfW * ry - farHalfH * uy, fcZ - farHalfW * rz - farHalfH * uz);
  }

  private setVertex_(index: number, x: number, y: number, z: number) {
    const i = index * 3;

    this.vertices_[i] = x;
    this.vertices_[i + 1] = y;
    this.vertices_[i + 2] = z;
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

    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, FrustumMesh.IDENTITY_MATRIX_);
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
      const meshRefFlatX = camCenterX + (((d % mapW) + mapW) % mapW) - mapW / 2;

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
    gl.depthMask(false);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1.0, -1.0);

    gl.bindVertexArray(this.vao_);

    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  initGeometry_() {
    // 8 vertices x 3 components
    this.vertices_ = new Float32Array(8 * 3);

    // 6 faces x 2 triangles x 3 indices = 36
    this.indices_ = new Uint16Array([
      // Near face
      0, 2, 1, 0, 3, 2,
      // Far face
      4, 5, 6, 4, 6, 7,
      // Top face
      0, 1, 5, 0, 5, 4,
      // Bottom face
      3, 6, 2, 3, 7, 6,
      // Left face
      0, 4, 7, 0, 7, 3,
      // Right face
      1, 2, 6, 1, 6, 5,
    ]);
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

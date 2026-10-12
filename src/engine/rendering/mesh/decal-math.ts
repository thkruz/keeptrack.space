import type { mat4, vec3 } from 'gl-matrix';

/** Output of {@link computeDecalBasis}; the caller owns and reuses it. */
export interface DecalBasis {
  /** Unit vector from the model centre toward the camera, model space. */
  dir: vec3;
  /** Decal "right" axis (screen right projected into model space), unit, perpendicular to dir. */
  u: vec3;
  /** Decal "up" axis (screen up projected into model space), unit, perpendicular to dir and u. */
  v: vec3;
}

const PARALLEL_LIMIT_ = 0.999;

/**
 * Orthonormal projection basis for the flag decal, in model space.
 *
 * `mvMatrix` is the full model-view matrix (view * model) with the camera at the view-space
 * origin looking down -Z. Then:
 * - `dir = normalize(inverse(mat3(mv)) * -(mv * centre))`, the camera direction seen from the
 *   model centre.
 * - `v` is the view-space up axis (0,1,0) taken into model space and made perpendicular to
 *   `dir`, so the flag reads upright on screen whatever the model attitude. If up is nearly
 *   parallel to `dir`, model +Z is used, then +X.
 * - `u = v x dir`, so (u, v, dir) is right-handed like screen (right, up, toward viewer).
 *
 * Allocation-free: writes into `out` only. Inverse of the 3x3 is done by cofactors so a
 * model matrix with scale still works.
 */
export const computeDecalBasis = (mvMatrix: mat4, centerModel: vec3, out: DecalBasis): void => {
  const m = mvMatrix;
  // Upper 3x3, column-major: column j is (m[4j], m[4j+1], m[4j+2]).
  const a00 = m[0];
  const a01 = m[1];
  const a02 = m[2];
  const a10 = m[4];
  const a11 = m[5];
  const a12 = m[6];
  const a20 = m[8];
  const a21 = m[9];
  const a22 = m[10];

  const cx = centerModel[0];
  const cy = centerModel[1];
  const cz = centerModel[2];
  // toCam = -(mv * centre), view space.
  const tx = -(a00 * cx + a10 * cy + a20 * cz + m[12]);
  const ty = -(a01 * cx + a11 * cy + a21 * cz + m[13]);
  const tz = -(a02 * cx + a12 * cy + a22 * cz + m[14]);

  // Inverse of the 3x3 (gl-matrix mat3.invert formula), row-major result b.
  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  const det = a00 * b01 + a01 * b11 + a02 * b21;
  const id = det === 0 ? 0 : 1 / det;
  const i00 = b01 * id;
  const i01 = (-a22 * a01 + a02 * a21) * id;
  const i02 = (a12 * a01 - a02 * a11) * id;
  const i10 = b11 * id;
  const i11 = (a22 * a00 - a02 * a20) * id;
  const i12 = (-a12 * a00 + a02 * a10) * id;
  const i20 = b21 * id;
  const i21 = (-a21 * a00 + a01 * a20) * id;
  const i22 = (a11 * a00 - a01 * a10) * id;
  // inv is column-major like gl-matrix: inv * w = (i00*wx + i10*wy + i20*wz, ...).

  let dx = i00 * tx + i10 * ty + i20 * tz;
  let dy = i01 * tx + i11 * ty + i21 * tz;
  let dz = i02 * tx + i12 * ty + i22 * tz;
  let len = Math.hypot(dx, dy, dz);

  if (len === 0) {
    dx = 0;
    dy = 0;
    dz = 1;
    len = 1;
  }
  dx /= len;
  dy /= len;
  dz /= len;

  // Screen up (0,1,0) in model space is the second column of inv.
  let ux = i10;
  let uy = i11;
  let uz = i12;
  let ulen = Math.hypot(ux, uy, uz);

  if (ulen === 0 || Math.abs((ux * dx + uy * dy + uz * dz) / ulen) > PARALLEL_LIMIT_) {
    // Model +Z unless that is parallel too, then +X.
    if (Math.abs(dz) > PARALLEL_LIMIT_) {
      ux = 1;
      uy = 0;
      uz = 0;
    } else {
      ux = 0;
      uy = 0;
      uz = 1;
    }
    ulen = 1;
  }
  ux /= ulen;
  uy /= ulen;
  uz /= ulen;

  // v = normalize(up - (up . dir) dir)
  const k = ux * dx + uy * dy + uz * dz;
  let vx = ux - k * dx;
  let vy = uy - k * dy;
  let vz = uz - k * dz;
  const vlen = Math.hypot(vx, vy, vz);

  vx /= vlen;
  vy /= vlen;
  vz /= vlen;

  out.dir[0] = dx;
  out.dir[1] = dy;
  out.dir[2] = dz;
  out.v[0] = vx;
  out.v[1] = vy;
  out.v[2] = vz;
  // u = v x dir
  out.u[0] = vy * dz - vz * dy;
  out.u[1] = vz * dx - vx * dz;
  out.u[2] = vx * dy - vy * dx;
};

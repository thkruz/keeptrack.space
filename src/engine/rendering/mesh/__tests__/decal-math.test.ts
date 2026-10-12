import { mat4, vec3 } from 'gl-matrix';
import { computeDecalBasis, type DecalBasis } from '../decal-math';

const makeOut = (): DecalBasis => ({ dir: vec3.create(), u: vec3.create(), v: vec3.create() });
const dot = (a: vec3, b: vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const expectVec = (actual: vec3, expected: number[]): void => {
  for (let i = 0; i < 3; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(1e-9);
  }
};
const expectOrthonormal = (b: DecalBasis): void => {
  for (const [x, y] of [
    [b.u, b.dir],
    [b.v, b.dir],
    [b.u, b.v],
  ] as const) {
    expect(Math.abs(dot(x, y))).toBeLessThan(1e-9);
  }
  for (const x of [b.u, b.v, b.dir]) {
    expect(Math.abs(dot(x, x) - 1)).toBeLessThan(1e-9);
  }
};

describe('computeDecalBasis', () => {
  it('identity view, centre (0,0,-10): dir +Z, v +Y, u +X', () => {
    // toCam = -(0,0,-10) = (0,0,10) -> dir (0,0,1). Screen up (0,1,0) is already perpendicular,
    // so v = (0,1,0); u = v x dir = (1*1 - 0*0, 0*0 - 0*1, 0*0 - 1*0) = (1,0,0).
    const out = makeOut();

    computeDecalBasis(mat4.create(), vec3.fromValues(0, 0, -10), out);

    expectVec(out.dir, [0, 0, 1]);
    expectVec(out.v, [0, 1, 0]);
    expectVec(out.u, [1, 0, 0]);
    expectOrthonormal(out);
  });

  /*
   * Model at view (0,0,-10), rotated about Y. Column-major Ry(t) has m0 = cos t, m2 = -sin t,
   * m8 = sin t, m10 = cos t. The model-space camera direction is R^T * (0,0,1), i.e. the third
   * component of each column of R: (-sin t, 0, cos t).
   */
  it('-90 deg about Y: dir rotates to +X', () => {
    // t = -90: (-sin t, 0, cos t) = (1, 0, 0). u = v x dir = (0,1,0) x (1,0,0) = (0,0,-1).
    // biome-ignore format: matrix layout
    const mv = mat4.fromValues(
      0, 0, 1, 0,
      0, 1, 0, 0,
      -1, 0, 0, 0,
      0, 0, -10, 1
    );
    const out = makeOut();

    computeDecalBasis(mv, vec3.fromValues(0, 0, 0), out);

    expectVec(out.dir, [1, 0, 0]);
    expectVec(out.v, [0, 1, 0]);
    expectVec(out.u, [0, 0, -1]);
    expectOrthonormal(out);
  });

  it('+90 deg about Y: dir rotates to -X', () => {
    // t = +90: (-sin t, 0, cos t) = (-1, 0, 0).
    // biome-ignore format: matrix layout
    const mv = mat4.fromValues(
      0, 0, -1, 0,
      0, 1, 0, 0,
      1, 0, 0, 0,
      0, 0, -10, 1
    );
    const out = makeOut();

    computeDecalBasis(mv, vec3.fromValues(0, 0, 0), out);

    expectVec(out.dir, [-1, 0, 0]);
    expectOrthonormal(out);
  });

  it('camera straight above the model falls back to model +Z for v', () => {
    // Centre (0,-10,0): toCam (0,10,0) -> dir (0,1,0), parallel to screen up, so v = +Z and
    // u = v x dir = (0*0 - 1*1, 1*0 - 0*0, 0*1 - 0*0) = (-1,0,0).
    const out = makeOut();

    computeDecalBasis(mat4.create(), vec3.fromValues(0, -10, 0), out);

    expectVec(out.dir, [0, 1, 0]);
    expectVec(out.v, [0, 0, 1]);
    expectVec(out.u, [-1, 0, 0]);
  });

  it('writes into the caller-owned out on every call', () => {
    const out = makeOut();
    const { dir, u, v } = out;

    computeDecalBasis(mat4.create(), vec3.fromValues(0, 0, -10), out);
    computeDecalBasis(mat4.create(), vec3.fromValues(0, -10, 0), out);

    expect(out.dir).toBe(dir);
    expect(out.u).toBe(u);
    expect(out.v).toBe(v);
    expectVec(out.dir, [0, 1, 0]);
  });
});

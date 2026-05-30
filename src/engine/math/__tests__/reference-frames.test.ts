import { mat4 } from 'gl-matrix';
import { getJ200ToTemeMatrix, getTemeToJ2000Matrix } from '@app/engine/math/reference-frames';

/*
 * J2000<->TEME rotation matrices built from precession + nutation. These are
 * pure given a date; we assert the structural invariants of a proper rotation
 * (16 finite entries, determinant 1) and that the two directions round-trip to
 * the identity.
 */
describe('reference-frames J2000<->TEME matrices', () => {
  const date = new Date('2022-01-01T00:00:00Z');

  it('produces a 16-element matrix of finite values', () => {
    const m = getJ200ToTemeMatrix(date);

    expect(m).toHaveLength(16);
    for (const v of m) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('is a proper rotation (determinant ~ 1)', () => {
    const m = getJ200ToTemeMatrix(date);

    expect(mat4.determinant(m)).toBeCloseTo(1, 3);
  });

  it('TEME->J2000 is the inverse of J2000->TEME (round-trips to identity)', () => {
    const fwd = getJ200ToTemeMatrix(date);
    const inv = getTemeToJ2000Matrix(date);
    const product = mat4.create();

    mat4.multiply(product, inv, fwd);

    const identity = mat4.create(); // gl-matrix initializes to identity

    for (let i = 0; i < 16; i++) {
      expect(product[i]).toBeCloseTo(identity[i], 3);
    }
  });

  it('yields a different rotation at a different epoch (precession advances)', () => {
    const a = getJ200ToTemeMatrix(new Date('2000-01-01T00:00:00Z'));
    const b = getJ200ToTemeMatrix(new Date('2025-01-01T00:00:00Z'));

    // At least one element should differ measurably over 25 years.
    const maxDelta = Math.max(...Array.from({ length: 16 }, (_v, i) => Math.abs(a[i] - b[i])));

    expect(maxDelta).toBeGreaterThan(0);
  });
});

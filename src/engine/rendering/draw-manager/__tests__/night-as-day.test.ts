import { describe, expect, it } from 'vitest';
import { NIGHT_AS_DAY_GLSL, NIGHT_AS_DAY_SUN_COSINE, NIGHT_AS_DAY_SUN_ELEVATION_DEG, nightAsDaySunCosine } from '../night-as-day';

describe('night-as-day sun rule', () => {
  it('uses a 45 degree virtual sun', () => {
    expect(NIGHT_AS_DAY_SUN_ELEVATION_DEG).toBe(45);
    expect(NIGHT_AS_DAY_SUN_COSINE).toBeCloseTo(Math.SQRT1_2, 10);
  });

  it('leaves the cosine unchanged when the floor is 0', () => {
    for (const c of [-1, -0.3, 0, 0.2, 0.9]) {
      expect(nightAsDaySunCosine(c, 0)).toBe(c);
    }
  });

  it('keeps every real cosine above the floor exactly', () => {
    for (const c of [0.72, 0.8, 0.9, 1]) {
      expect(nightAsDaySunCosine(c, NIGHT_AS_DAY_SUN_COSINE)).toBe(c);
    }
  });

  it('is the plain max(c, floor), flat below the floor with no dim band', () => {
    for (const c of [-1, -0.5, -0.01, 0, 0.1, 0.2, 0.25, 0.35, 0.5, 0.7]) {
      expect(nightAsDaySunCosine(c, NIGHT_AS_DAY_SUN_COSINE)).toBeCloseTo(NIGHT_AS_DAY_SUN_COSINE, 10);
    }
  });

  it('never goes below the real cosine, never below the floor, and is continuous', () => {
    let prev = nightAsDaySunCosine(-0.2, NIGHT_AS_DAY_SUN_COSINE);

    for (let c = -0.2; c <= 1; c += 0.001) {
      const v = nightAsDaySunCosine(c, NIGHT_AS_DAY_SUN_COSINE);

      expect(v).toBeGreaterThanOrEqual(c);
      expect(v).toBeGreaterThanOrEqual(NIGHT_AS_DAY_SUN_COSINE);
      expect(Math.abs(v - prev)).toBeLessThan(0.01);
      prev = v;
    }
  });

  it('exports GLSL with the same constant and a plain max', () => {
    expect(NIGHT_AS_DAY_GLSL).toContain('float nightAsDaySun(float c, float floorCos)');
    expect(NIGHT_AS_DAY_GLSL).toContain(NIGHT_AS_DAY_SUN_COSINE.toFixed(8));
    expect(NIGHT_AS_DAY_GLSL).toContain('return max(c, floorCos);');
    expect(NIGHT_AS_DAY_GLSL).not.toContain('smoothstep');
    expect(NIGHT_AS_DAY_GLSL).toContain('vec3 nightAsDaySunDir(vec3 up, vec3 sun, float floorCos)');
  });
});

import { describe, expect, it } from 'vitest';
import { classifyOrbitRegime } from '../orbit-regime';

describe('classifyOrbitRegime', () => {
  it('names the ISS orbit LEO', () => {
    expect(classifyOrbitRegime(415, 422, 0.0005)).toBe('leo');
  });

  it('names a GPS orbit MEO', () => {
    expect(classifyOrbitRegime(20_100, 20_300, 0.002)).toBe('meo');
  });

  it('names a geostationary orbit GEO', () => {
    expect(classifyOrbitRegime(35_780, 35_795, 0.0002)).toBe('geo');
  });

  it('names a Molniya orbit HEO', () => {
    expect(classifyOrbitRegime(600, 39_700, 0.74)).toBe('heo');
  });

  it('names a graveyard orbit above GEO HEO', () => {
    expect(classifyOrbitRegime(36_900, 37_100, 0.001)).toBe('heo');
  });

  it('returns null for an unbound or non-finite orbit', () => {
    expect(classifyOrbitRegime(Number.NaN, 400, 0.1)).toBeNull();
    expect(classifyOrbitRegime(400, 500, 1.2)).toBeNull();
  });
});

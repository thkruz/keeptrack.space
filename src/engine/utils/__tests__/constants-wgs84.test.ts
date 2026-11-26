import { RADIUS_OF_EARTH, WGS84_A_KM, WGS84_B_KM } from '@app/engine/utils/constants';
import { WGS84_A, WGS84_B } from '@ootk/src/main';

describe('WGS84 constants', () => {
  it('match ootk and keep the mean radius', () => {
    expect(WGS84_A_KM).toBe(WGS84_A);
    expect(Math.abs(WGS84_B_KM - WGS84_B)).toBeLessThan(1e-12);
    expect(WGS84_B_KM).toBeCloseTo(6356.752314245, 9);
    expect(RADIUS_OF_EARTH).toBe(6371);
  });
});

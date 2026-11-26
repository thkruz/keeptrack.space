import { geodeticLatitudeGlslMirror, WGS84_GLSL, WGS84_GLSL_CONSTANTS } from '@app/engine/rendering/shaders/wgs84-glsl';
import { WGS84_A_KM, WGS84_B_KM } from '@app/engine/utils/constants';
import { Degrees, eci2lla, Kilometers, lla2ecef, WGS84_E2 } from '@ootk/src/main';

const DEG = Math.PI / 180;

describe('WGS84_GLSL chunk', () => {
  it('declares the constants and the geodeticLatitude function', () => {
    expect(WGS84_GLSL).toContain('const float WGS84_A = 6378.137;');
    expect(WGS84_GLSL).toContain('const float WGS84_B = 6356.7523142;');
    expect(WGS84_GLSL).toContain('const float WGS84_E2 = 0.00669437999014;');
    expect(WGS84_GLSL).toContain('const float WGS84_EP2 = 0.00673949674228;');
    expect(WGS84_GLSL).toContain('float geodeticLatitude(vec3 ecef)');
  });

  it('uses literals that match the WGS84 definition', () => {
    const { A, B, E2, EP2 } = WGS84_GLSL_CONSTANTS;

    expect(A).toBe(WGS84_A_KM);
    expect(Math.abs(B - WGS84_B_KM)).toBeLessThan(1e-7);
    expect(Math.abs(E2 - WGS84_E2)).toBeLessThan(1e-14);
    expect(Math.abs(EP2 - (A * A - B * B) / (B * B))).toBeLessThan(1e-10);
  });

  it('mirror keeps the GLSL body line for line', () => {
    // Every arithmetic line of the mirror appears in the chunk with the GLSL names.
    for (const line of [
      'float p = length(ecef.xy);',
      'float theta = atan(ecef.z * WGS84_A, p * WGS84_B);',
      'float num = ecef.z + WGS84_EP2 * WGS84_B * sinTheta * sinTheta * sinTheta;',
      'float den = p - WGS84_E2 * WGS84_A * cosTheta * cosTheta * cosTheta;',
      'return atan(num, den);',
    ]) {
      expect(WGS84_GLSL).toContain(line);
    }
  });
});

describe('geodeticLatitude (TypeScript mirror of the GLSL)', () => {
  const cases: [number, number][] = [];

  for (const lat of [0, 30, 45, 60, 89.9, -45]) {
    for (const alt of [0, 500, 35786]) {
      cases.push([lat, alt]);
    }
  }

  it.each(cases)('lat %d deg, alt %d km matches ootk eci2lla within 1e-6 rad', (lat, alt) => {
    const ecef = lla2ecef({ lat: lat as Degrees, lon: 37 as Degrees, alt: alt as Kilometers });
    const ootkLat = eci2lla(ecef, 0).lat * DEG;
    const mirrorLat = geodeticLatitudeGlslMirror(ecef.x, ecef.y, ecef.z);

    expect(Math.abs(mirrorLat - lat * DEG)).toBeLessThan(1e-6);
    expect(Math.abs(mirrorLat - ootkLat)).toBeLessThan(1e-6);
  });

  it('returns +-90 deg on the pole axis', () => {
    expect(geodeticLatitudeGlslMirror(0, 0, WGS84_B_KM)).toBeCloseTo(Math.PI / 2, 12);
    expect(geodeticLatitudeGlslMirror(0, 0, -WGS84_B_KM - 500)).toBeCloseTo(-Math.PI / 2, 12);
  });
});

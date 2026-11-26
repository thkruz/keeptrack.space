import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { WGS84_A_KM, WGS84_B_KM } from '@app/engine/utils/constants';
import { Kilometers, llaRad2ecef, Radians } from '@ootk/src/main';
import { vi } from 'vitest';
import preWgs84 from './fixtures/sphere-geometry-pre-wgs84.json';

/*
 * The fixture was captured from sphere-geometry.ts BEFORE the ellipsoid option existed
 * (commit e0f40a29b), so sphere mode must reproduce it exactly.
 */
const makeGl = () =>
  ({
    createBuffer: vi.fn(() => ({}) as WebGLBuffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88e4,
    UNSIGNED_SHORT: 0x1403,
    UNSIGNED_INT: 0x1405,
  }) as unknown as WebGL2RenderingContext;

type Params = ConstructorParameters<typeof SphereGeometry>[1];

const capture = (params: Params) => {
  const spy = vi.spyOn(SphereGeometry.prototype, 'setCombinedBuffer');
  const geometry = new SphereGeometry(makeGl(), params);
  const combined = [...(spy.mock.calls.at(-1)![1] as number[])];

  spy.mockRestore();

  return { combined, index: [...geometry.getSortedIndices()], indexLength: geometry.indexLength, geometry };
};

const W = 8;
const H = 6;
const WGS84 = { a: WGS84_A_KM, b: WGS84_B_KM };
const vertexOf = (combined: number[], row: number, col: number) => combined.slice((row * (W + 1) + col) * 8, (row * (W + 1) + col) * 8 + 8);
// Row r of an H-row mesh is at latitude -90 + 180 r / H degrees; column c at longitude 360 c / W degrees.
const latOf = (row: number) => -Math.PI / 2 + (Math.PI * row) / H;
const lonOf = (col: number) => (2 * Math.PI * col) / W;

describe('SphereGeometry sphere mode (unchanged by the WGS84 option)', () => {
  it.each([
    ['full', { radius: 2, widthSegments: 6, heightSegments: 4 }],
    ['skipTexture', { radius: 3.5, widthSegments: 5, heightSegments: 3, isSkipTexture: true }],
    ['slice', { radius: 1, widthSegments: 4, heightSegments: 4, phiStart: 0.3, phiLength: Math.PI, thetaStart: 0.2, thetaLength: Math.PI / 2 }],
  ] as const)('reproduces the pre-WGS84 buffers for %s', (key, params) => {
    const now = capture(params as Params);
    const before = preWgs84[key];

    expect(now.combined).toEqual(before.combined);
    expect(now.index).toEqual(before.index);
    expect(now.indexLength).toBe(before.indexLength);
    expect(now.geometry.ellipsoid).toBeNull();
  });
});

describe('SphereGeometry ellipsoid mode (WGS84)', () => {
  const sphere = capture({ radius: WGS84_A_KM, widthSegments: W, heightSegments: H });
  const ell = capture({ radius: WGS84_A_KM, widthSegments: W, heightSegments: H, ellipsoid: WGS84 });

  it('keeps vertex and index counts, index order and the radius field', () => {
    expect(ell.combined.length).toBe(sphere.combined.length);
    expect(ell.combined.length).toBe((W + 1) * (H + 1) * 8);
    expect(ell.index).toEqual(sphere.index);
    expect(ell.geometry.radius).toBe(WGS84_A_KM);
    expect(ell.geometry.ellipsoid).toEqual(WGS84);
  });

  it('puts every vertex at ootk llaRad2ecef of its geodetic (lat, lon) to 1e-6 km', () => {
    for (let row = 0; row <= H; row++) {
      for (let col = 0; col <= W; col++) {
        const [x, y, z] = vertexOf(ell.combined, row, col);
        const ecef = llaRad2ecef({ lat: latOf(row) as Radians, lon: lonOf(col) as Radians, alt: 0 as Kilometers });

        expect(Math.abs(x - ecef.x)).toBeLessThan(1e-6);
        expect(Math.abs(y - ecef.y)).toBeLessThan(1e-6);
        expect(Math.abs(z - ecef.z)).toBeLessThan(1e-6);
      }
    }
  });

  it('uses the geodetic surface normal (cos lat cos lon, cos lat sin lon, sin lat)', () => {
    for (let row = 0; row <= H; row++) {
      for (let col = 0; col <= W; col++) {
        const [, , , nx, ny, nz] = vertexOf(ell.combined, row, col);
        const lat = latOf(row);
        const lon = lonOf(col);

        expect(nx).toBeCloseTo(Math.cos(lat) * Math.cos(lon), 12);
        expect(ny).toBeCloseTo(Math.cos(lat) * Math.sin(lon), 12);
        expect(nz).toBeCloseTo(Math.sin(lat), 12);
      }
    }
  });

  it('normal is perpendicular to the surface: parallel to (x / a^2, y / a^2, z / b^2)', () => {
    const [x, y, z, nx, ny, nz] = vertexOf(ell.combined, 4, 1); // lat 30, lon 45
    const g = [x / WGS84_A_KM ** 2, y / WGS84_A_KM ** 2, z / WGS84_B_KM ** 2];
    const gLen = Math.hypot(g[0], g[1], g[2]);

    expect(g[0] / gLen).toBeCloseTo(nx, 12);
    expect(g[1] / gLen).toBeCloseTo(ny, 12);
    expect(g[2] / gLen).toBeCloseTo(nz, 12);
  });

  it('keeps v linear in geodetic latitude and u unchanged', () => {
    for (let row = 0; row <= H; row++) {
      for (let col = 0; col <= W; col++) {
        const [, , , , , , u, v] = vertexOf(ell.combined, row, col);
        const [, , , , , , uSphere, vSphere] = vertexOf(sphere.combined, row, col);
        const latDeg = (latOf(row) * 180) / Math.PI;

        expect(v).toBeCloseTo(0.5 - latDeg / 180, 12);
        expect(u).toBe(uSphere);
        expect(v).toBe(vSphere);
      }
    }
  });

  it('matches hand-computed WGS84 vertices (independent of llaRad2ecef)', () => {
    // Equator, lon 0: N = a, so (a, 0, 0)
    const eq = vertexOf(ell.combined, 3, 0);

    expect(eq[0]).toBeCloseTo(6378.137, 9);
    expect(eq[1]).toBeCloseTo(0, 9);
    expect(eq[2]).toBeCloseTo(0, 9);

    // North pole: N = a / sqrt(1 - e2) = a^2 / b, z = N (1 - e2) = b = 6356.752314245
    const pole = vertexOf(ell.combined, 6, 0);

    expect(Math.hypot(pole[0], pole[1])).toBeLessThan(1e-9);
    expect(pole[2]).toBeCloseTo(6356.752314245, 6);

    // Lat 30, lon 45: N = 6378.137 / sqrt(1 - 0.00669438 * 0.25) = 6378.137 / 0.99916285 = 6383.480918
    // x = y = 6383.480918 * 0.8660254 / 1.4142136 = 3909.0678; z = 6383.480918 * 0.99330562 * 0.5 = 3170.3737
    const p30 = vertexOf(ell.combined, 4, 1);

    expect(p30[0]).toBeCloseTo(3909.0678, 3);
    expect(p30[1]).toBeCloseTo(3909.0678, 3);
    expect(p30[2]).toBeCloseTo(3170.3737, 3);
    // Geocentric radius at geodetic 30 deg (audit reference table): 6372.824 km
    expect(Math.hypot(p30[0], p30[1], p30[2])).toBeCloseTo(6372.824, 3);
  });

  it('builds a shell at a constant geodetic height along the normal', () => {
    const h = 120;
    const shell = capture({ radius: WGS84_A_KM + h, widthSegments: W, heightSegments: H, ellipsoid: { ...WGS84, height: h } });

    for (let row = 0; row <= H; row++) {
      const ecef = llaRad2ecef({ lat: latOf(row) as Radians, lon: lonOf(3) as Radians, alt: h as Kilometers });
      const [x, y, z] = vertexOf(shell.combined, row, 3);

      expect(Math.hypot(x - ecef.x, y - ecef.y, z - ecef.z)).toBeLessThan(1e-6);
    }
  });

  it('defaults to height 0 and leaves texture coordinates out with isSkipTexture', () => {
    const noTex = capture({ radius: 1, widthSegments: 4, heightSegments: 2, ellipsoid: WGS84, isSkipTexture: true });

    expect(noTex.combined.length).toBe(5 * 3 * 6);
    expect(noTex.combined[2 * 5 * 6 + 2]).toBeCloseTo(WGS84_B_KM, 9);
  });
});

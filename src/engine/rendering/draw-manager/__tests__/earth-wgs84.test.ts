/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EARTH_ATMOSPHERE_HEIGHT_KM, Earth, getCameraAltitudeAboveEllipsoid, getEarthEllipsoid } from '@app/engine/rendering/draw-manager/earth';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { WGS84_A_KM, WGS84_B_KM } from '@app/engine/utils/constants';
import { vi } from 'vitest';

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

describe('Earth WGS84 geometry helpers', () => {
  it('getEarthEllipsoid is WGS84 with the requested geodetic height', () => {
    expect(getEarthEllipsoid()).toEqual({ a: WGS84_A_KM, b: WGS84_B_KM, height: 0 });
    expect(getEarthEllipsoid(120)).toEqual({ a: 6378.137, b: WGS84_B_KM, height: 120 });
  });

  it('keeps the atmosphere shell at 2.5 % of a above the surface (the old 1.025 x radius)', () => {
    expect(EARTH_ATMOSPHERE_HEIGHT_KM).toBeCloseTo(159.453425, 6);
  });

  it('camera altitude is measured from the ellipsoid, not 6371', () => {
    expect(getCameraAltitudeAboveEllipsoid([WGS84_A_KM + 1000, 0, 0])).toBeCloseTo(1000, 9);
    expect(getCameraAltitudeAboveEllipsoid([0, 0, -(WGS84_B_KM + 400)])).toBeCloseTo(400, 9);
    expect(getCameraAltitudeAboveEllipsoid([0, 0, 0])).toBe(0);
  });
});

describe('Earth meshes use the WGS84 ellipsoid', () => {
  let earth: Earth;

  beforeEach(() => {
    settingsManager.earthNumLatSegs = 8;
    settingsManager.earthNumLonSegs = 6;
    earth = new Earth();
    earth['gl_'] = makeGl();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildEllipsoidGeometry_ makes an ellipsoid SphereGeometry (surface, picking and occlusion mesh)', () => {
    const surface = earth['buildEllipsoidGeometry_'](0);

    expect(surface).toBeInstanceOf(SphereGeometry);
    expect(surface.ellipsoid).toEqual({ a: WGS84_A_KM, b: WGS84_B_KM, height: 0 });
    expect(surface.radius).toBe(WGS84_A_KM);
    expect(surface.widthSegments).toBe(8);
    expect(surface.heightSegments).toBe(6);
  });

  it('builds the aurora shell 120 km above the ellipsoid', () => {
    earth['gl_'] = global.mocks.glMock;
    const build = vi.spyOn(earth as never, 'buildEllipsoidGeometry_');
    const vao = vi.spyOn(earth as never, 'initVaoAurora_').mockImplementation(() => undefined);

    earth['buildAuroraMesh_']();

    expect(build).toHaveBeenCalledWith(120);
    expect(vao).toHaveBeenCalled();
    expect((earth.auroraMesh!.geometry as SphereGeometry).ellipsoid).toEqual({ a: WGS84_A_KM, b: WGS84_B_KM, height: 120 });
  });

  it('builds the atmosphere shell at EARTH_ATMOSPHERE_HEIGHT_KM above the ellipsoid', () => {
    const build = vi.spyOn(earth as never, 'buildEllipsoidGeometry_');

    earth['gl_'] = global.mocks.glMock;
    vi.spyOn(earth as never, 'initVaoAtmosphere_').mockImplementation(() => undefined);
    earth.shaders.atmosphereVert = 'void main() {}';
    earth.shaders.atmosphereFrag = 'uniform float uCameraAltitude; void main() {}';

    earth.buildAtmosphereMesh();

    expect(build).toHaveBeenCalledWith(EARTH_ATMOSPHERE_HEIGHT_KM);
    expect((earth.atmosphereMesh!.geometry as SphereGeometry).ellipsoid).toEqual({
      a: WGS84_A_KM,
      b: WGS84_B_KM,
      height: EARTH_ATMOSPHERE_HEIGHT_KM,
    });
  });

  it('feeds the atmosphere uCameraAltitude from the ellipsoid surface below the camera', () => {
    const uniform1f = vi.fn();
    const gl = { uniform1f, uniform3fv: vi.fn(), uniformMatrix3fv: vi.fn(), uniformMatrix4fv: vi.fn() } as never;

    vi.spyOn(ServiceLocator, 'getRenderer').mockReturnValue({ projectionCameraMatrix: new Float32Array(16) } as never);
    vi.spyOn(ServiceLocator, 'getMainCamera').mockReturnValue({
      getCamPosEarthCentered: () => [0, 0, WGS84_B_KM + 2000],
      getForwardVector: () => [0, 0, WGS84_B_KM + 2000],
    } as never);
    earth.atmosphereMesh = { material: { uniforms: { uCameraAltitude: 'loc' } } } as never;

    earth['setAtmosphereUniforms_'](gl);

    expect(uniform1f).toHaveBeenCalledWith('loc', expect.closeTo(2000, 9));
  });
});

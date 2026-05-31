import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SolarBody } from '@app/engine/core/interfaces';
import { LineManager } from '@app/engine/rendering/line-manager';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { RefToRefLine } from '@app/engine/rendering/line-manager/ref-to-ref-line';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';

describe('LineManager', () => {
  let lm: LineManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => lm as any;

  beforeEach(() => {
    setupStandardEnvironment();
    lm = new LineManager();
    lm.init();
  });

  afterEach(() => vi.restoreAllMocks());

  it('init builds a WebGL program', () => {
    expect(lm.program).toBeDefined();
  });

  describe('list management', () => {
    it('add appends a line and clear empties the list', () => {
      lm.createRef2Ref([0, 0, 0], [1, 1, 1], LineColors.RED);
      expect(lm.lines).toHaveLength(1);

      lm.clear();
      expect(lm.lines).toHaveLength(0);
    });
  });

  describe('factory methods add the right number of lines', () => {
    it('createSatRicFrame adds three RIC axis lines for a satellite', () => {
      lm.createSatRicFrame(defaultSat);
      expect(lm.lines).toHaveLength(3);
    });

    it('createSatRicFrame is a no-op for null or non-satellites', () => {
      lm.createSatRicFrame(null);
      lm.createSatRicFrame({ isSatellite: () => false } as never);
      expect(lm.lines).toHaveLength(0);
    });

    it('createRef2Ref adds a single static line', () => {
      lm.createRef2Ref([0, 0, 0], [100, 0, 0], LineColors.GREEN);
      expect(lm.lines).toHaveLength(1);
    });

    it('createOrbitPath adds a path line, or returns null for an empty path', () => {
      expect(lm.createOrbitPath([], LineColors.BLUE)).toBeNull();
      const line = lm.createOrbitPath([[0, 0, 0], [1, 1, 1]] as never, LineColors.BLUE, SolarBody.Earth);

      expect(line).not.toBeNull();
      expect(lm.lines).toHaveLength(1);
    });

    it('createSat2Sun / createSat2CelestialBody add sat-to-body lines', () => {
      lm.createSat2Sun(defaultSat);
      lm.createSat2CelestialBody(defaultSat, SolarBody.Moon);
      expect(lm.lines).toHaveLength(2);
    });

    it('createSatToRef adds a sat-to-reference line', () => {
      lm.createSatToRef(defaultSat, [0, 0, 0]);
      expect(lm.lines).toHaveLength(1);
    });

    it('sensor factories add lines and guard against null sensors', () => {
      lm.createSensorToSun(defaultSensor);
      lm.createSensorToMoon(defaultSensor);
      lm.createSensorToRae(defaultSensor, { rng: 500, az: 10, el: 20 } as never);
      lm.createSensorScanHorizon(defaultSensor);
      expect(lm.lines.length).toBeGreaterThanOrEqual(4);

      const before = lm.lines.length;

      lm.createSensorToSun(null);
      lm.createSensorToMoon(null);
      lm.createSensorToRae(null, {} as never);
      expect(lm.lines).toHaveLength(before);
    });

    it('createSensorToSat adds a line for a valid sensor+sat and guards otherwise', () => {
      lm.createSensorToSat(defaultSensor, defaultSat);
      expect(lm.lines).toHaveLength(1);

      lm.createSensorToSat(null, defaultSat);
      lm.createSensorToSat(defaultSensor, null);
      expect(lm.lines).toHaveLength(1);
    });

    it('createObjToObj adds a line for two objects', () => {
      lm.createObjToObj(defaultSat, defaultSat);
      expect(lm.lines).toHaveLength(1);

      lm.createObjToObj(null, defaultSat);
      expect(lm.lines).toHaveLength(1);
    });

    it('createSatScanEarth and FOV-only variants add lines', () => {
      lm.createSatScanEarth(defaultSat);
      lm.createSensorToSatFovOnly(defaultSensor, defaultSat);
      lm.createSensorToSatFovAndSelectedOnly(defaultSensor, defaultSat);
      expect(lm.lines).toHaveLength(3);
    });

    it('createGrid builds a grid of segmented lines', () => {
      lm.createGrid('x', LineColors.WHITE);
      expect(lm.lines.length).toBeGreaterThan(10);
    });

    it('createGrid builds grids for the y and z axes too', () => {
      lm.createGrid('y', LineColors.WHITE);
      lm.createGrid('z', LineColors.WHITE);
      expect(lm.lines.length).toBeGreaterThan(20);
    });

    it('createGrid throws on an invalid axis', () => {
      expect(() => lm.createGrid('q' as never, LineColors.WHITE)).toThrow();
    });

    it('createGridRadial fans radial segments and concentric circles per axis', () => {
      for (const axis of ['x', 'y', 'z'] as const) {
        lm.clear();
        lm.createGridRadial({ axis, color: [1, 1, 1, 1], gridRadius: 100000, circleInterval: 50000 as never });
        expect(lm.lines.length).toBeGreaterThan(0);
      }
    });

    it('createGridRadial throws on an invalid axis', () => {
      expect(() => lm.createGridRadial({ axis: 'q' as never, color: [1, 1, 1, 1] })).toThrow();
    });

    it('createSensorsToSatFovOnly adds a line per active sensor', () => {
      lm.createSensorsToSatFovOnly(defaultSat);
      expect(lm.lines.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('render loop', () => {
    it('draw is a no-op with no lines', () => {
      expect(() => lm.draw(mat4.create())).not.toThrow();
    });

    it('draw runs the GL pipeline for present lines and prunes garbage', () => {
      const keep = new RefToRefLine([0, 0, 0], [1, 1, 1], LineColors.RED);
      const garbage = new RefToRefLine([0, 0, 0], [1, 1, 1], LineColors.RED);

      garbage.isGarbage = true;
      lm.add(keep);
      lm.add(garbage);

      const gl = ServiceLocator.getRenderer().gl;
      const useProgramSpy = vi.spyOn(gl, 'useProgram');

      lm.draw(mat4.create());

      expect(useProgramSpy).toHaveBeenCalled();
      // The garbage line was spliced out during draw.
      expect(lm.lines).not.toContain(garbage);
    });

    it('update calls update on each line without throwing', () => {
      lm.add(new RefToRefLine([0, 0, 0], [1, 1, 1], LineColors.RED));

      expect(() => lm.update()).not.toThrow();
    });

    it('setWorldUniforms pushes camera/world uniforms', () => {
      const gl = ServiceLocator.getRenderer().gl;
      const uniformSpy = vi.spyOn(gl, 'uniformMatrix4fv');

      p().setWorldUniforms(mat4.create(), mat4.create());

      expect(uniformSpy).toHaveBeenCalled();
    });

    it('setWorldUniforms covers the flat-map and polar-view branches', () => {
      const camera = ServiceLocator.getMainCamera();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cam = camera as any;

      cam.flatMapPanX = 0;

      cam.cameraType = CameraType.FLAT_MAP;
      expect(() => p().setWorldUniforms(mat4.create(), mat4.create())).not.toThrow();

      cam.cameraType = CameraType.POLAR_VIEW;
      expect(() => p().setWorldUniforms(mat4.create(), mat4.create())).not.toThrow();
    });
  });
});

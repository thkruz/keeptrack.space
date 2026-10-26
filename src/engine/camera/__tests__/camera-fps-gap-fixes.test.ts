import { Camera } from '@app/engine/camera/camera';
import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/** Stand-in for SelectSatManager with only the fields the camera reads. */
const mockSelectSat = (selectedSat: number) => {
  const ssm = { selectedSat, primarySatObj: null, lastSatCameraType: CameraType.FIXED_TO_SAT_ECI, selectSat: vi.fn() };

  vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue(ssm as never);

  return ssm;
};

describe('Camera FPS gap fixes', () => {
  let camera: Camera;

  beforeEach(() => {
    setupStandardEnvironment();
    camera = new Camera();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    settingsManager.isAutoPanL = false;
  });

  it('Numpad 2 pitches down (the opposite rate of Numpad 8) in FPS', () => {
    camera.cameraType = CameraType.FPS;
    camera.inputHandler.keyDownNumpad8_();
    const up = camera.state.fpsPitchRate;

    camera.inputHandler.keyUpNumpad8_();
    camera.inputHandler.keyDownNumpad2_();
    const down = camera.state.fpsPitchRate;

    expect(up).toBeGreaterThan(0);
    expect(down).toBeLessThan(0);
    expect(down).toBe(-up);
  });

  it('the v key out of FPS with nothing selected lands in Earth view and toasts Earth view, not ECI', () => {
    mockSelectSat(-1);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    camera.cameraType = CameraType.FPS;
    camera.inputHandler.keyDownv_();

    expect(camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(String(toastSpy.mock.calls[0][0])).not.toMatch(/ECI|Fixed to Satellite/u);
  });

  it('the v key out of FPS with a satellite selected goes to the satellite ECI camera', () => {
    const ssm = mockSelectSat(5);

    camera.cameraType = CameraType.FPS;
    camera.changeCameraType();

    expect(ssm.lastSatCameraType).toBe(CameraType.FIXED_TO_SAT_ECI);
    expect(ssm.selectSat).toHaveBeenCalledWith(5);
  });

  it('entering FPS by direct assignment starts from the default pose, never the Earth centre', () => {
    mockSelectSat(-1);
    camera.draw();
    camera.state.fpsPos = [0, 0, 0];
    camera.state.fpsYaw = 12 as never;
    camera.state.fpsPitch = 7 as never;

    camera.cameraType = CameraType.FPS;
    camera.draw();

    expect(Array.from(camera.state.fpsPos)).toEqual([0, 25000, 0]);
    expect(camera.state.fpsYaw).toBe(0);
    expect(camera.state.fpsPitch).toBe(0);
  });

  it('setCameraType(FPS) resets the pose immediately', () => {
    camera.state.fpsPos = [-2, 25003.7, 10.6];
    camera.setCameraType(CameraType.FPS);

    expect(Array.from(camera.state.fpsPos)).toEqual([0, 25000, 0]);
  });

  it('leaving FPS drops the arrow-key pan offset and stops auto-pan', () => {
    mockSelectSat(-1);
    camera.cameraType = CameraType.FPS;
    camera.draw();

    settingsManager.isAutoPanL = true;
    camera.state.panCurrent.x = 16.6;

    camera.cameraType = CameraType.FIXED_TO_EARTH;
    camera.draw();

    expect(settingsManager.isAutoPanL).toBe(false);
    expect(camera.state.panCurrent).toEqual({ x: 0, y: 0, z: 0 });
  });

  describe('restoreCameraType', () => {
    it('falls back to Earth view when the remembered mode needs a satellite that is gone', () => {
      mockSelectSat(-1);
      camera.cameraType = CameraType.FPS;
      camera.restoreCameraType(CameraType.FIXED_TO_SAT_ECI);

      expect(camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
    });

    it('falls back to Earth view when the remembered mode needs a sensor that is gone', () => {
      mockSelectSat(-1);
      vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);
      camera.cameraType = CameraType.FPS;
      camera.restoreCameraType(CameraType.PLANETARIUM);

      expect(camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
    });

    it('returns to a sensor mode while the sensor is still selected', () => {
      mockSelectSat(-1);
      vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(true);
      camera.cameraType = CameraType.FPS;
      camera.restoreCameraType(CameraType.ASTRONOMY);

      expect(camera.cameraType).toBe(CameraType.ASTRONOMY);
    });

    it('re-runs the selection pipeline for a satellite mode', () => {
      const ssm = mockSelectSat(7);

      camera.cameraType = CameraType.FPS;
      camera.restoreCameraType(CameraType.FIXED_TO_SAT_LVLH);

      expect(ssm.lastSatCameraType).toBe(CameraType.FIXED_TO_SAT_LVLH);
      expect(ssm.selectSat).toHaveBeenCalledWith(7);
      expect(camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
    });

    it('never restores FPS itself', () => {
      mockSelectSat(-1);
      camera.cameraType = CameraType.FPS;
      camera.restoreCameraType(CameraType.FPS);

      expect(camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
    });
  });
  it('the v key out of FPS keeps the Earth view zoom (FPS never moves the orbit camera)', () => {
    mockSelectSat(-1);
    camera.state.zoomLevel = 0.4095;
    camera.state.zoomTarget = 0.4095;
    camera.cameraType = CameraType.FPS;

    camera.inputHandler.keyDownv_();

    expect(camera.cameraType).toBe(CameraType.FIXED_TO_EARTH);
    expect(camera.state.zoomTarget).toBeCloseTo(0.4095, 6);
  });

  describe('v cycle with nothing selected', () => {
    beforeEach(() => {
      mockSelectSat(-1);
      vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);
    });

    it('Earth view goes to the flat map when its delegate is registered (no satellite needed)', () => {
      vi.spyOn(camera, 'hasModeDelegate').mockReturnValue(true);
      camera.cameraType = CameraType.FIXED_TO_EARTH;

      camera.changeCameraType();

      expect(camera.cameraType).toBe(CameraType.FLAT_MAP);
    });

    it('the flat map skips both satellite modes and the sensor modes, landing in FPS', () => {
      vi.spyOn(camera, 'hasModeDelegate').mockReturnValue(true);
      camera.cameraType = CameraType.FLAT_MAP;

      camera.changeCameraType();

      expect(camera.cameraType).toBe(CameraType.FPS);
    });

    it('Earth view without the flat map delegate skips ECI and LVLH (never lands in a satellite mode)', () => {
      vi.spyOn(camera, 'hasModeDelegate').mockReturnValue(false);
      camera.cameraType = CameraType.FIXED_TO_EARTH;

      camera.changeCameraType();

      expect(camera.cameraType).toBe(CameraType.FPS);
    });
  });

  it('with a satellite selected, the flat map goes to ECI (not skipped)', () => {
    const ssm = mockSelectSat(5);

    camera.cameraType = CameraType.FLAT_MAP;
    camera.changeCameraType();

    expect(ssm.lastSatCameraType).toBe(CameraType.FIXED_TO_SAT_ECI);
    expect(ssm.selectSat).toHaveBeenCalledWith(5);
  });
});

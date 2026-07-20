import { SatMath } from '@app/app/analysis/sat-math';
import { Camera } from '@app/engine/camera/camera';
import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { DEG2RAD, GreenwichMeanSiderealTime, Kilometers, Milliseconds, Radians, Satellite } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { vi } from 'vitest';

const testFuncWithAllCameraTypes = (testFunc: () => void, cameraInstance: Camera) => {
  cameraInstance.cameraType = CameraType.FIXED_TO_EARTH;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.FPS;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.SATELLITE_FIRST_PERSON;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.ASTRONOMY;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.PLANETARIUM;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.FIXED_TO_SAT_LVLH;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.FIXED_TO_SAT_ECI;
  expect(testFunc).not.toThrow();
};

describe('Camera.setFieldOfView', () => {
  let cameraInstance: Camera;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priv = () => cameraInstance as any;

  beforeEach(() => {
    cameraInstance = new Camera();
    settingsManager.fieldOfView = 0.6 as Radians;
  });

  it('holds the FOV across lerp updates (value and target move together)', () => {
    // Seed the lerp target at the current value
    priv().updateFovLerp_(16 as Milliseconds);

    cameraInstance.setFieldOfView(0.1047 as Radians);

    for (let i = 0; i < 20; i++) {
      priv().updateFovLerp_(100 as Milliseconds);
    }

    expect(cameraInstance.fov).toBeCloseTo(0.1047, 6);
    // The camera no longer clobbers the settings default
    expect(settingsManager.fieldOfView).toBeCloseTo(0.6, 6);
  });

  it('raw settingsManager.fieldOfView writes get pulled back toward the old target', () => {
    // Seed the lerp target at 0.6
    priv().updateFovLerp_(16 as Milliseconds);

    settingsManager.fieldOfView = 0.1047 as Radians;

    for (let i = 0; i < 200; i++) {
      priv().updateFovLerp_(100 as Milliseconds);
    }

    // This is the behavior setFieldOfView exists to avoid
    expect(cameraInstance.fov).toBeCloseTo(0.6, 3);
  });

  it('falls back to the settings FOV until the camera writes its own value', () => {
    expect(cameraInstance.fov).toBeCloseTo(0.6, 6);

    settingsManager.fieldOfView = 0.8 as Radians;
    expect(cameraInstance.fov).toBeCloseTo(0.8, 6);

    // Once the camera owns its FOV, settings writes no longer leak in
    cameraInstance.setFieldOfView(0.5 as Radians);
    settingsManager.fieldOfView = 1.0 as Radians;
    expect(cameraInstance.fov).toBeCloseTo(0.5, 6);
  });
});

describe('Camera.rollTouchTwist', () => {
  let cameraInstance: Camera;

  beforeEach(() => {
    cameraInstance = new Camera();
    settingsManager.isLocalRotateEnabled = true;
  });

  it('accumulates roll into both current and target and zeroes the roll speed', () => {
    cameraInstance.state.localRotateSpeed.roll = 0.5 as Radians;

    cameraInstance.rollTouchTwist(0.2 as Radians);
    cameraInstance.rollTouchTwist(0.1 as Radians);

    expect(cameraInstance.state.localRotateCurrent.roll).toBeCloseTo(0.3);
    expect(cameraInstance.state.localRotateTarget.roll).toBeCloseTo(0.3);
    expect(cameraInstance.state.localRotateSpeed.roll).toBe(0);
  });

  it('normalizes the accumulated roll to [-PI, PI]', () => {
    cameraInstance.state.localRotateCurrent.roll = 3.1 as Radians;

    cameraInstance.rollTouchTwist(0.2 as Radians);

    expect(cameraInstance.state.localRotateCurrent.roll).toBeCloseTo(3.3 - 2 * Math.PI);
  });

  it('ignores twists when local rotation is disabled or the delta is not finite', () => {
    settingsManager.isLocalRotateEnabled = false;
    cameraInstance.rollTouchTwist(0.2 as Radians);
    expect(cameraInstance.state.localRotateCurrent.roll).toBe(0);

    settingsManager.isLocalRotateEnabled = true;
    cameraInstance.rollTouchTwist(NaN as Radians);
    expect(cameraInstance.state.localRotateCurrent.roll).toBe(0);
  });
});

describe('Camera.zoomTouchPinch', () => {
  let cameraInstance: Camera;
  // Satellite at 7000 km from Earth center (~629 km altitude)
  const targetDist = 7000;
  const zoomAt = (dist: number) => cameraInstance.getZoomFromDistance(dist as Kilometers);

  beforeEach(() => {
    cameraInstance = new Camera();
    cameraInstance.cameraType = CameraType.FIXED_TO_SAT_ECI;
    // Mobile clears camZoomSnappedOnSat right after the selection snap
    cameraInstance.state.camZoomSnappedOnSat = false;
    cameraInstance.state.minDistanceFromTarget = 0.15 as Kilometers;
    settingsManager.touchPinchSensitivity = 0.5;
    settingsManager.nearZoomLevel = 25 as Kilometers;
    settingsManager.minZoomDistance = (RADIUS_OF_EARTH + 50) as Kilometers;
    settingsManager.maxZoomDistance = 1.2e6 as Kilometers;
    settingsManager.isZoomStopsSnappedOnSat = false;
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({
      selectedSat: 42,
      primarySatObj: { id: 42, position: { x: targetDist, y: 0, z: 0 } },
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dollies proportionally in standoff space within the close-camera range', () => {
    cameraInstance.state.zoomTarget = zoomAt(targetDist + 10);

    cameraInstance.zoomTouchPinch(1.2); // dampened ratio 1.1

    expect(cameraInstance.state.isZoomIn).toBe(true);
    expect(cameraInstance.state.camDistBuffer).toBeCloseTo(10 / 1.1, 4);
    expect(cameraInstance.state.zoomTarget).toBeCloseTo(zoomAt(targetDist + 10 / 1.1), 6);
  });

  it('clamps the standoff at the per-target minimum distance', () => {
    cameraInstance.state.zoomTarget = zoomAt(targetDist + 0.2);

    cameraInstance.zoomTouchPinch(3); // dampened ratio 2 -> 0.1 km, below the 0.15 km floor

    expect(cameraInstance.state.camDistBuffer).toBeCloseTo(0.15, 6);
  });

  it('escapes to Earth-centered zoom when pinching out past the close-camera range', () => {
    cameraInstance.state.zoomTarget = zoomAt(targetDist + 20);
    const zoomBefore = cameraInstance.state.zoomTarget;

    cameraInstance.zoomTouchPinch(0.5); // dampened ratio 0.75 -> 26.7 km standoff, past 25 km

    expect(cameraInstance.state.isZoomIn).toBe(false);
    expect(cameraInstance.state.zoomTarget).toBeCloseTo(zoomBefore / 0.75, 6);
  });

  it('reaches a whole-Earth view in a bounded number of pinch-out strokes', () => {
    cameraInstance.state.zoomTarget = zoomAt(targetDist + 0.15);

    // Fourteen full pinch-out strokes of 60 incremental events each (~2% finger travel per event).
    // Pure proportional standoff zoom would still be under 1000 km after this much input.
    for (let stroke = 0; stroke < 14; stroke++) {
      for (let i = 0; i < 60; i++) {
        cameraInstance.zoomTouchPinch(0.98);
      }
    }

    expect(cameraInstance.calcDistanceBasedOnZoom(cameraInstance.state.zoomTarget)).toBeGreaterThan(40000);
  });

  it('never leaves standoff space when a per-mode standoff cap is set (companion ride-along)', () => {
    cameraInstance.state.maxDistanceFromTarget = 10 as Kilometers;
    cameraInstance.state.zoomTarget = zoomAt(targetDist + 8);

    for (let i = 0; i < 3; i++) {
      cameraInstance.zoomTouchPinch(0.5);
    }

    expect(cameraInstance.state.camDistBuffer).toBeCloseTo(10, 6);
    expect(cameraInstance.state.zoomTarget).toBeCloseTo(zoomAt(targetDist + 10), 6);
  });

  it('lands an Earth-centered pinch-in on the close-range boundary instead of diving past it', () => {
    cameraInstance.state.zoomTarget = zoomAt(targetDist + 5000);

    cameraInstance.zoomTouchPinch(3); // dampened ratio 2 halves zoomTarget, diving below the satellite

    expect(cameraInstance.state.camDistBuffer).toBeCloseTo(25, 4);
    expect(cameraInstance.state.zoomTarget).toBeCloseTo(zoomAt(targetDist + 25), 6);
  });

  it('stays in camDistBuffer space while zoom-snapped (desktop touchscreens)', () => {
    cameraInstance.state.camZoomSnappedOnSat = true;
    cameraInstance.state.camDistBuffer = 100 as Kilometers;

    cameraInstance.zoomTouchPinch(0.5); // dampened ratio 0.75, beyond nearZoomLevel but snapped

    expect(cameraInstance.state.camZoomSnappedOnSat).toBe(true);
    expect(cameraInstance.state.camDistBuffer).toBeCloseTo(100 / 0.75, 3);
    expect(cameraInstance.state.zoomTarget).toBeCloseTo(zoomAt(targetDist + 100 / 0.75), 6);
  });

  it('falls back to Earth-centered zoom when no satellite is focused', () => {
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({
      selectedSat: -1,
      primarySatObj: { id: -1 },
    } as never);
    cameraInstance.cameraType = CameraType.FIXED_TO_EARTH;
    cameraInstance.state.zoomTarget = 0.5;

    cameraInstance.zoomTouchPinch(0.8); // dampened ratio 0.9

    expect(cameraInstance.state.zoomTarget).toBeCloseTo(0.5 / 0.9, 6);
  });
});

describe('Camera roll-compensated drag', () => {
  let cameraInstance: Camera;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priv = () => cameraInstance as any;
  let wasMobile: boolean;

  beforeEach(() => {
    cameraInstance = new Camera();
    wasMobile = settingsManager.isMobileModeEnabled;
    // Forces the screen-drag branch of updatePitchYawSpeeds_ (no earth raycasting)
    settingsManager.isMobileModeEnabled = true;
    cameraInstance.state.isDragging = true;
    cameraInstance.state.screenDragPoint = [100, 100];
    cameraInstance.state.mouseX = 200; // dragged right by 100px
    cameraInstance.state.mouseY = 100;
  });

  afterEach(() => {
    settingsManager.isMobileModeEnabled = wasMobile;
  });

  it('maps a horizontal drag to yaw only when the view is not rolled', () => {
    priv().updatePitchYawSpeeds_(16 as Milliseconds);

    expect(cameraInstance.state.camYawSpeed).not.toBe(0);
    expect(cameraInstance.state.camPitchSpeed).toBeCloseTo(0, 10);
  });

  it('maps a horizontal drag to pitch when the view is rolled 90 degrees', () => {
    cameraInstance.state.localRotateCurrent.roll = (Math.PI / 2) as Radians;

    priv().updatePitchYawSpeeds_(16 as Milliseconds);

    expect(cameraInstance.state.camPitchSpeed).not.toBe(0);
    expect(cameraInstance.state.camYawSpeed).toBeCloseTo(0, 10);
  });

  it('rotates release momentum by the current roll', () => {
    cameraInstance.state.isDragging = false;
    priv().wasDragging_ = true;
    cameraInstance.state.dragVelocityX = 10;
    cameraInstance.state.dragVelocityY = 0;
    cameraInstance.state.localRotateCurrent.roll = (Math.PI / 2) as Radians;

    priv().updatePitchYawSpeeds_(16 as Milliseconds);

    // Screen-horizontal fling on a 90-degree-rolled view coasts in pitch, not yaw
    expect(cameraInstance.state.camPitchSpeed).not.toBe(0);
    expect(cameraInstance.state.camYawSpeed).toBeCloseTo(0, 10);
  });
});

describe('Camera Key Input', () => {
  let cameraInstance: Camera;

  beforeEach(() => {
    cameraInstance = new Camera();
  });
  it('should handle V', () => {
    const testFunc = () => cameraInstance.inputHandler.keyDownv_();

    for (let i = 0; i < 25; i++) {
      expect(testFunc).not.toThrow();
    }

    cameraInstance.changeCameraType = () => {
      cameraInstance.cameraType = CameraType.SATELLITE_FIRST_PERSON;
    };
    for (let i = 0; i < 5; i++) {
      expect(testFunc).not.toThrow();
    }
    cameraInstance.changeCameraType = () => {
      cameraInstance.cameraType = CameraType.ASTRONOMY;
    };
    for (let i = 0; i < 5; i++) {
      expect(testFunc).not.toThrow();
    }
    cameraInstance.changeCameraType = () => {
      cameraInstance.cameraType = CameraType.PLANETARIUM;
    };
    for (let i = 0; i < 5; i++) {
      expect(testFunc).not.toThrow();
    }
  });
  it('should handle W', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownW_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpW_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle A', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownA_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpA_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle D', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownD_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpD_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle E', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownE_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpE_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad8', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownNumpad8_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpNumpad8_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad4', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownNumpad4_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpNumpad4_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad6', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownNumpad6_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpNumpad6_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad2', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownNumpad2_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpNumpad2_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Q', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownQ_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpQ_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle S', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownS_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpS_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle R', () => {
    const testFunc = () => cameraInstance.inputHandler.keyDownr_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle keyDownShift_', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownShift_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpShift_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle keyDownShiftRight_', () => {
    let testFunc = () => cameraInstance.inputHandler.keyDownShiftRight_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.inputHandler.keyUpShiftRight_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
});

describe('Camera Draw', () => {
  let cameraInstance: Camera;
  let sensorData = {
    x: 0,
    y: 0,
    z: 0,
    gmst: 0 as GreenwichMeanSiderealTime,
    lat: 0,
    lon: 0,
  };

  beforeEach(() => {
    const now = new Date();

    cameraInstance = new Camera();
    const sensor = defaultSensor;

    const { gmst } = SatMath.calculateTimeVariables(now);

    const cosLat = Math.cos(sensor.lat * DEG2RAD);
    const sinLat = Math.sin(sensor.lat * DEG2RAD);
    const cosLon = Math.cos(sensor.lon * DEG2RAD + gmst);
    const sinLon = Math.sin(sensor.lon * DEG2RAD + gmst);

    sensorData = {
      x: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon,
      y: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon,
      z: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat,
      gmst,
      lat: sensor.lat,
      lon: sensor.lon,
    };
  });

  // test normal draw
  it('test_normal_draw', () => {
    const testResult = () => {
      cameraInstance.draw(sensorData);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with no target
  it('test_draw_no_target', () => {
    const testResult = () => {
      cameraInstance.draw(sensorData);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with no sensor
  it('test_draw_no_sensor', () => {
    const testResult = () => {
      cameraInstance.draw(null);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with no target and no sensor
  it('test_draw_no_target_no_sensor', () => {
    const testResult = () => {
      cameraInstance.draw(null);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with bad camPitch
  it('test_draw_bad_cam_pitch', () => {
    const testResult = () => {
      cameraInstance.state.camPitch = NaN as unknown as Radians;
      cameraInstance.draw(sensorData);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with bad camYaw against all camera types
  it('test_draw_bad_cam_yaw', () => {
    let testResult = () => {
      cameraInstance.state.camYaw = NaN as unknown as Radians;
      cameraInstance.draw(sensorData);
    };

    testFuncWithAllCameraTypes(testResult, cameraInstance);

    testResult = () => {
      cameraInstance.state.camYaw = NaN as unknown as Radians;
      cameraInstance.draw();
    };
    testFuncWithAllCameraTypes(testResult, cameraInstance);
  });

  // test draw with all camera types
  it('test_draw_all_camera_types', () => {
    let testFunc = () => cameraInstance.draw(sensorData);

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.draw(null);
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.draw(null);
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.draw(null);
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
});

describe('Camera snapToSat', () => {
  let cameraInstance: Camera;

  beforeEach(() => {
    cameraInstance = new Camera();
  });

  // test snapToSat with no target
  it('test_snap_to_sat_no_target', () => {
    const testFunc = () => cameraInstance.snapToSat(null as unknown as Satellite, new Date());

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with bad target data
  it('test_snap_to_sat_bad_target_data', () => {
    defaultSat.position = null as unknown as { x: Kilometers; y: Kilometers; z: Kilometers };
    const testFunc = () => cameraInstance.snapToSat(defaultSat, new Date());

    expect(() => testFunc()).toThrow();
  });

  // test snapToSat with normal data
  it('test_snap_to_sat_normal_data', () => {
    defaultSat.position = { x: 0 as Kilometers, y: 0 as Kilometers, z: 6000 as Kilometers };
    const testFunc = () => cameraInstance.snapToSat(defaultSat, new Date());

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with camAngleSnappedOnSat
  it('test_snap_to_sat_cam_angle_snapped_on_sat', () => {
    const testFunc = () => {
      cameraInstance.state.camAngleSnappedOnSat = true;
      defaultSat.position = { x: 0 as Kilometers, y: 0 as Kilometers, z: 6000 as Kilometers };
      cameraInstance.snapToSat(defaultSat, new Date());
    };

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with camAngleSnappedOnSat and camSnapToSat.yaw bad
  it('test_snap_to_sat_cam_angle_snapped_on_sat_cam_snap_to_sat_yaw_bad', () => {
    const testFunc = () => {
      cameraInstance.state.camAngleSnappedOnSat = true;
      defaultSat.position = {
        x: 'bad' as unknown as Kilometers,
        y: 'bad' as unknown as Kilometers,
        z: 6000 as Kilometers,
      };
      cameraInstance.snapToSat(defaultSat, new Date());
    };

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with camZoomSnappedOnSat
  it('test_snap_to_sat_cam_zoom_snapped_on_sat', () => {
    const testFunc = () => {
      cameraInstance.state.camZoomSnappedOnSat = true;
      cameraInstance.snapToSat(defaultSat, new Date());
    };

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with camZoomSnappedOnSat with bad target data
  it('test_snap_to_sat_cam_zoom_snapped_on_sat_bad_target_data', () => {
    const testFunc = () => {
      cameraInstance.state.camZoomSnappedOnSat = true;
      defaultSat.position = {
        x: 'bad' as unknown as Kilometers,
        y: 'bad' as unknown as Kilometers,
        z: 6000 as Kilometers,
      };
      cameraInstance.snapToSat(defaultSat, new Date());
    };

    expect(testFunc).not.toThrow();
  });

  // Test snapToSat with all camera types
  it('test_snap_to_sat_all_camera_types', () => {
    const testFunc = () => cameraInstance.snapToSat(defaultSat, new Date());

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
});

// test Camera update with all camera types
describe('Camera update', () => {
  let cameraInstance: Camera;

  beforeEach(() => {
    cameraInstance = new Camera();
  });

  it('test_update_all_camera_types', () => {
    const testFunc = () => cameraInstance.update(16 as Milliseconds);

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });

  // test update with various key presses
  it('test_update_key_presses', () => {
    const testFunc = () => {
      cameraInstance.cameraType = CameraType.FPS;
      cameraInstance.update(16 as Milliseconds);
    };
    const testFunc2 = () => {
      testVariousKeyDownInputs(testFunc, cameraInstance);
      testVariousKeyUpInputs(testFunc, cameraInstance);
      testVariousKeyCombinationInputs(testFunc, cameraInstance);
    };

    testFuncWithAllCameraTypes(testFunc2, cameraInstance);
  });
});

const testVariousKeyDownInputs = (testFunc: () => void, cameraInstance: Camera) => {
  cameraInstance.inputHandler.keyDownW_();
  testFunc();

  cameraInstance.inputHandler.keyDownA_();
  testFunc();

  cameraInstance.inputHandler.keyDownD_();
  testFunc();

  cameraInstance.inputHandler.keyDownE_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowDown_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowLeft_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowRight_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowUp_();
  testFunc();

  cameraInstance.inputHandler.keyDownQ_();
  testFunc();

  cameraInstance.inputHandler.keyDownS_();
  testFunc();

  cameraInstance.inputHandler.keyDownr_();
  testFunc();

  cameraInstance.inputHandler.keyDownShift_();
  testFunc();

  cameraInstance.inputHandler.keyDownShiftRight_();
  testFunc();

  // Combination of key presses
  cameraInstance.inputHandler.keyDownW_();
  cameraInstance.inputHandler.keyDownA_();
  testFunc();

  cameraInstance.inputHandler.keyDownS_();
  cameraInstance.inputHandler.keyDownD_();
  testFunc();

  cameraInstance.inputHandler.keyDownQ_();
  cameraInstance.inputHandler.keyDownE_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowUp_();
  cameraInstance.inputHandler.keyDownArrowDown_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowLeft_();
  cameraInstance.inputHandler.keyDownArrowRight_();
  testFunc();

  cameraInstance.inputHandler.keyDownShift_();
  cameraInstance.inputHandler.keyDownShiftRight_();
  testFunc();
};

const testVariousKeyUpInputs = (testFunc: () => void, cameraInstance: Camera) => {
  cameraInstance.inputHandler.keyUpW_();
  testFunc();

  cameraInstance.inputHandler.keyUpA_();
  testFunc();

  cameraInstance.inputHandler.keyUpD_();
  testFunc();

  cameraInstance.inputHandler.keyUpE_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowUp_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowDown_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowLeft_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowRight_();
  testFunc();

  cameraInstance.inputHandler.keyUpQ_();
  testFunc();

  cameraInstance.inputHandler.keyUpS_();
  testFunc();

  cameraInstance.inputHandler.keyUpShift_();
  testFunc();

  cameraInstance.inputHandler.keyUpShiftRight_();
  testFunc();

  // Combination of key presses
  cameraInstance.inputHandler.keyUpW_();
  cameraInstance.inputHandler.keyUpA_();
  testFunc();

  cameraInstance.inputHandler.keyUpS_();
  cameraInstance.inputHandler.keyUpD_();
  testFunc();

  cameraInstance.inputHandler.keyUpQ_();
  cameraInstance.inputHandler.keyUpE_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowUp_();
  cameraInstance.inputHandler.keyUpArrowDown_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowLeft_();
  cameraInstance.inputHandler.keyUpArrowRight_();
  testFunc();

  cameraInstance.inputHandler.keyUpShift_();
  cameraInstance.inputHandler.keyUpShiftRight_();
  testFunc();
};

const testVariousKeyCombinationInputs = (testFunc: () => void, cameraInstance: Camera) => {
  // Combination of key presses and releases
  cameraInstance.inputHandler.keyDownW_();
  cameraInstance.inputHandler.keyUpA_();
  testFunc();

  cameraInstance.inputHandler.keyDownS_();
  cameraInstance.inputHandler.keyUpD_();
  testFunc();

  cameraInstance.inputHandler.keyDownQ_();
  cameraInstance.inputHandler.keyUpE_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowUp_();
  cameraInstance.inputHandler.keyUpArrowDown_();
  testFunc();

  cameraInstance.inputHandler.keyDownArrowLeft_();
  cameraInstance.inputHandler.keyUpArrowRight_();
  testFunc();

  cameraInstance.inputHandler.keyDownShift_();
  cameraInstance.inputHandler.keyUpShiftRight_();
  testFunc();

  // Reverse combination of key presses and releases
  cameraInstance.inputHandler.keyUpW_();
  cameraInstance.inputHandler.keyDownA_();
  testFunc();

  cameraInstance.inputHandler.keyUpS_();
  cameraInstance.inputHandler.keyDownD_();
  testFunc();

  cameraInstance.inputHandler.keyUpQ_();
  cameraInstance.inputHandler.keyDownE_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowUp_();
  cameraInstance.inputHandler.keyUpArrowDown_();
  testFunc();

  cameraInstance.inputHandler.keyUpArrowLeft_();
  cameraInstance.inputHandler.keyUpArrowRight_();
  testFunc();

  cameraInstance.inputHandler.keyUpShift_();
  cameraInstance.inputHandler.keyDownShiftRight_();
  testFunc();
};

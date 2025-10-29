import { SatMath } from '@app/app/analysis/sat-math';
import { Camera, CameraType } from '@app/engine/camera/camera';
import { PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { DEG2RAD, DetailedSatellite, GreenwichMeanSiderealTime, Kilometers, Milliseconds, Radians } from '@ootk/src/main';
import { defaultSat, defaultSensor } from './environment/apiMocks';

const testFuncWithAllCameraTypes = (testFunc: () => void, cameraInstance: Camera) => {
  cameraInstance.cameraType = CameraType.FIXED_TO_EARTH;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.OFFSET;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.FPS;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.SATELLITE;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.ASTRONOMY;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.PLANETARIUM;
  expect(testFunc).not.toThrow();
  cameraInstance.cameraType = CameraType.FIXED_TO_SAT;
  expect(testFunc).not.toThrow();
};

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
      cameraInstance.cameraType = CameraType.SATELLITE;
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
    const testFunc = () => cameraInstance.snapToSat(null as unknown as DetailedSatellite, new Date());

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

import { PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/lib/constants';
import { Camera, CameraType } from '@app/singletons/camera';
import { SatMath } from '@app/static/sat-math';
import { DEG2RAD, GreenwichMeanSiderealTime, Kilometers, Milliseconds, Radians } from 'ootk';
import { defaultSat, defaultSensor } from './environment/apiMocks';

const testFuncWithAllCameraTypes = (testFunc: () => void, cameraInstance: Camera) => {
  cameraInstance.cameraType = CameraType.DEFAULT;
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
    const testFunc = () => cameraInstance.keyDownV_();

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
    let testFunc = () => cameraInstance.keyDownW_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpW_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle A', () => {
    let testFunc = () => cameraInstance.keyDownA_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpA_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle D', () => {
    let testFunc = () => cameraInstance.keyDownD_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpD_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle E', () => {
    let testFunc = () => cameraInstance.keyDownE_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpE_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad8', () => {
    let testFunc = () => cameraInstance.keyDownNumpad8_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpNumpad8_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad4', () => {
    let testFunc = () => cameraInstance.keyDownNumpad4_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpNumpad4_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad6', () => {
    let testFunc = () => cameraInstance.keyDownNumpad6_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpNumpad6_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Numpad2', () => {
    let testFunc = () => cameraInstance.keyDownNumpad2_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpNumpad2_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle Q', () => {
    let testFunc = () => cameraInstance.keyDownQ_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpQ_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle S', () => {
    let testFunc = () => cameraInstance.keyDownS_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpS_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle R', () => {
    const testFunc = () => cameraInstance.keyDownR_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle keyDownShift_', () => {
    let testFunc = () => cameraInstance.keyDownShift_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpShift_();
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
  });
  it('should handle keyDownShiftRight_', () => {
    let testFunc = () => cameraInstance.keyDownShiftRight_();

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.keyUpShiftRight_();
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
      cameraInstance.draw(defaultSat, sensorData);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with no target
  it('test_draw_no_target', () => {
    const testResult = () => {
      cameraInstance.draw(null, sensorData);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with no sensor
  it('test_draw_no_sensor', () => {
    const testResult = () => {
      cameraInstance.draw(defaultSat, null);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with no target and no sensor
  it('test_draw_no_target_no_sensor', () => {
    const testResult = () => {
      cameraInstance.draw(null, null);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with bad camPitch
  it('test_draw_bad_cam_pitch', () => {
    const testResult = () => {
      cameraInstance.camPitch = NaN as unknown as Radians;
      cameraInstance.draw(defaultSat, sensorData);
    };

    expect(testResult).not.toThrow();
  });

  // test draw with bad camYaw against all camera types
  it('test_draw_bad_cam_yaw', () => {
    let testResult = () => {
      cameraInstance.camYaw = NaN as unknown as Radians;
      cameraInstance.draw(defaultSat, sensorData);
    };

    testFuncWithAllCameraTypes(testResult, cameraInstance);

    testResult = () => {
      cameraInstance.camYaw = NaN as unknown as Radians;
      cameraInstance.draw(defaultSat);
    };
    testFuncWithAllCameraTypes(testResult, cameraInstance);
  });

  // test draw with all camera types
  it('test_draw_all_camera_types', () => {
    let testFunc = () => cameraInstance.draw(defaultSat, sensorData);

    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.draw(defaultSat, null);
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.draw(null);
    testFuncWithAllCameraTypes(testFunc, cameraInstance);
    testFunc = () => cameraInstance.draw(null, null);
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
    const testFunc = () => cameraInstance.snapToSat(null, new Date());

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with bad target data
  it('test_snap_to_sat_bad_target_data', () => {
    defaultSat.position = null;
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
      cameraInstance.camAngleSnappedOnSat = true;
      defaultSat.position = { x: 0 as Kilometers, y: 0 as Kilometers, z: 6000 as Kilometers };
      cameraInstance.snapToSat(defaultSat, new Date());
    };

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with camAngleSnappedOnSat and camSnapToSat.yaw bad
  it('test_snap_to_sat_cam_angle_snapped_on_sat_cam_snap_to_sat_yaw_bad', () => {
    const testFunc = () => {
      cameraInstance.camAngleSnappedOnSat = true;
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
      cameraInstance.camZoomSnappedOnSat = true;
      cameraInstance.snapToSat(defaultSat, new Date());
    };

    expect(testFunc).not.toThrow();
  });

  // test snapToSat with camZoomSnappedOnSat with bad target data
  it('test_snap_to_sat_cam_zoom_snapped_on_sat_bad_target_data', () => {
    const testFunc = () => {
      cameraInstance.camZoomSnappedOnSat = true;
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
  cameraInstance.keyDownW_();
  testFunc();

  cameraInstance.keyDownA_();
  testFunc();

  cameraInstance.keyDownD_();
  testFunc();

  cameraInstance.keyDownE_();
  testFunc();

  cameraInstance.keyDownArrowDown_();
  testFunc();

  cameraInstance.keyDownArrowLeft_();
  testFunc();

  cameraInstance.keyDownArrowRight_();
  testFunc();

  cameraInstance.keyDownArrowUp_();
  testFunc();

  cameraInstance.keyDownQ_();
  testFunc();

  cameraInstance.keyDownS_();
  testFunc();

  cameraInstance.keyDownR_();
  testFunc();

  cameraInstance.keyDownShift_();
  testFunc();

  cameraInstance.keyDownShiftRight_();
  testFunc();

  // Combination of key presses
  cameraInstance.keyDownW_();
  cameraInstance.keyDownA_();
  testFunc();

  cameraInstance.keyDownS_();
  cameraInstance.keyDownD_();
  testFunc();

  cameraInstance.keyDownQ_();
  cameraInstance.keyDownE_();
  testFunc();

  cameraInstance.keyDownArrowUp_();
  cameraInstance.keyDownArrowDown_();
  testFunc();

  cameraInstance.keyDownArrowLeft_();
  cameraInstance.keyDownArrowRight_();
  testFunc();

  cameraInstance.keyDownShift_();
  cameraInstance.keyDownShiftRight_();
  testFunc();
};

const testVariousKeyUpInputs = (testFunc: () => void, cameraInstance: Camera) => {
  cameraInstance.keyUpW_();
  testFunc();

  cameraInstance.keyUpA_();
  testFunc();

  cameraInstance.keyUpD_();
  testFunc();

  cameraInstance.keyUpE_();
  testFunc();

  cameraInstance.keyUpArrowUp_();
  testFunc();

  cameraInstance.keyUpArrowDown_();
  testFunc();

  cameraInstance.keyUpArrowLeft_();
  testFunc();

  cameraInstance.keyUpArrowRight_();
  testFunc();

  cameraInstance.keyUpQ_();
  testFunc();

  cameraInstance.keyUpS_();
  testFunc();

  cameraInstance.keyUpShift_();
  testFunc();

  cameraInstance.keyUpShiftRight_();
  testFunc();

  // Combination of key presses
  cameraInstance.keyUpW_();
  cameraInstance.keyUpA_();
  testFunc();

  cameraInstance.keyUpS_();
  cameraInstance.keyUpD_();
  testFunc();

  cameraInstance.keyUpQ_();
  cameraInstance.keyUpE_();
  testFunc();

  cameraInstance.keyUpArrowUp_();
  cameraInstance.keyUpArrowDown_();
  testFunc();

  cameraInstance.keyUpArrowLeft_();
  cameraInstance.keyUpArrowRight_();
  testFunc();

  cameraInstance.keyUpShift_();
  cameraInstance.keyUpShiftRight_();
  testFunc();
};

const testVariousKeyCombinationInputs = (testFunc: () => void, cameraInstance: Camera) => {
  // Combination of key presses and releases
  cameraInstance.keyDownW_();
  cameraInstance.keyUpA_();
  testFunc();

  cameraInstance.keyDownS_();
  cameraInstance.keyUpD_();
  testFunc();

  cameraInstance.keyDownQ_();
  cameraInstance.keyUpE_();
  testFunc();

  cameraInstance.keyDownArrowUp_();
  cameraInstance.keyUpArrowDown_();
  testFunc();

  cameraInstance.keyDownArrowLeft_();
  cameraInstance.keyUpArrowRight_();
  testFunc();

  cameraInstance.keyDownShift_();
  cameraInstance.keyUpShiftRight_();
  testFunc();

  // Reverse combination of key presses and releases
  cameraInstance.keyUpW_();
  cameraInstance.keyDownA_();
  testFunc();

  cameraInstance.keyUpS_();
  cameraInstance.keyDownD_();
  testFunc();

  cameraInstance.keyUpQ_();
  cameraInstance.keyDownE_();
  testFunc();

  cameraInstance.keyUpArrowUp_();
  cameraInstance.keyUpArrowDown_();
  testFunc();

  cameraInstance.keyUpArrowLeft_();
  cameraInstance.keyUpArrowRight_();
  testFunc();

  cameraInstance.keyUpShift_();
  cameraInstance.keyDownShiftRight_();
  testFunc();
};

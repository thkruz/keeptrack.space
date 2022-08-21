/* eslint-disable no-undefined */
import { defaultSat, keepTrackApiStubs } from '../api/apiMocks';
import { DotsManager, SatObject } from '../api/keepTrackTypes';
import { DrawManager } from '../drawManager/drawManager';
import { ObjectManager } from '../objectManager/objectManager';
import { OrbitManager } from '../orbitManager/orbitManager';
import { SensorManager } from '../plugins/sensor/sensorManager';
import * as camera from './camera';
import { keyDownHandler, keyUpHandler } from './keyHandler';
import { setFtsRotateReset, setIsLocalRotateOverride, setIsLocalRotateRoll, setIsLocalRotateYaw, setIsPanReset, setIsScreenPan, setIsWorldPan } from './overrides';
import { alt2zoom, lat2pitch, lon2yaw, normalizeAngle } from './transforms';

const generateKeyboardEvent = (key: string) => <KeyboardEvent>{ key: key };

// @ponicode
describe('camera.normalizeAngle', () => {
  test('0', () => {
    let callFunction: any = () => {
      normalizeAngle(1.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      normalizeAngle(10.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      normalizeAngle(0.1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      normalizeAngle(2.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      normalizeAngle(0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      normalizeAngle(-Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('lon2yaw', () => {
  test('0', () => {
    let param2: any = new Date('01-01-2030');
    let callFunction: any = () => {
      lon2yaw(1, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let param2: any = new Date('01-01-2030');
    let callFunction: any = () => {
      lon2yaw(0, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let param2: any = new Date('01-13-2020');
    let callFunction: any = () => {
      lon2yaw(100, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let param2: any = new Date('01-13-2020');
    let callFunction: any = () => {
      lon2yaw(1, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let param2: any = new Date('01-01-2020');
    let callFunction: any = () => {
      lon2yaw(-5.48, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let param2: any = new Date('');
    let callFunction: any = () => {
      lon2yaw(Infinity, param2);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('lat2pitch', () => {
  test('0', () => {
    let callFunction: any = () => {
      lat2pitch(320);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      lat2pitch(4);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      lat2pitch(30);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      lat2pitch(100);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      lat2pitch(400);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      lat2pitch(Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.resetFpsPos', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.resetFpsPos();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.fpsMovement', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.fpsMovement();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.getCamDist', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.getCamDist();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.alt2zoom', () => {
  test('0', () => {
    let callFunction: any = () => {
      alt2zoom(-100);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      alt2zoom(-5.48);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      alt2zoom(1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      alt2zoom(0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      alt2zoom(100);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      alt2zoom(-Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.autoRotate', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.autoRotate(false);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.autoRotate(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.autoRotate(undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.autoPan', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.autoPan(false);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.autoPan(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.autoPan(undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.changeZoom', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.changeZoom(0.1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.changeZoom(10.0);
    };

    expect(callFunction).toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.changeZoom(0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.changeZoom(1.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.changeZoom('leo');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.changeZoom(-Infinity);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('camera.changeCameraType', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.changeCameraType(
        <OrbitManager>(<unknown>keepTrackApiStubs.programs.orbitManager),
        <DrawManager>(<unknown>keepTrackApiStubs.programs.drawManager),
        <ObjectManager>{ selectedSat: 1, isSensorManagerLoaded: false },
        <SensorManager>(<unknown>keepTrackApiStubs.programs.sensorManager)
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.changeCameraType(
        <OrbitManager>(<unknown>keepTrackApiStubs.programs.orbitManager),
        <DrawManager>(<unknown>keepTrackApiStubs.programs.drawManager),
        <ObjectManager>{ selectedSat: 0, isSensorManagerLoaded: false },
        <SensorManager>(<unknown>keepTrackApiStubs.programs.sensorManager)
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.changeCameraType(
        <OrbitManager>(<unknown>keepTrackApiStubs.programs.orbitManager),
        <DrawManager>(<unknown>keepTrackApiStubs.programs.drawManager),
        <ObjectManager>{ selectedSat: 29, isSensorManagerLoaded: false },
        <SensorManager>(<unknown>keepTrackApiStubs.programs.sensorManager)
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.changeCameraType(
        <OrbitManager>(<unknown>keepTrackApiStubs.programs.orbitManager),
        <DrawManager>(<unknown>keepTrackApiStubs.programs.drawManager),
        <ObjectManager>{ selectedSat: 29, isSensorManagerLoaded: true },
        <SensorManager>(<unknown>keepTrackApiStubs.programs.sensorManager)
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.changeCameraType(
        <OrbitManager>(<unknown>keepTrackApiStubs.programs.orbitManager),
        <DrawManager>(<unknown>keepTrackApiStubs.programs.drawManager),
        <ObjectManager>{ selectedSat: -1, isSensorManagerLoaded: false },
        <SensorManager>(<unknown>keepTrackApiStubs.programs.sensorManager)
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.changeCameraType(
        <OrbitManager>(<unknown>keepTrackApiStubs.programs.orbitManager),
        <DrawManager>(<unknown>keepTrackApiStubs.programs.drawManager),
        <ObjectManager>{ selectedSat: 0, isSensorManagerLoaded: true },
        <SensorManager>(<unknown>keepTrackApiStubs.programs.sensorManager)
      );
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.lookAtLatLon', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.lookAtLatLon(-Infinity, -Infinity, undefined, undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.camSnap', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.camSnap(350, 320);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.camSnap(90, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.camSnap(410, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.camSnap(70, 350);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.camSnap(350, 4);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.camSnap(-Infinity, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.snapToSat', () => {
  it('should handle good satellite objects', () => {
    let callFunction: any = () => {
      camera.snapToSat(defaultSat);
    };

    expect(callFunction).not.toThrow();
  });

  it('should handle bad satellite objects', () => {
    let callFunction: any = () => {
      camera.snapToSat(<SatObject>(<unknown>{}));
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.fts2default', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.fts2default();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.calculate', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.calculate(100, true);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.calculate(-100, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.calculate(-5.48, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.calculate(0, true);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.calculate(1, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.calculate(NaN, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    let callFunction: any = () => {
      setIsScreenPan(true);
      camera.calculate(1, false);
      setIsWorldPan(true);
      camera.calculate(1, false);
      setIsPanReset(true);
      camera.calculate(1, false);
      setIsLocalRotateRoll(true);
      camera.calculate(1, false);
      setIsLocalRotateYaw(true);
      camera.calculate(1, false);
      setIsLocalRotateOverride(true);
      camera.calculate(1, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    let callFunction: any = () => {
      setFtsRotateReset(true);
      camera.calculate(1, false);
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Fps);
      camera.calculate(1, false);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.update', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.update(<any>{ id: 987650, getAltitude: () => 400, position: { x: 350, y: 4, z: 1 }, velocity: { x: 100, y: 410, z: 50 } }, {
        lat: 350,
        lon: 410,
        gmst: 12,
        x: 90,
        y: 4,
        z: 30,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.update(<any>{ id: 12345, getAltitude: () => 380, position: { x: 1, y: 30, z: 520 }, velocity: { x: 50, y: 100, z: 100 } }, {
        lat: 550,
        lon: 4,
        gmst: 987650,
        x: 520,
        y: 4,
        z: 400,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.update(<any>{ id: 4, getAltitude: () => 1, position: { x: 100, y: 320, z: 4 }, velocity: { x: 1, y: 100, z: 90 } }, {
        lat: 30,
        lon: 100,
        gmst: 12345,
        x: 320,
        y: 380,
        z: 1,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.update(<any>{ id: 12, getAltitude: () => 70, position: { x: 30, y: 380, z: 550 }, velocity: { x: 70, y: 30, z: 410 } }, {
        lat: 520,
        lon: 100,
        gmst: 12345,
        x: 1,
        y: 400,
        z: 4,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.update(<any>{ id: Infinity, getAltitude: () => Infinity, position: { x: Infinity, y: Infinity, z: Infinity }, velocity: { x: Infinity, y: Infinity, z: Infinity } }, {
        lat: Infinity,
        lon: Infinity,
        gmst: Infinity,
        x: Infinity,
        y: Infinity,
        z: Infinity,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    let callFunction: any = () => {
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    let callFunction: any = () => {
      // eslint-disable-next-line no-import-assign
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Offset);
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.FixedToSat);
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Fps);
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Planetarium);
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Satellite);
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Astronomy);
      camera.update(<any>{ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, {
        lat: 100,
        lon: 100,
        gmst: 0,
        x: 50,
        y: 70,
        z: 1,
      });
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.getCamPos', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.getCamPos();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.getDistFromEarth', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.getDistFromEarth();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.getForwardVector', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.getForwardVector();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.earthHitTest', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, <DotsManager>(<unknown>keepTrackApiStubs.programs.dotsManager), 380, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, <DotsManager>(<unknown>keepTrackApiStubs.programs.dotsManager), 100, 50);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, <DotsManager>(<unknown>keepTrackApiStubs.programs.dotsManager), 320, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, <DotsManager>(<unknown>keepTrackApiStubs.programs.dotsManager), 320, 30);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, <DotsManager>(<unknown>keepTrackApiStubs.programs.dotsManager), 520, 320);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, <DotsManager>(<unknown>keepTrackApiStubs.programs.dotsManager), -Infinity, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.setCameraType', () => {
  const cameraType = keepTrackApiStubs.programs.mainCamera.cameraType;
  test('0', () => {
    let callFunction: any = () => {
      camera.setCameraType(cameraType.Default);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.setCameraType(cameraType.Satellite);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.setCameraType(cameraType.Offset);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.setCameraType(cameraType.Planetarium);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.setCameraType(cameraType.current);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('keyUpHandler', () => {
  test('0', () => {
    let callFunction: any = () => {
      keyUpHandler(<KeyboardEvent>{});
      keyUpHandler(generateKeyboardEvent('a'));
      keyUpHandler(generateKeyboardEvent('d'));
      keyUpHandler(generateKeyboardEvent('s'));
      keyUpHandler(generateKeyboardEvent('w'));
      keyUpHandler(generateKeyboardEvent('q'));
      keyUpHandler(generateKeyboardEvent('e'));
      keyUpHandler(generateKeyboardEvent('j'));
      keyUpHandler(generateKeyboardEvent('l'));
      keyUpHandler(generateKeyboardEvent('i'));
      keyUpHandler(generateKeyboardEvent('k'));
      keyUpHandler(generateKeyboardEvent('shift'));
      keyUpHandler(generateKeyboardEvent('ShiftRight'));
    };

    expect(callFunction).not.toThrow();
  });

  // @ponicode
  describe('keyDownHandler', () => {
    test('0', () => {
      let callFunction: any = () => {
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Fps);
        keyDownHandler(<KeyboardEvent>{});
        keyDownHandler(generateKeyboardEvent('w'));
        keyDownHandler(generateKeyboardEvent('a'));
        keyDownHandler(generateKeyboardEvent('s'));
        keyDownHandler(generateKeyboardEvent('d'));
        keyDownHandler(generateKeyboardEvent('q'));
        keyDownHandler(generateKeyboardEvent('e'));
        keyDownHandler(generateKeyboardEvent('j'));
        keyDownHandler(generateKeyboardEvent('l'));
        keyDownHandler(generateKeyboardEvent('i'));
        keyDownHandler(generateKeyboardEvent('k'));
        keyDownHandler(generateKeyboardEvent('shift'));
        keyDownHandler(generateKeyboardEvent('ShiftRight'));
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Satellite);
        keyDownHandler(generateKeyboardEvent('q'));
        keyDownHandler(generateKeyboardEvent('e'));
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Astronomy);
        keyDownHandler(generateKeyboardEvent('j'));
        keyDownHandler(generateKeyboardEvent('l'));
      };

      expect(callFunction).not.toThrow();
    });
  });

  describe('camera.fpsMovement', () => {
    test('0', () => {
      let callFunction: any = () => {
        camera.fpsMovement();
      };

      expect(callFunction).not.toThrow();
    });

    test('1', () => {
      let callFunction: any = () => {
        keyDownHandler(generateKeyboardEvent('w'));
        camera.fpsMovement();
        keyDownHandler(generateKeyboardEvent('a'));
        camera.fpsMovement();
        keyDownHandler(generateKeyboardEvent('q'));
        camera.fpsMovement();
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Fps);
        camera.fpsMovement();
      };

      expect(callFunction).not.toThrow();
    });
  });
});

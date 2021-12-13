/* eslint-disable no-undefined */
import * as camera from '@app/js/camera/camera';
import { keepTrackApiStubs } from '../api/apiMocks';
// @ponicode
describe('camera.normalizeAngle', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.normalizeAngle(1.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.normalizeAngle(10.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.normalizeAngle(0.1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.normalizeAngle(2.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.normalizeAngle(0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.normalizeAngle(-Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.longToYaw', () => {
  test('0', () => {
    let param2: any = new Date('01-01-2030');
    let callFunction: any = () => {
      camera.longToYaw(1, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let param2: any = new Date('01-01-2030');
    let callFunction: any = () => {
      camera.longToYaw(0, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let param2: any = new Date('01-13-2020');
    let callFunction: any = () => {
      camera.longToYaw(100, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let param2: any = new Date('01-13-2020');
    let callFunction: any = () => {
      camera.longToYaw(1, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let param2: any = new Date('01-01-2020');
    let callFunction: any = () => {
      camera.longToYaw(-5.48, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let param2: any = new Date('');
    let callFunction: any = () => {
      camera.longToYaw(Infinity, param2);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('camera.latToPitch', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.latToPitch(320);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.latToPitch(4);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.latToPitch(30);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.latToPitch(100);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.latToPitch(400);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.latToPitch(Infinity);
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
      camera.alt2zoom(-100);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.alt2zoom(-5.48);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.alt2zoom(1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.alt2zoom(0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.alt2zoom(100);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.alt2zoom(-Infinity);
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
      camera.changeCameraType(keepTrackApiStubs.programs.orbitManager, keepTrackApiStubs.programs.drawManager, { selectedSat: 0.0, isSensorManagerLoaded: true }, keepTrackApiStubs.programs.sensorManager);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.changeCameraType(keepTrackApiStubs.programs.orbitManager, keepTrackApiStubs.programs.drawManager, { selectedSat: 0.0, isSensorManagerLoaded: false }, keepTrackApiStubs.programs.sensorManager);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.changeCameraType(keepTrackApiStubs.programs.orbitManager, keepTrackApiStubs.programs.drawManager, { selectedSat: -29.45, isSensorManagerLoaded: 12345 }, keepTrackApiStubs.programs.sensorManager);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.changeCameraType(keepTrackApiStubs.programs.orbitManager, keepTrackApiStubs.programs.drawManager, { selectedSat: -29.45, isSensorManagerLoaded: true }, keepTrackApiStubs.programs.sensorManager);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.changeCameraType(keepTrackApiStubs.programs.orbitManager, keepTrackApiStubs.programs.drawManager, { selectedSat: -1.0, isSensorManagerLoaded: 0 }, keepTrackApiStubs.programs.sensorManager);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.changeCameraType(keepTrackApiStubs.programs.orbitManager, keepTrackApiStubs.programs.drawManager, { selectedSat: -Infinity, isSensorManagerLoaded: -Infinity }, keepTrackApiStubs.programs.sensorManager);
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
  test('0', () => {
    let callFunction: any = () => {
      camera.snapToSat({
        position: { x: 550, y: 410, z: 30 },
        static: 'Michael',
        TLE1: 'Foo bar',
        TLE2: 'foo bar',
        sccNum: 'лв',
        active: false,
        C: '#F00',
        LS: 'лв',
        LV: 'Saltwater Crocodile',
        ON: '2021-07-29T15:31:46.922Z',
        OT: 987650,
        R: 'email@Google.com',
        URL: 'https://api.telegram.org/',
        O: 'bed-free@tutanota.de',
        U: 'something@example.com',
        P: 'hsl(10%,20%,40%)',
        LM: 'Dwarf Crocodile',
        DM: 'Nile Crocodile',
        Pw: '1.0.0',
        Li: 'b',
        Con: '12345',
        M: 'red',
        S1: 'email@Google.com',
        S2: 'TestUpperCase@Example.com',
        S3: 'TestUpperCase@Example.com',
        S4: 'user@host:300',
        S5: 'TestUpperCase@Example.com',
        S6: 'user@host:300',
        S7: 'TestUpperCase@Example.com',
        inclination: 0,
        lon: 12,
        perigee: 13518,
        apogee: 12345,
        period: 56784,
        meanMotion: 100,
        semimajorAxis: 64,
        eccentricity: 0.5,
        raan: 987650,
        argPe: 56784,
        inView: 100,
        velocity: { total: 300, x: 380, y: 30, z: 380 },
        getTEARR: -100,
        getAltitude: () => true,
        getDirection: 520,
        vmag: 100,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      // eslint-disable-next-line no-import-assign
      camera.setCamAngleSnappedOnSat(true);
      camera.snapToSat({
        position: { x: 50, y: 30, z: 90 },
        static: 'Michael',
        TLE1: 'Foo bar',
        TLE2: 'Hello, world!',
        sccNum: 'B/.',
        active: false,
        C: '#F00',
        LS: '₹',
        LV: 'Dwarf Crocodile',
        ON: '2021-07-29T15:31:46.922Z',
        OT: 987650,
        R: 'user@host:300',
        URL: 'http://www.example.com/route/123?foo=bar',
        O: 'bed-free@tutanota.de',
        U: 'TestUpperCase@Example.com',
        P: 'rgb(20%,10%,30%)',
        LM: 'Dwarf Crocodile',
        DM: 'Spectacled Caiman',
        Pw: '4.0.0-beta1\t',
        Li: 'a',
        Con: '9876',
        M: 'hsl(10%,20%,40%)',
        S1: 'user1+user2@mycompany.com',
        S2: 'TestUpperCase@Example.com',
        S3: 'something@example.com',
        S4: 'email@Google.com',
        S5: 'ponicode.com',
        S6: 'user1+user2@mycompany.com',
        S7: 'user@host:300',
        inclination: 3.0,
        lon: 12345,
        perigee: 124115,
        apogee: 151252,
        period: 987650,
        meanMotion: 100000,
        semimajorAxis: 0,
        eccentricity: 10.23,
        raan: 987650,
        argPe: 12345,
        inView: 1,
        velocity: { total: 10000, x: 550, y: 520, z: 30 },
        getTEARR: 1,
        getAltitude: () => true,
        getDirection: 400,
        vmag: -5.48,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.snapToSat({
        position: { x: 550, y: 550, z: 520 },
        static: 'Michael',
        TLE1: 'foo bar',
        TLE2: 'Hello, world!',
        sccNum: 'B/.',
        active: false,
        C: 'rgb(20%,10%,30%)',
        LS: 'B/.',
        LV: 'Nile Crocodile',
        ON: '2021-07-29T15:31:46.922Z',
        OT: 12,
        R: 'user@host:300',
        URL: 'https://croplands.org/app/a/confirm?t=',
        O: 'TestUpperCase@Example.com',
        U: 'user@host:300',
        P: 'black',
        LM: 'Dwarf Crocodile',
        DM: 'Saltwater Crocodile',
        Pw: 'v1.2.4',
        Li: 'a',
        Con: 'da7588892',
        M: 'rgb(0.1,0.2,0.3)',
        S1: 'something@example.com',
        S2: 'ponicode.com',
        S3: 'ponicode.com',
        S4: 'ponicode.com',
        S5: 'something@example.com',
        S6: 'ponicode.com',
        S7: 'email@Google.com',
        inclination: 3.0,
        lon: 56784,
        perigee: 56784,
        apogee: 987650,
        period: 12345,
        meanMotion: 100000,
        semimajorAxis: 5,
        eccentricity: 0.5,
        raan: 987650,
        argPe: 56784,
        inView: -5.48,
        velocity: { total: 10000, x: 90, y: 520, z: 380 },
        getTEARR: -5.48,
        getAltitude: () => true,
        getDirection: 400,
        vmag: -5.48,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      // eslint-disable-next-line no-import-assign
      camera.setCamZoomSnappedOnSat(true);
      camera.snapToSat({
        position: { x: 50, y: 4, z: 30 },
        static: false,
        TLE1: 'Foo bar',
        TLE2: 'This is a Text',
        sccNum: 'B/.',
        active: true,
        C: '#FF00FF',
        LS: 'MT',
        LV: 'Spectacled Caiman',
        ON: '2021-07-30T00:05:36.818Z',
        OT: 12,
        R: 'user1+user2@mycompany.com',
        URL: 'https://api.telegram.org/bot',
        O: 'TestUpperCase@Example.com',
        U: 'bed-free@tutanota.de',
        P: 'hsl(10%,20%,40%)',
        LM: 'Saltwater Crocodile',
        DM: 'Australian Freshwater Crocodile',
        Pw: '4.0.0-beta1\t',
        Li: 'a',
        Con: 'da7588892',
        M: 'green',
        S1: 'bed-free@tutanota.de',
        S2: 'email@Google.com',
        S3: 'something@example.com',
        S4: 'user@host:300',
        S5: 'ponicode.com',
        S6: 'user@host:300',
        S7: 'user1+user2@mycompany.com',
        inclination: 5,
        lon: 12345,
        perigee: 746,
        apogee: 8161,
        period: 56784,
        meanMotion: 0,
        semimajorAxis: 3,
        eccentricity: 0.5,
        raan: 12345,
        argPe: 56784,
        inView: 1,
        velocity: { total: 300, x: 90, y: 50, z: 70 },
        getTEARR: 100,
        getAltitude: () => true,
        getDirection: 'South',
        vmag: 1,
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Planetarium);
      camera.snapToSat({
        position: { x: 100, y: 70, z: 400 },
        static: 'Pierre Edouard',
        TLE1: 'This is a Text',
        TLE2: 'Foo bar',
        sccNum: 'лв',
        active: false,
        C: '#F00',
        LS: '£',
        LV: 'Spectacled Caiman',
        ON: '2021-07-29T23:03:48.812Z',
        OT: 12345,
        R: 'email@Google.com',
        URL: 'http://example.com/showcalendar.html?token=CKF50YzIHxCTKMAg',
        O: 'email@Google.com',
        U: 'TestUpperCase@Example.com',
        P: 'black',
        LM: 'Australian Freshwater Crocodile',
        DM: 'Spectacled Caiman',
        Pw: 'v4.0.0-rc.4',
        Li: 'b',
        Con: '12345',
        M: 'hsl(10%,20%,40%)',
        S1: 'TestUpperCase@Example.com',
        S2: 'something@example.com',
        S3: 'ponicode.com',
        S4: 'email@Google.com',
        S5: 'email@Google.com',
        S6: 'user@host:300',
        S7: 'bed-free@tutanota.de',
        inclination: 5,
        lon: 86,
        perigee: 5678,
        apogee: 19861,
        period: 12345,
        meanMotion: 2000.0,
        semimajorAxis: 64,
        eccentricity: 0.0,
        raan: 12345,
        argPe: 86,
        inView: -5.48,
        velocity: { total: 0, x: 380, y: 4, z: 70 },
        getTEARR: 100,
        getAltitude: () => true,
        getDirection: 400,
        vmag: 0,
      });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Default);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.snapToSat({
        position: { x: -Infinity, y: -Infinity, z: -Infinity },
        static: '',
        TLE1: '',
        TLE2: '',
        sccNum: '',
        active: true,
        C: '',
        LS: '',
        LV: '',
        ON: '',
        OT: -Infinity,
        R: '',
        URL: '',
        O: '',
        U: '',
        P: '',
        LM: '',
        DM: '',
        Pw: '',
        Li: '',
        Con: '',
        M: '',
        S1: '',
        S2: '',
        S3: '',
        S4: '',
        S5: '',
        S6: '',
        S7: '',
        inclination: -Infinity,
        lon: -Infinity,
        perigee: -Infinity,
        apogee: -Infinity,
        period: -Infinity,
        meanMotion: -Infinity,
        semimajorAxis: -Infinity,
        eccentricity: -Infinity,
        raan: -Infinity,
        argPe: -Infinity,
        inView: -Infinity,
        velocity: { total: -Infinity, x: -Infinity, y: -Infinity, z: -Infinity },
        getTEARR: -Infinity,
        getAltitude: () => true,
        getDirection: -Infinity,
        vmag: -Infinity,
      });
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
      camera.setIsScreenPan(true);
      camera.calculate(1, false);
      camera.setIsWorldPan(true);
      camera.calculate(1, false);
      camera.setIsPanReset(true);
      camera.calculate(1, false);
      camera.setIsLocalRotateRoll(true);
      camera.calculate(1, false);
      camera.setIsLocalRotateYaw(true);
      camera.calculate(1, false);
      camera.setIsLocalRotateOverride(true);
      camera.calculate(1, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    let callFunction: any = () => {
      camera.setFtsRotateReset(true);
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
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.update({ id: 987650, getAltitude: () => 400, position: { x: 350, y: 4, z: 1 }, velocity: { x: 100, y: 410, z: 50 } }, { lat: 350, lon: 410, gmst: 12, x: 90, y: 4, z: 30 });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.update({ id: 12345, getAltitude: () => 380, position: { x: 1, y: 30, z: 520 }, velocity: { x: 50, y: 100, z: 100 } }, { lat: 550, lon: 4, gmst: 987650, x: 520, y: 4, z: 400 });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.update({ id: 4, getAltitude: () => 1, position: { x: 100, y: 320, z: 4 }, velocity: { x: 1, y: 100, z: 90 } }, { lat: 30, lon: 100, gmst: 12345, x: 320, y: 380, z: 1 });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.update({ id: 12, getAltitude: () => 70, position: { x: 30, y: 380, z: 550 }, velocity: { x: 70, y: 30, z: 410 } }, { lat: 520, lon: 100, gmst: 12345, x: 1, y: 400, z: 4 });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.update(
        { id: Infinity, getAltitude: () => Infinity, position: { x: Infinity, y: Infinity, z: Infinity }, velocity: { x: Infinity, y: Infinity, z: Infinity } },
        { lat: Infinity, lon: Infinity, gmst: Infinity, x: Infinity, y: Infinity, z: Infinity }
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    let callFunction: any = () => {
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    let callFunction: any = () => {
      // eslint-disable-next-line no-import-assign
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Offset);
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.FixedToSat);
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Fps);
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Planetarium);
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Satellite);
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
      camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Astronomy);
      camera.update({ id: 63, getAltitude: () => 350, position: { x: 350, y: 4, z: 520 }, velocity: { x: 90, y: 320, z: 50 } }, { lat: 100, lon: 100, gmst: 0, x: 50, y: 70, z: 1 });
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
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.dotsManager, 380, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.dotsManager, 100, 50);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.dotsManager, 320, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.dotsManager, 320, 30);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.dotsManager, 520, 320);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      camera.earthHitTest(keepTrackApiStubs.programs.drawManager.gl, keepTrackApiStubs.programs.dotsManager, -Infinity, -Infinity);
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
describe('camera.keyUpHandler', () => {
  test('0', () => {
    let callFunction: any = () => {
      camera.keyUpHandler({});
      camera.keyUpHandler({ key: 'a' });
      camera.keyUpHandler({ key: 'd' });
      camera.keyUpHandler({ key: 's' });
      camera.keyUpHandler({ key: 'w' });
      camera.keyUpHandler({ key: 'q' });
      camera.keyUpHandler({ key: 'e' });
      camera.keyUpHandler({ key: 'j' });
      camera.keyUpHandler({ key: 'l' });
      camera.keyUpHandler({ key: 'i' });
      camera.keyUpHandler({ key: 'k' });
      camera.keyUpHandler({ key: 'shift' });
      camera.keyUpHandler({ key: 'ShiftRight' });
    };

    expect(callFunction).not.toThrow();
  });

  // @ponicode
  describe('camera.keyDownHandler', () => {
    test('0', () => {
      let callFunction: any = () => {
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Fps);
        camera.keyDownHandler({});
        camera.keyDownHandler({ key: 'w' });
        camera.keyDownHandler({ key: 'a' });
        camera.keyDownHandler({ key: 's' });
        camera.keyDownHandler({ key: 'd' });
        camera.keyDownHandler({ key: 'q' });
        camera.keyDownHandler({ key: 'e' });
        camera.keyDownHandler({ key: 'j' });
        camera.keyDownHandler({ key: 'l' });
        camera.keyDownHandler({ key: 'i' });
        camera.keyDownHandler({ key: 'k' });
        camera.keyDownHandler({ key: 'shift' });
        camera.keyDownHandler({ key: 'ShiftRight' });
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Satellite);
        camera.keyDownHandler({ key: 'q' });
        camera.keyDownHandler({ key: 'e' });
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Astronomy);
        camera.keyDownHandler({ key: 'j' });
        camera.keyDownHandler({ key: 'l' });
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
        camera.keyDownHandler({ key: 'w' });
        camera.fpsMovement();
        camera.keyDownHandler({ key: 'a' });
        camera.fpsMovement();
        camera.keyDownHandler({ key: 'q' });
        camera.fpsMovement();
        camera.setCameraType(keepTrackApiStubs.programs.mainCamera.cameraType.Fps);
        camera.fpsMovement();
      };

      expect(callFunction).not.toThrow();
    });
  });
});

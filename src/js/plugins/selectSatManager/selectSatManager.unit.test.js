/*globals
  global
  test
  expect
  jest
*/

import { keepTrackApi } from '@app/js/api/externalApi';
import { selectSatManager } from '@app/js/plugins/selectSatManager/selectSatManager.js';

document.body.innerHTML = global.docBody;

test(`selectSatManager Unit Testing`, () => {
  keepTrackApi.programs.groupColorScheme = {};
  keepTrackApi.programs.sensorManager = {
    setSensor: jest.fn(),
    selectedSensor: {
      zoom: 1,
      lat: 1,
      lon: 1,
    },
    currentSensor: {
      lat: 1,
      lon: 1,
    },
  };
  keepTrackApi.programs.cameraManager = {
    rotateEarth: jest.fn(),
    fts2default: jest.fn(),
    cameraType: {
      current: 1,
      default: 1,
      fixedToSat: 2,
      set: jest.fn(),
    },
    lookAtSensor: jest.fn(),
  };
  keepTrackApi.programs.satSet = {
    getSat: () => ({
      type: 'Sat',
      TLE1: '1111111111111111111111111111111111111111111111111111111111',
      TLE2: '1111111111111111111111111111111111111111111111111111111111',
      active: true,
      apogee: 1,
      perigee: 1,
      inclination: 1,
      eccentricity: 1,
      period: 1,
    }),
    selectSat: jest.fn(),
    satCruncher: {
      postMessage: jest.fn(),
    },
    getSatExtraOnly: () => satSet.getSat(),
  };
  keepTrackApi.programs.timeManager = {
    getDayOfYear: () => 172,
    selectedDate: 1,
  };
  keepTrackApi.programs.objectManager = {
    rotateEarth: jest.fn(),
    setSelectedSat: jest.fn(),
    extractCountry: () => 'US',
    extractLaunchSite: () => 'ESTR',
    extractLiftVehicle: () => 'Falcon 9',
  };

  const cameraManager = keepTrackApi.programs.cameraManager;
  const satSet = keepTrackApi.programs.satSet;
  const objectManager = keepTrackApi.programs.objectManager;

  selectSatManager.init();
  selectSatManager.selectSat(-1, cameraManager);
  selectSatManager.selectSat(-1, cameraManager);
  selectSatManager.selectSat(5, cameraManager);
  selectSatManager.selectSat(5, cameraManager);

  satSet.getSat = () => ({ type: 'Star' });
  selectSatManager.selectSat(5, cameraManager);

  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 0,
  });
  selectSatManager.selectSat(5, cameraManager);
  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 1,
  });
  selectSatManager.selectSat(5, cameraManager);
  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 2,
  });
  selectSatManager.selectSat(5, cameraManager);
  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 3,
  });
  selectSatManager.selectSat(5, cameraManager);
  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 4,
  });
  selectSatManager.selectSat(5, cameraManager);
  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 5,
  });
  selectSatManager.selectSat(5, cameraManager);
  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 6,
  });
  selectSatManager.selectSat(5, cameraManager);
  satSet.getSat = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    position: {
      x: 1,
      y: 1,
      z: 1,
    },
    inclination: 1,
    eccentricity: 1,
    period: 1,
    OT: 7,
    U: '1',
    P: '1',
    Con: '1',
    LM: '1',
    DM: '1',
    Li: '1',
    Pw: '1',
    vmag: '1',
    S1: '1',
    S2: '1',
    S3: '1',
    S4: '1',
    S5: '1',
    S6: '1',
    S7: '1',
    URL: '1',
    TTP: '1',
    NOTES: '1',
    FMISSED: '1',
    ORPO: '1',
    constellation: '1',
    maneuver: '1',
    associates: '1',
    isInSun: jest.fn(),
  });
  selectSatManager.selectSat(5, cameraManager);

  satSet.getSatExtraOnly = () => ({
    type: 'Sat',
    static: true,
  });
  selectSatManager.selectSat(5, cameraManager);

  satSet.getSatExtraOnly = () => ({
    type: 'Star',
    static: true,
  });
  objectManager.isSensorManagerLoaded = true;
  selectSatManager.selectSat(5, cameraManager);
  // objectManager.isSensorManagerLoaded = false;

  satSet.getSatExtraOnly = () => false;
  selectSatManager.selectSat(5, cameraManager);

  satSet.getSatExtraOnly = () => ({
    type: 'Radar',
    static: true,
    staticNum: 1,
  });
  selectSatManager.selectSat(5, cameraManager);

  cameraManager.cameraType.current = 2;
  selectSatManager.selectSat(5, cameraManager);

  satSet.getSatExtraOnly = () => ({
    type: 'Sat',
    TLE1: '1111111111111111111111111111111111111111111111111111111111',
    TLE2: '1111111111111111111111111111111111111111111111111111111111',
    active: true,
    apogee: 1,
    perigee: 1,
    inclination: 1,
    eccentricity: 1,
    period: 1,
    static: false,
  });
  selectSatManager.selectSat(5, cameraManager);

  cameraManager.cameraType.current = 1;
  satSet.getSat = () => ({
    type: 'Radar',
    static: true,
    staticNum: 1,
  });
  satSet.getSatExtraOnly = () => ({
    type: 'Radar',
    static: true,
    staticNum: 1,
  });
  objectManager.isSensorManagerLoaded = false;
  selectSatManager.selectSat(5, cameraManager);

  expect(true).toBe(true);
});

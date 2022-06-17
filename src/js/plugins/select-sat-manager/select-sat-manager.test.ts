import { defaultSat, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import { selectSatManager } from './select-sat-manager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

document.body.innerHTML = global.docBody;

describe('selectSatManager', () => {
  test(`selectSatManager Unit Testing`, () => {
    const mainCamera = keepTrackApi.programs.mainCamera;
    const satSet = keepTrackApi.programs.satSet;
    const objectManager = keepTrackApi.programs.objectManager;

    selectSatManager.init();
    selectSatManager.selectSat(-1, mainCamera);
    selectSatManager.selectSat(-1, mainCamera);
    selectSatManager.selectSat(5, mainCamera);
    selectSatManager.selectSat(5, mainCamera);

    satSet.getSat = () => ({ ...defaultSat, ...{ type: SpaceObjectType.STAR } });
    selectSatManager.selectSat(5, mainCamera);

    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        type: SpaceObjectType.UNKNOWN,
      },
    });
    selectSatManager.selectSat(5, mainCamera);
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        type: SpaceObjectType.PAYLOAD,
      },
    });
    selectSatManager.selectSat(5, mainCamera);
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        type: SpaceObjectType.ROCKET_BODY,
      },
    });
    selectSatManager.selectSat(5, mainCamera);
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        type: SpaceObjectType.DEBRIS,
      },
    });
    selectSatManager.selectSat(5, mainCamera);
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        type: SpaceObjectType.SPECIAL,
      },
    });
    selectSatManager.selectSat(5, mainCamera);
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        type: SpaceObjectType.RADAR_MEASUREMENT,
      },
    });
    selectSatManager.selectSat(5, mainCamera);
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        type: SpaceObjectType.RADAR_TRACK,
      },
    });
    selectSatManager.selectSat(5, mainCamera);
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
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
        vmag: 1,
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
      },
    });
    selectSatManager.selectSat(5, mainCamera);

    satSet.getSatExtraOnly = () => ({
      ...defaultSat,
      ...{
        type: SpaceObjectType.PAYLOAD,
        static: true,
      },
    });
    selectSatManager.selectSat(5, mainCamera);

    satSet.getSatExtraOnly = () => ({
      ...defaultSat,
      ...{
        type: SpaceObjectType.STAR,
        static: true,
      },
    });
    objectManager.isSensorManagerLoaded = true;
    selectSatManager.selectSat(5, mainCamera);
    // objectManager.isSensorManagerLoaded = false;

    satSet.getSatExtraOnly = () => null;
    selectSatManager.selectSat(5, mainCamera);

    satSet.getSatExtraOnly = () => ({
      ...defaultSat,
      ...{
        type: SpaceObjectType.PHASED_ARRAY_RADAR,
        static: true,
        staticNum: 1,
      },
    });
    selectSatManager.selectSat(5, mainCamera);

    mainCamera.cameraType.current = 2;
    selectSatManager.selectSat(5, mainCamera);

    satSet.getSatExtraOnly = () => ({
      ...defaultSat,
      ...{
        type: SpaceObjectType.PAYLOAD,
        TLE1: '1111111111111111111111111111111111111111111111111111111111',
        TLE2: '1111111111111111111111111111111111111111111111111111111111',
        active: true,
        apogee: 1,
        perigee: 1,
        inclination: 1,
        eccentricity: 1,
        period: 1,
        static: false,
      },
    });
    selectSatManager.selectSat(5, mainCamera);

    mainCamera.cameraType.current = 1;
    satSet.getSat = () => ({
      ...defaultSat,
      ...{
        type: SpaceObjectType.PHASED_ARRAY_RADAR,
        static: true,
        staticNum: 1,
      },
    });
    satSet.getSatExtraOnly = () => ({
      ...defaultSat,
      ...{
        type: SpaceObjectType.PHASED_ARRAY_RADAR,
        static: true,
        staticNum: 1,
      },
    });
    objectManager.isSensorManagerLoaded = false;
    selectSatManager.selectSat(5, mainCamera);

    expect(true).toBe(true);
  });
});

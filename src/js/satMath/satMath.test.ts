// TODO: Jest snapshots are currently dependent on local computer time. They
// should be updated to use the same time on all computers.

import { defaultSat, defaultSensor, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms, ZoomValue } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import * as getTearData from './calc/getTearData';
import * as checkIsInView from './lookangles/checkIsInView';
import * as satMath from './satMath';
import { satellite } from './satMath';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
export const dateNow = new Date(2022, 0, 1);
dateNow.setUTCHours(0, 0, 0, 0);

describe('satMath.getTearData', () => {
  const realSgp4 = satellite.sgp4;
  beforeAll(() => {
    satellite.sgp4 = () =>
      <any>{
        position: {
          x: 6000,
          y: 6000,
          z: 6000,
        },
      };
  });
  it('should handle isInFOV', () => {
    jest.spyOn(checkIsInView, 'checkIsInView').mockImplementationOnce(() => true);
    let result: any = getTearData.getTearData(dateNow, satellite.twoline2satrec(defaultSat.TLE1, defaultSat.TLE2), [defaultSensor], false);
    expect(result).toMatchSnapshot();
  });
  it('should handle isInFOV and isRiseSetLookangles', () => {
    jest.spyOn(checkIsInView, 'checkIsInView').mockImplementationOnce(() => true);
    let result: any = getTearData.getTearData(dateNow, satellite.twoline2satrec(defaultSat.TLE1, defaultSat.TLE2), [defaultSensor], true);
    expect(result).toMatchSnapshot();
  });
  afterAll(() => {
    satellite.sgp4 = realSgp4;
  });

  it('should handle isInFOV and isRiseSetLookangles not previously in FOV but will be', () => {
    jest
      .spyOn(checkIsInView, 'checkIsInView')
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => false);
    let result: any = getTearData.getTearData(dateNow, satellite.twoline2satrec(defaultSat.TLE1, defaultSat.TLE2), [defaultSensor], true);
    expect(result).toMatchSnapshot();
    jest
      .spyOn(checkIsInView, 'checkIsInView')
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => true);
    result = getTearData.getTearData(dateNow, satellite.twoline2satrec(defaultSat.TLE1, defaultSat.TLE2), [defaultSensor], true);
    expect(result).toMatchSnapshot();
  });
  afterAll(() => {
    satellite.sgp4 = realSgp4;
  });
});

// @ponicode
describe('satMath.setobs', () => {
  test('0', () => {
    let result: any = satMath.setobs([
      {
        alt: 0,
        beamwidth: 15,
        changeObjectInterval: -100,
        country: 'US',
        lat: 550,
        linkAehf: false,
        linkWgs: false,
        lon: 50,
        name: 'Pierre Edouard',
        observerGd: { lat: 520, lon: 550, alt: -100 },
        obsmaxaz: 1,
        obsmaxel: -29.45,
        obsmaxrange: 380,
        obsminaz: 1,
        obsminel: 0.0,
        obsminrange: 1,
        shortName: '333173976',
        staticNum: 1,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.BALLISTIC_MISSILE,
        url: 'http://base.com',
        volume: false,
        zoom: 'geo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satMath.setobs([
      {
        alt: -100,
        beamwidth: 40,
        changeObjectInterval: 0,
        country: 'China',
        lat: 410,
        linkAehf: true,
        linkWgs: true,
        lon: 380,
        name: 'Edmond',
        observerGd: { lat: 400, lon: 320, alt: 100 },
        obsmaxaz: 100,
        obsmaxel: -29.45,
        obsmaxrange: 50,
        obsminaz: -100,
        obsminel: 10.23,
        obsminrange: -100,
        shortName: 'test',
        staticNum: 1000,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.PAYLOAD,
        url: 'http://base.com',
        volume: true,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satMath.setobs([
      {
        alt: -100,
        beamwidth: 30,
        changeObjectInterval: 1,
        country: 'France',
        lat: 30,
        linkAehf: true,
        linkWgs: false,
        lon: 30,
        name: 'Jean-Philippe',
        observerGd: { lat: 550, lon: 1, alt: 0 },
        obsmaxaz: 1,
        obsmaxel: -0.5,
        obsmaxrange: 380,
        obsminaz: 0,
        obsminel: 1.0,
        obsminrange: -5.48,
        shortName: 'test',
        staticNum: 10,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.PAYLOAD,
        url: 'Www.GooGle.com',
        volume: false,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satMath.setobs([
      {
        alt: 0,
        beamwidth: 16,
        changeObjectInterval: -100,
        country: 'China',
        lat: 400,
        linkAehf: true,
        linkWgs: false,
        lon: 30,
        name: 'Jean-Philippe',
        observerGd: { lat: 90, lon: 70, alt: -5.48 },
        obsmaxaz: 0,
        obsmaxel: 0.0,
        obsmaxrange: 350,
        obsminaz: -5.48,
        obsminel: 0.0,
        obsminrange: 1,
        shortName: 'test',
        staticNum: 10,
        sun: 'v4.0.0-rc.4',
        type: SpaceObjectType.PAYLOAD,
        url: 'http://example.com/showcalendar.html?token=CKF50YzIHxCTKMAg',
        volume: false,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satMath.setobs([
      {
        alt: 0,
        beamwidth: 5,
        changeObjectInterval: -100,
        country: 'FR',
        lat: 520,
        linkAehf: false,
        linkWgs: true,
        lon: 320,
        name: 'Edmond',
        observerGd: { lat: 50, lon: 50, alt: -5.48 },
        obsmaxaz: 1,
        obsmaxel: 10.23,
        obsmaxrange: 70,
        obsminaz: 100,
        obsminel: 0.5,
        obsminrange: -100,
        shortName: 'test',
        staticNum: 10,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.PAYLOAD,
        url: 'https://accounts.google.com/o/oauth2/revoke?token=%s',
        volume: true,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satMath.setobs([
      {
        alt: NaN,
        beamwidth: NaN,
        changeObjectInterval: NaN,
        country: '',
        lat: NaN,
        linkAehf: false,
        linkWgs: true,
        lon: NaN,
        name: '',
        observerGd: { lat: NaN, lon: NaN, alt: NaN },
        obsmaxaz: NaN,
        obsmaxel: NaN,
        obsmaxrange: NaN,
        obsminaz: NaN,
        obsminel: NaN,
        obsminrange: NaN,
        shortName: '',
        staticNum: NaN,
        sun: '',
        type: SpaceObjectType.PAYLOAD,
        url: '',
        volume: false,
        zoom: <ZoomValue>'',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = satMath.setobs([
      {
        alt: 0,
        beamwidth: 5,
        changeObjectInterval: -100,
        country: 'FR',
        lat: 520,
        linkAehf: false,
        linkWgs: true,
        lon: 320,
        name: 'Edmond',
        observerGd: { lat: 50, lon: 50, alt: -5.48 },
        obsmaxaz: 1,
        obsmaxel: 10.23,
        obsmaxrange: 70,
        obsminaz: 100,
        obsminel: 0.5,
        obsminrange: -100,
        shortName: 'test',
        staticNum: 10,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.PAYLOAD,
        url: 'https://accounts.google.com/o/oauth2/revoke?token=%s',
        volume: true,
        zoom: 'leo',
      },
      {
        alt: 0,
        beamwidth: 5,
        changeObjectInterval: -100,
        country: 'FR',
        lat: 520,
        linkAehf: false,
        linkWgs: true,
        lon: 320,
        name: 'Edmond',
        observerGd: { lat: 50, lon: 50, alt: -5.48 },
        obsmaxaz: 1,
        obsmaxel: 10.23,
        obsmaxrange: 70,
        obsminaz: 100,
        obsminel: 0.5,
        obsminrange: -100,
        shortName: 'test',
        staticNum: 10,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.PAYLOAD,
        url: 'https://accounts.google.com/o/oauth2/revoke?token=%s',
        volume: true,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.setTEARR', () => {
  test('0', () => {
    let result: any = satMath.setTEARR({
      alt: 0,
      lat: 0,
      lon: 0,
      rng: 0,
      az: 0,
      el: 0,
      name: '',
    });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.getTEARR', () => {
  test('0', () => {
    satMath.getTEARR(defaultSat);
  });
});

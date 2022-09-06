import { ColorRuleSet } from '@app/js/colorManager/colorSchemeManager';
import { defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms, SensorObject } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import * as sensorManager from './sensorManager';
keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('sensorManager.checkSensorSelected', () => {
  test('0', () => {
    sensorManager.setCurrentSensor(null);
    let result: any = sensorManager.checkSensorSelected();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    sensorManager.setCurrentSensor([defaultSensor]);
    let result: any = sensorManager.checkSensorSelected();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensorManager.sensorListLength', () => {
  test('0', () => {
    let result: any = sensorManager.sensorListLength();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensorManager.setCurrentSensor', () => {
  test('0', () => {
    let result: any = sensorManager.setCurrentSensor([
      {
        alt: 50,
        beamwidth: 64,
        changeObjectInterval: 1,
        country: 'GB',
        lat: 1,
        linkAehf: false,
        linkWgs: false,
        lon: 4,
        name: 'Pierre Edouard',
        observerGd: { lat: 320, lon: 350, alt: 50 },
        obsmaxaz: 1,
        obsmaxel: -1.0,
        obsmaxrange: 520,
        obsminaz: -5.48,
        obsminel: -0.5,
        obsminrange: -5.48,
        shortName: 'test',
        staticNum: 1000,
        sun: 'v4.0.0-rc.4',
        type: SpaceObjectType.DEBRIS,
        url: 'https://twitter.com/path?abc',
        volume: true,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = sensorManager.setCurrentSensor([
      {
        alt: 1,
        beamwidth: 1000,
        changeObjectInterval: 100,
        country: 'FR',
        lat: 550,
        linkAehf: true,
        linkWgs: false,
        lon: 410,
        name: 'Michael',
        observerGd: { lat: 100, lon: 30, alt: 3 },
        obsmaxaz: -5.48,
        obsmaxel: 0.5,
        obsmaxrange: 100,
        obsminaz: -100,
        obsminel: 10.0,
        obsminrange: 0,
        shortName: 'test',
        staticNum: 1,
        sun: '1.0.0',
        type: SpaceObjectType.ROCKET_BODY,
        url: 'http://www.croplands.org/account/confirm?t=',
        volume: true,
        zoom: 'geo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = sensorManager.setCurrentSensor([
      {
        alt: 3,
        beamwidth: 0.0,
        changeObjectInterval: -5.48,
        country: 'France',
        lat: 520,
        linkAehf: true,
        linkWgs: false,
        lon: 30,
        name: 'Anas',
        observerGd: { lat: 4, lon: 400, alt: 1 },
        obsmaxaz: -100,
        obsmaxel: -1.0,
        obsmaxrange: 90,
        obsminaz: -5.48,
        obsminel: 10.0,
        obsminrange: -100,
        shortName: 'test',
        staticNum: 1000,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.ROCKET_BODY,
        url: 'https://',
        volume: false,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = sensorManager.setCurrentSensor([
      {
        alt: 50,
        beamwidth: 0,
        changeObjectInterval: 100,
        country: 'US',
        lat: 520,
        linkAehf: false,
        linkWgs: true,
        lon: 550,
        name: 'Pierre Edouard',
        observerGd: { lat: 50, lon: 4, alt: 3 },
        obsmaxaz: 100,
        obsmaxel: 0.5,
        obsmaxrange: 320,
        obsminaz: 100,
        obsminel: -29.45,
        obsminrange: -100,
        shortName: 'fake',
        staticNum: 1000,
        sun: '4.0.0-beta1\t',
        type: SpaceObjectType.ROCKET_BODY,
        url: 'https://twitter.com/path?abc',
        volume: true,
        zoom: 'geo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = sensorManager.setCurrentSensor([
      {
        alt: 1,
        beamwidth: 40,
        changeObjectInterval: -100,
        country: 'France',
        lat: 70,
        linkAehf: false,
        linkWgs: false,
        lon: 380,
        name: 'Edmond',
        observerGd: { lat: 30, lon: 380, alt: 50 },
        obsmaxaz: 1,
        obsmaxel: 0.5,
        obsmaxrange: 520,
        obsminaz: 0,
        obsminel: 1.0,
        obsminrange: 100,
        shortName: '009008401',
        staticNum: 10,
        sun: 'v4.0.0-rc.4',
        type: SpaceObjectType.PAYLOAD,
        url: 'https://accounts.google.com/o/oauth2/revoke?token=%s',
        volume: true,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = sensorManager.setCurrentSensor([
      {
        alt: -Infinity,
        beamwidth: -Infinity,
        changeObjectInterval: -Infinity,
        country: '',
        lat: -Infinity,
        linkAehf: true,
        linkWgs: true,
        lon: -Infinity,
        name: '',
        observerGd: { lat: -Infinity, lon: -Infinity, alt: -Infinity },
        obsmaxaz: -Infinity,
        obsmaxel: -Infinity,
        obsmaxrange: -Infinity,
        obsminaz: -Infinity,
        obsminel: -Infinity,
        obsminrange: -Infinity,
        shortName: '',
        staticNum: -Infinity,
        sun: '',
        type: SpaceObjectType.LAUNCH_AGENCY,
        url: '',
        volume: false,
        zoom: 'leo',
      },
    ]);
    expect(result).toMatchSnapshot();
  });
});

describe('sensorManager.setSensor', () => {
  beforeAll(() => {
    settingsManager.currentColorScheme = {
      calculateColorBuffers: () => {},
    } as unknown as ColorRuleSet;
  });
  test('0', () => {
    let result: any = sensorManager.setSensor(
      {
        alt: 5,
        beamwidth: 48,
        changeObjectInterval: -100,
        country: 'United States',
        lat: 400,
        linkAehf: true,
        linkWgs: false,
        lon: 90,
        name: 'George',
        observerGd: { lat: 550, lon: 410, alt: 50 },
        obsmaxaz: -100,
        obsmaxel: -0.5,
        obsmaxrange: 1,
        obsminaz: 0,
        obsminel: 10.23,
        obsminrange: -5.48,
        shortName: 'test',
        staticNum: 1,
        sun: '1.0.0',
        type: SpaceObjectType.PAYLOAD,
        url: 'https://accounts.google.com/o/oauth2/revoke?token=%s',
        volume: false,
        zoom: 'geo',
      },
      10
    );
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = sensorManager.setSensor('SSN', 1);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = sensorManager.setSensor('CapeCodMulti', 1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = sensorManager.setSensor('NATO-MW', 1);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = sensorManager.setSensor('RUS-ALL', 1);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = sensorManager.setSensor('LEO-LABS', 1);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = sensorManager.setSensor('MD-ALL', 1);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensorManager.drawFov', () => {
  test('0', () => {
    let result: any = sensorManager.drawFov(<SensorObject>{ shortName: 'COD' });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = sensorManager.drawFov(<SensorObject>{ shortName: 'FYL' });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = sensorManager.drawFov(<SensorObject>{ shortName: 'CDN' });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = sensorManager.drawFov(<SensorObject>{ shortName: 'FAKE' });
    expect(result).toMatchSnapshot();
  });
});

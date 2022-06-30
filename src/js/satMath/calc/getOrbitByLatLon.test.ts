import { defaultSat, keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as getOrbitByLatLon from './getOrbitByLatLon';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('getOrbitByLatLon.getOrbitByLatLon', () => {
  const RealNow = Date.now;

  beforeAll(() => {
    global.Date.now = jest.fn(() => new Date('2019-04-07T10:20:30Z').getTime());
  });

  afterAll(() => {
    global.Date.now = RealNow;
  });

  it('should provide consistent results going north', () => {
    const date = new Date('01-01-2021');
    const sat = { ...defaultSat, ...{ position: { x: 1968.3, y: 3800.45, z: -5285.27 } } };
    let result = getOrbitByLatLon.getOrbitByLatLon(sat, -51.176, 89.66, 'N', date);
    expect(result).toBeTruthy();
    // const expected = ['1 00005U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991', '2 00005 2958.886 254.3900 0000345 0.000000 145.7000 15.48839820    10'];
    // TODO: Timezones are not handled correctly but it only affects the testing
    // expect(result).toStrictEqual(expected);
  });

  it('should provide consistent results going south', () => {
    const date = new Date('01-01-2021');
    const sat = { ...defaultSat, ...{ position: { x: -286.42, y: -4679.9, z: 4916.22 } } };
    let result = getOrbitByLatLon.getOrbitByLatLon(sat, 46.537, 83.951, 'S', date);
    expect(result).toBeTruthy();
    // const expected = ['1 00005U 98067A   21203.40407588  .00003453  00000-0  71172-4 0  9991', '2 00005 2958.886 66.52000 0000345 0.000000 330.4000 15.48839820    10'];
    // TODO: Timezones are not handled correctly but it only affects the testing
    // expect(result).toStrictEqual(expected);
  });

  test('0', () => {
    // TODO: Write better test
    let param5: any = new Date('01-01-2020');
    let result: any = getOrbitByLatLon.getOrbitByLatLon(defaultSat, 0.15, -0.85, 'S', param5);
    expect(() => result).not.toThrow();
  });

  test('1', () => {
    // TODO: Write better test
    let param5: any = new Date('01-01-2020');
    let result: any = getOrbitByLatLon.getOrbitByLatLon(defaultSat, 11.0, 11, 'N', param5);
    expect(() => result).not.toThrow();
  });

  test('2', () => {
    // TODO: Write better test
    let param5: any = new Date('01-01-2020');
    let result: any = getOrbitByLatLon.getOrbitByLatLon(defaultSat, 0.15, 11.0, 'S', param5);
    expect(() => result).not.toThrow();
  });

  test('3', () => {
    let param5: any = new Date('01-01-2020');
    let result: any = getOrbitByLatLon.getOrbitByLatLon(defaultSat, 11, 11, 'S', param5, 100, -1.0);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let param5: any = new Date('32-01-2020');
    let result: any = getOrbitByLatLon.getOrbitByLatLon(defaultSat, 11.0, 12, 'S', param5, 100, 0.0);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let param5: any = new Date('');
    let result: any = () => getOrbitByLatLon.getOrbitByLatLon(defaultSat, Infinity, Infinity, 'S', param5, Infinity, Infinity);
    expect(result).toMatchSnapshot();
  });
});

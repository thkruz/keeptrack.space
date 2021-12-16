import { defaultSat } from '../api/apiMocks';
import * as getOrbitByLatLon from './getOrbitByLatLon';

// @ponicode
describe('getOrbitByLatLon.getOrbitByLatLon', () => {
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

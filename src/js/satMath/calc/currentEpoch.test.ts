import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as currentEpoch from './currentEpoch';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satMath.currentEpoch', () => {
  test('0', () => {
    let inst: any = new Date('32-01-2020');
    let result: any = currentEpoch.currentEpoch(inst);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    // TODO: Write better test
    let inst: any = new Date('01-01-2030');
    let result: any = currentEpoch.currentEpoch(inst);
    expect(() => result).not.toThrow();
  });

  test('2', () => {
    // TODO: Write better test
    let inst: any = new Date('01-01-2020');
    let result: any = currentEpoch.currentEpoch(inst);
    expect(() => result).not.toThrow();
  });

  test('3', () => {
    // TODO: Write better test
    let inst: any = new Date('01-13-2020');
    let result: any = currentEpoch.currentEpoch(inst);
    expect(() => result).not.toThrow();
  });

  test('4', () => {
    let inst: any = new Date('');
    let result: any = currentEpoch.currentEpoch(inst);
    expect(result).toMatchSnapshot();
  });
});

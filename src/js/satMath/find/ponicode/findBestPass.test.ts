import { defaultSat, defaultSensor, keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as findBestPass from '@app/js/satMath/find/findBestPass';
import * as apiMocks from '../../../api/apiMocks';
import * as checkIsInView from '../../lookangles/checkIsInView';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('findBestPass.findBestPass', () => {
  test('0', () => {
    let result: any = findBestPass.findBestPass(apiMocks.defaultSat, [defaultSensor]);
    expect(result).toMatchSnapshot();
  });

  it('should handle a varierty of results 1', () => {
    const result = () => findBestPass.findBestPass(defaultSat, []);
    expect(result).not.toThrow();
  });

  it('should handle a varierty of results 8', () => {
    jest
      .spyOn(checkIsInView, 'checkIsInView')
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => true);
    const result = () => findBestPass.findBestPass(defaultSat, [defaultSensor]);
    expect(result).not.toThrow();
  });
});

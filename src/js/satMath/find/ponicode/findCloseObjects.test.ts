import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as findCloseObjects from '@app/js/satMath/find/findCloseObjects';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('findCloseObjects.findCloseObjects', () => {
  test('0', () => {
    let result: any = findCloseObjects.findCloseObjects();
    expect(result).toMatchSnapshot();
  });
});

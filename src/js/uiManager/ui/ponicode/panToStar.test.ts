import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms, SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import * as panToStar from '@app/js/uiManager/ui/panToStar';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('panToStar.panToStar', () => {
  test('0', () => {
    let result: any = panToStar.panToStar(<SatObject>{ name: 'Altair', type: SpaceObjectType.STAR });
    expect(result).toMatchSnapshot();
  });
});

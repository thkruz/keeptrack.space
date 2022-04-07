import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as orbitReferences from './orbitReferences';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('orbitReferences.init', () => {
  test('0', () => {
    let result: any = orbitReferences.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitReferences.uiManagerInit', () => {
  test('0', () => {
    let result: any = orbitReferences.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitReferences.selectSatData', () => {
  test('0', () => {
    let result: any = orbitReferences.selectSatData();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitReferences.orbitReferencesLinkClick', () => {
  test('0', () => {
    let result: any = orbitReferences.orbitReferencesLinkClick();
    expect(result).toMatchSnapshot();
  });
});

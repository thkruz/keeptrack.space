import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as orbitReferences from './orbitReferences';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

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
    let result: any = orbitReferences.selectSatData(false);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = orbitReferences.selectSatData(true);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = orbitReferences.selectSatData(null);
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

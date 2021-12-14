import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { groupsManager } from './groupsManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('createGroup', () => {
  test('0', () => {
    let result: any = () => groupsManager.createGroup('groupType', 'data');
    expect(result).toThrow();
  });

  test('1', () => {
    let result: any = groupsManager.createGroup('all', '');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = groupsManager.createGroup('year', 2000);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = groupsManager.createGroup('yearOrLess', 2000);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = groupsManager.createGroup('intlDes', ['1998-011DA']);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = groupsManager.createGroup('nameRegex', /COSMOS/u);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = groupsManager.createGroup('countryRegex', /ISRA/u);
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = groupsManager.createGroup('objNum', [25544, 41765]);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = groupsManager.createGroup('idList', [0, 1, 2]);
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = () => groupsManager.createGroup('', -Infinity);
    expect(result).toThrow();
  });
});

// @ponicode
describe('selectGroup', () => {
  test('0', () => {
    let result: any = groupsManager.selectGroup(keepTrackApi.programs.groupsManager.SpaceStations);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('selectGroupNoOverlay', () => {
  test('0', () => {
    let result: any = groupsManager.selectGroupNoOverlay(keepTrackApi.programs.groupsManager.SpaceStations);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('clearSelect', () => {
  test('0', () => {
    let result: any = groupsManager.clearSelect();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satGroup Tests', () => {
  let satGroup: any;

  beforeEach(() => {
    satGroup = groupsManager.createGroup('idList', [25544, 25545]);
  });

  test('0', () => {
    let result: any = satGroup.hasSat(25544);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satGroup.updateOrbits(keepTrackApi.programs.orbitManager);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satGroup.forEach(() => {});
    expect(result).toMatchSnapshot();
  });
});

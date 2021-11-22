import * as groupsManager from '@app/js/groupsManager/groupsManager';
import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/externalApi';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('createGroup', () => {
  let inst: any;

  beforeEach(() => {
    inst = new groupsManager.GroupFactory();
  });

  test('0', () => {
    let result: any = inst.createGroup('groupType', 'data');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = inst.createGroup('all', 'data');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = inst.createGroup('year', 'data');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = inst.createGroup('yearOrLess', 'data');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = inst.createGroup('intlDes', 'data');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = inst.createGroup('nameRegex', 'data');
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = inst.createGroup('countryRegex', 'data');
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = inst.createGroup('objNum', 'data');
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = inst.createGroup('idList', 'data');
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = inst.createGroup('', -Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('selectGroup', () => {
  let inst: any;

  beforeEach(() => {
    inst = new groupsManager.GroupFactory();
  });

  test('0', () => {
    let result: any = inst.selectGroup(keepTrackApi.programs.groupsManager.SpaceStations, keepTrackApi.programs.orbitManager);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('selectGroupNoOverlay', () => {
  let inst: any;

  beforeEach(() => {
    inst = new groupsManager.GroupFactory();
  });

  test('0', () => {
    let result: any = inst.selectGroupNoOverlay(keepTrackApi.programs.groupsManager.SpaceStations, keepTrackApi.programs.orbitManager);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('clearSelect', () => {
  let inst: any;

  beforeEach(() => {
    inst = new groupsManager.GroupFactory();
  });

  test('0', () => {
    let result: any = inst.clearSelect(keepTrackApi.programs.groupsManager.SpaceStations, keepTrackApi.programs.orbitManager);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satGroup Tests', () => {
  let inst: any;
  let satGroup: any;

  beforeEach(() => {
    inst = new groupsManager.GroupFactory();
    satGroup = inst.createGroup('idList', [25544, 25545]);
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

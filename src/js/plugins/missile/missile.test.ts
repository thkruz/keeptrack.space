import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as missile from './missile';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('missile.init', () => {
  test('0', () => {
    let result: any = missile.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.uiManagerInit', () => {
  test('0', () => {
    let result: any = missile.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.hideSideMenus', () => {
  test('0', () => {
    let result: any = missile.hideSideMenus();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.updateLoop', () => {
  test('0', () => {
    let result: any = missile.updateLoop();
    expect(result).toMatchSnapshot();
  });
});

describe('missile.bottomMenuClick', () => {
  test('1', () => {
    let result: any = missile.bottomMenuClick('menu-missile');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    missile.bottomMenuClick('menu-missile');
    let result: any = missile.bottomMenuClick('menu-missile');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = missile.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.missileChange', () => {
  test('0', () => {
    let result: any = missile.missileChange();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.msErrorClick', () => {
  test('0', () => {
    let result: any = missile.msErrorClick();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.msTargetChange', () => {
  test('0', () => {
    let result: any = missile.msTargetChange();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.missileSubmit', () => {
  test('0', () => {
    let result: any = missile.missileSubmit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('missile.msAttackerChange', () => {
  test('0', () => {
    let result: any = missile.msAttackerChange();
    expect(result).toMatchSnapshot();
  });
});

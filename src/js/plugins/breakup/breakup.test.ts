import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as breakup from '@app/js/plugins/breakup/breakup';
keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('breakup.init', () => {
  test('0', () => {
    let result: any = breakup.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('breakup.uiManagerInit', () => {
  test('0', () => {
    let result: any = breakup.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('breakup.hideSideMenus', () => {
  test('0', () => {
    let result: any = breakup.hideSideMenus();
    expect(result).toMatchSnapshot();
  });
});

describe('breakup.bottomMenuClick', () => {
  test('0', () => {
    keepTrackApi.programs.objectManager.selectedSat = 1;
    let result: any = breakup.bottomMenuClick('menu-breakup');
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    let result: any = breakup.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
  test('2', () => {
    breakup.bottomMenuClick('menu-breakup');
    let result: any = () => {
      breakup.bottomMenuClick('menu-breakup');
    };
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    breakup.bottomMenuClick('menu-breakup');
    let result: any = () => {
      breakup.bottomMenuClick('menu-breakup');
    };
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('breakup.breakupOnSubmit', () => {
  test('0', () => {
    let result: any = breakup.breakupOnSubmit();
    expect(result).toMatchSnapshot();
  });
});

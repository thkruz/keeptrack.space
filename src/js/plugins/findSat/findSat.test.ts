import * as apiMocks from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as findSat from '../../plugins/findSat/findSat';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...apiMocks.keepTrackApiStubs.programs });
window.M = {
  AutoInit: jest.fn(),
};

// @ponicode
describe('findSat.init', () => {
  test('0', () => {
    let result: any = findSat.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.hideSideMenus', () => {
  test('0', () => {
    let result: any = findSat.hideSideMenus();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.uiManagerInit', () => {
  test('0', () => {
    let result: any = findSat.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

describe('findSat.uiManagerFinal', () => {
  test('0', () => {
    let result: any = findSat.uiManagerFinal();
    expect(result).toMatchSnapshot();
  });
});

describe('findSat.bottomMenuClick', () => {
  test('0', () => {
    findSat.bottomMenuClick('menu-find-sat');
    let result: any = () => {
      findSat.bottomMenuClick('menu-find-sat');
    };
    expect(result).toMatchSnapshot();
  });
  test('2', () => {
    let result: any = findSat.bottomMenuClick('menu-find-sat');
    expect(result).toMatchSnapshot();
  });
  test('5', () => {
    let result: any = findSat.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.checkInc', () => {
  test('0', () => {
    let param1: any = [{ inclination: 0 }, { inclination: 50 }];
    let result: any = findSat.checkInc(param1, -1, 1000);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.checkPeriod', () => {
  test('0', () => {
    let param1: any = [{ period: 0 }, { period: 50 }];
    let result: any = findSat.checkPeriod(param1, -1, 1000);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.checkRcs', () => {
  test('0', () => {
    let param1: any = [{ R: 0 }, { R: 50 }];
    let result: any = findSat.checkRcs(param1, -1, 1000);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.searchSats', () => {
  test('0', () => {
    let result: any = findSat.searchSats(<any>{ test: 1 });
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    let result: any = findSat.searchSats(<any>{
      az: 50,
      el: 50,
      rng: 50,
      inc: 50,
      azMarg: 50,
      elMarg: 50,
      rngMarg: 50,
      incMarg: 50,
      period: 50,
      periodMarg: 50,
      rcs: 50,
      rcsMarg: 50,
      objType: 'sat',
      raan: 50,
      raanMarg: 50,
      argPe: 50,
      argPeMarg: 50,
      bus: 'test',
      shape: 'test',
      payload: 'test',
    });
    expect(result).toMatchSnapshot();
  });
  test('2', () => {
    let result: any = () =>
      findSat.searchSats(<any>{
        az: 'chipmunk',
        el: 'chipmunk',
        rng: 'chipmunk',
        inc: 'chipmunk',
        azMarg: 'chipmunk',
        elMarg: 'chipmunk',
        rngMarg: 'chipmunk',
        incMarg: 'chipmunk',
        period: 'chipmunk',
        periodMarg: 'chipmunk',
        rcs: 'chipmunk',
        rcsMarg: 'chipmunk',
        objType: 'chipmunk',
        raan: 'chipmunk',
        raanMarg: 'chipmunk',
        argPe: 'chipmunk',
        argPeMarg: 'chipmunk',
        bus: 'All',
        shape: 'All',
        payload: 'All',
      });
    expect(result).toThrow();
  });
});

// @ponicode
describe('findSat.checkInview', () => {
  test('0', () => {
    let param1: any = [{ inView: 0 }, { inView: 50 }];
    let result: any = findSat.checkInview(param1);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.checkObjtype', () => {
  test('0', () => {
    let param1: any = [{ type: 0 }, { type: 1 }];
    let result: any = findSat.checkObjtype(param1, 1);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.checkAz', () => {
  test('0', () => {
    let param1: any = [{ az: 0 }, { az: 50 }];
    let result: any = findSat.checkAz(param1, -1, 1000);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.checkEl', () => {
  test('0', () => {
    let param1: any = [{ el: 0 }, { el: 50 }];
    let result: any = findSat.checkEl(param1, -1, 1000);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.checkRange', () => {
  test('0', () => {
    let param1: any = [{ rng: 0 }, { rng: 50 }];
    let result: any = findSat.checkRange(param1, -1, 1000);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('findSat.findByLooksSubmit', () => {
  test('0', () => {
    let result: any = findSat.findByLooksSubmit();
    expect(result).toMatchSnapshot();
  });
});

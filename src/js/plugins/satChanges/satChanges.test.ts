import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/externalApi';
import * as satChanges from './satChanges';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('satChanges.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      satChanges.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('satChanges.uiManagerInit', () => {
  test('0', () => {
    let result: any = satChanges.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satChanges.hideSideMenus', () => {
  test('0', () => {
    let result: any = satChanges.hideSideMenus();
    expect(result).toMatchSnapshot();
  });
});

describe('satChanges.bottomMenuClick', () => {
  test('0', () => {
    let result: any = satChanges.bottomMenuClick('menu-satChng');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satChanges.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    satChanges.bottomMenuClick('menu-satChng');
    satChanges.bottomMenuClick('menu-satChng');
    let result: any = () => {
      satChanges.bottomMenuClick('menu-satChng');
    };
    expect(result).toMatchSnapshot();
  });
});

describe('satChanges.satChng', () => {
  beforeAll(() => {
    keepTrackApi.programs.satChange.satChngTable = [
      { SCC: 25544, inc: 51, meanmo: 120 },
      { SCC: 25545, inc: 51, meanmo: 120 },
    ];
  });
  test('0', () => {
    let result: any = satChanges.satChng(0);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satChanges.satChng(1);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = () => {
      keepTrackApi.programs.satChange.satChngTable = [];
      satChanges.satChng(-1);
    };
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = () => {
      satChanges.satChng(NaN);
    };
    expect(result).toThrow();
  });
});

// @ponicode
describe('satChanges.getSatChngJson', () => {
  test('0', () => {
    const fakeTable = [{ SCC: 25544, inc: 51, meanmo: 120 }];
    window.document.body.innerHTML = `<table id="satChng-table"></table>`;
    satChanges.getSatChngJson([{ day: 100, year: 2020, inc: 10 }], fakeTable);
  });
});

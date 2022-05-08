import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as satChanges from './sat-changes';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

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
    window.document.body.innerHTML = `<table id="satChng-table"></table>`;
    satChanges.getSatChngJson([{ SCC: 25544, day: 100, year: 2020, inc: 10 }]);
    let result: any = satChanges.bottomMenuClick('menu-satChng');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satChanges.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    window.document.body.innerHTML = `<table id="satChng-table"></table>`;
    satChanges.getSatChngJson([{ SCC: 25544, day: 100, year: 2020, inc: 10 }]);
    satChanges.bottomMenuClick('menu-satChng');
    satChanges.bottomMenuClick('menu-satChng');
    let result: any = () => {
      satChanges.bottomMenuClick('menu-satChng');
    };
    expect(result).toMatchSnapshot();
  });
});

describe('satChanges.satChng', () => {
  const mockSatChngTable = [
    { SCC: 25544, year: '58', day: '001', inc: 51, meanmo: 120, date: new Date(2019, 1, 2).toString() },
    { SCC: 25545, year: '08', day: '001', inc: 51, meanmo: 120, date: new Date(2019, 1, 2).toString() },
  ];
  test('0', () => {
    document.body.innerHTML = `
    <div id="search-results"></div>
    <table id="satChng-table"></table>`;
    let result: any = satChanges.satChng(0, mockSatChngTable);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `
    <div id="search-results"></div>
    <table id="satChng-table"></table>`;
    let result: any = satChanges.satChng(1, mockSatChngTable);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = () => {
      satChanges.satChng(-1, []);
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
    window.document.body.innerHTML = `<table id="satChng-table"></table>`;
    satChanges.getSatChngJson([{ SCC: 25544, day: 100, year: 2020, inc: 10 }]);
  });
});

import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as updateDopsTable from './dops';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

const dateNow = new Date(2022, 0, 1);
dateNow.setUTCHours(0, 0, 0, 0);

// @ponicode
describe('satMath.updateDopsTable', () => {
  test('0', () => {
    document.body.innerHTML = `<table id="dops"></table>`;
    let result: any = updateDopsTable.updateDopsTable(0, 0, 10);
    expect(result).toMatchSnapshot();
  });
});
// @ponicode
describe('satMath.getDops', () => {
  test('0', () => {
    let result: any = updateDopsTable.getDops(0, 0, 10, dateNow);
    expect(result).toMatchSnapshot();
  });
});
// @ponicode
describe('satMath.calculateDops', () => {
  test('0', () => {
    let result: any = updateDopsTable.calculateDops([
      { az: 0, el: 20 },
      { az: 90, el: 20 },
      { az: 180, el: 20 },
      { az: 270, el: 20 },
      { az: 0, el: 90 },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = updateDopsTable.calculateDops([
      { az: 0, el: 20 },
      { az: 90, el: 20 },
    ]);
    expect(result).toMatchSnapshot();
  });
});

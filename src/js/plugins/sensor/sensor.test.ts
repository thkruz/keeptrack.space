import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/externalApi';
import * as sensor from '@app/js/plugins/sensor/sensor';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode

// @ponicode
describe('sensor.init', () => {
  test('0', () => {
    let result: any = sensor.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensor.hideSideMenus', () => {
  test('0', () => {
    let result: any = sensor.hideSideMenus();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensor.selectSatData', () => {
  test('0', () => {
    let result: any = sensor.selectSatData();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensor.uiManagerInit', () => {
  test('0', () => {
    let result: any = sensor.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensor.bottomMenuClick', () => {
  test('0', () => {
    sensor.bottomMenuClick('menu-lookanglesmultisite');
    let result: any = sensor.bottomMenuClick('menu-lookanglesmultisite');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    sensor.bottomMenuClick('menu-sensor-list');
    let result: any = sensor.bottomMenuClick('menu-sensor-list');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    sensor.bottomMenuClick('menu-sensor-info');
    let result: any = sensor.bottomMenuClick('menu-sensor-info');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    sensor.bottomMenuClick('menu-lookangles');
    let result: any = sensor.bottomMenuClick('menu-lookangles');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    sensor.bottomMenuClick('menu-customSensor');
    let result: any = sensor.bottomMenuClick('menu-customSensor');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = sensor.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});

import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as sensor from './sensor';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
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
describe('sensor.sensorListContentClick', () => {
  test('0', () => {
    let result: any = sensor.sensorListContentClick('cspocAll');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = sensor.sensorListContentClick('mwAll');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = sensor.sensorListContentClick('mdAll');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = sensor.sensorListContentClick('llAll');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = sensor.sensorListContentClick('rusAll');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = sensor.sensorListContentClick('COD');
    expect(result).toMatchSnapshot();
  });
});

describe('sensor.bottomMenuClick', () => {
  test('0', () => {
    sensor.bottomMenuClick('menu-lookanglesmultisite');
    keepTrackApi.programs.objectManager.selectedSat = 1;
    sensor.bottomMenuClick('menu-lookanglesmultisite');
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
    keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
    sensor.bottomMenuClick('menu-sensor-info');
    sensor.bottomMenuClick('menu-sensor-info');
    keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
    sensor.bottomMenuClick('menu-sensor-info');
    let result: any = () => {
      sensor.bottomMenuClick('menu-sensor-info');
    };
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    sensor.bottomMenuClick('menu-lookangles');
    keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
    keepTrackApi.programs.objectManager.selectedSat = 1;
    sensor.bottomMenuClick('menu-lookangles');
    sensor.bottomMenuClick('menu-lookangles');
    let result: any = sensor.bottomMenuClick('menu-lookangles');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.sensorManager.selectedSensor = {
      lat: 0,
      lon: 0,
      alt: 0,
    };
    sensor.bottomMenuClick('menu-customSensor');
    let result: any = () => sensor.bottomMenuClick('menu-customSensor');
    expect(result).not.toThrow();
  });

  test('5', () => {
    let result: any = sensor.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});

describe('sensor.resetSensorSelected', () => {
  test('0', () => {
    sensor.resetSensorSelected();
    let result: any = sensor.resetSensorSelected();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensor.resetSensorButtonClick', () => {
  test('0', () => {
    let result: any = sensor.resetSensorButtonClick();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensor.csTelescopeClick', () => {
  test('0', () => {
    let result: any = sensor.csTelescopeClick();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('sensor.customSensorSubmit', () => {
  test('0', () => {
    document.body.innerHTML = `
      <div id="sensor-type"></div>
      <input id="cs-type"></input>
    `;
    let result: any = sensor.customSensorSubmit();
    expect(result).toMatchSnapshot();
  });
});

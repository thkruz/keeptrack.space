// TODO: Jest snapshots are currently dependent on local computer time. They
// should be updated to use the same time on all computers.

import { defaultSat, defaultSensor, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { getOrbitByLatLon } from './getOrbitByLatLon';
import * as satMath from './satMath';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
const dateNow = new Date(2022, 0, 1);
dateNow.setUTCHours(0, 0, 0, 0);

// @ponicode
describe.skip('satMath.findCloseObjects', () => {
  test('0', () => {
    let result: any = satMath.findCloseObjects();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.getOrbitByLatLon', () => {
  test('0', () => {
    let result: any = getOrbitByLatLon(defaultSat, 0, 0, 'N', dateNow, 1000, 0);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.calculateLookAngles', () => {
  test('0', () => {
    satMath.calculateLookAngles(defaultSat, [defaultSensor]);
  });
});

// @ponicode
describe('satMath.findBestPasses', () => {
  test('0', () => {
    let result: any = satMath.findBestPasses('25544', defaultSensor);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.findBestPass', () => {
  test('0', () => {
    satMath.findBestPass(defaultSat, [defaultSensor]);
  });
});

// @ponicode
describe('satMath.eci2Rae', () => {
  test('0', () => {
    satMath.eci2Rae(dateNow, [10000, 10000, 10000], defaultSensor);
  });
});

// @ponicode
describe('satMath.getEci', () => {
  test('0', () => {
    satMath.getEci(defaultSat, dateNow);
  });
});

// @ponicode
describe.skip('satMath.findNearbyObjectsByOrbit', () => {
  test('0', () => {
    let result: any = satMath.findNearbyObjectsByOrbit(defaultSat);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.updateDopsTable', () => {
  test('0', () => {
    document.body.innerHTML = `<table id="dops"></table>`;
    let result: any = satMath.updateDopsTable(0, 0, 10);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.getDops', () => {
  test('0', () => {
    let result: any = satMath.getDops(0, 0, 10, dateNow);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.calculateDops', () => {
  test('0', () => {
    let result: any = satMath.calculateDops([
      { az: 0, el: 20 },
      { az: 90, el: 20 },
      { az: 180, el: 20 },
      { az: 270, el: 20 },
      { az: 0, el: 90 },
    ]);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satMath.calculateDops([
      { az: 0, el: 20 },
      { az: 90, el: 20 },
    ]);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.getSunDirection', () => {
  test('0', () => {
    let result: any = satMath.getSunDirection(12345678);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satMath.getSunDirection(1234567890);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.getSunTimes', () => {
  test('0', () => {
    let result: any = satMath.getSunTimes(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satMath.getSunTimes(defaultSat, [defaultSensor]);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.lookAngles2Ecf', () => {
  test('0', () => {
    let result: any = satMath.lookAngles2Ecf(47, 20, 2000, 41, -71, 0);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satMath.lookAngles2Ecf(167, 20, 5000, 41, -71, 0);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.eci2ll', () => {
  test('0', () => {
    satMath.eci2ll(1000, 2000, 4000);
  });

  test('1', () => {
    satMath.eci2ll(-1000, 5000, 0);
  });
});

// @ponicode
describe('satMath.getLlaTimeView', () => {
  test('0', () => {
    satMath.getLlaTimeView(dateNow, defaultSat);
  });

  test('1', () => {
    satMath.getLlaTimeView(new Date(2022, 0, 2), defaultSat);
  });
});

// @ponicode
describe('satMath.map', () => {
  test('0', () => {
    satMath.map(defaultSat, 0);
  });

  test('1', () => {
    satMath.map(defaultSat, 10);
  });
});

// @ponicode
describe('satMath.calculateSensorPos', () => {
  test('0', () => {
    satMath.calculateSensorPos([defaultSensor]);
  });

  test('1', () => {
    satMath.calculateSensorPos();
  });
});

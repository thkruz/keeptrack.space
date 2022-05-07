import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as stereoMap from '@app/js/plugins/stereo-map/stereo-map';
keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('stereoMap.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      stereoMap.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('stereoMap.resize2DMap', () => {
  test('0', () => {
    let callFunction: any = () => {
      stereoMap.resize2DMap(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      stereoMap.resize2DMap(false);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('stereoMap.updateMap', () => {
  test('0', () => {
    let result: any = stereoMap.updateMap();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.objectManager.selectedSat = 1;
    keepTrackApi.programs.mapManager.isMapMenuOpen = true;
    keepTrackApi.programs.satellite.degreesLat = () => 1;
    keepTrackApi.programs.satellite.degreesLong = () => 1;
    let result: any = stereoMap.updateMap();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('stereoMap.bottomMenuClick', () => {
  test('0', () => {
    let result: any = stereoMap.bottomMenuClick('menu-map');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.objectManager.selectedSat = 1;
    keepTrackApi.programs.mapManager.isMapMenuOpen = false;
    settingsManager.isMobileModeEnabled = true;
    let result: any = stereoMap.bottomMenuClick('menu-map');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    keepTrackApi.programs.mapManager.isMapMenuOpen = false;
    let result: any = stereoMap.bottomMenuClick('menu-map');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = stereoMap.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('stereoMap.onCruncherMessage', () => {
  test('0', () => {
    keepTrackApi.programs.mapManager.isMapMenuOpen = true;
    let result: any = stereoMap.onCruncherMessage();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('stereoMap.braun', () => {
  test('0', () => {
    let result: any = stereoMap.braun({ lon: 0, lat: 90 }, { meridian: 12, latLimit: 10 });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = stereoMap.braun({ x: 0.5, y: 0.5 }, { meridian: 12, latLimit: 10 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let callFunction: any = () => {
      stereoMap.braun({ x: 'a', y: 0.5 }, { meridian: 12, latLimit: 10 });
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('stereoMap.options', () => {
  test('0', () => {
    let result: any = stereoMap.options({ test: 'test' });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('stereoMap.uiManagerInit', () => {
  test('0', () => {
    let result: any = stereoMap.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('stereoMap.hideSideMenus', () => {
  test('0', () => {
    let result: any = stereoMap.hideSideMenus();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('stereoMap.mapMenuClick', () => {
  test('0', () => {
    let result: any = stereoMap.mapMenuClick({ currentTarget: { attributes: { time: { value: '2021-11-11 14:06:04.946' } } } });
    expect(result).toMatchSnapshot();
  });
});

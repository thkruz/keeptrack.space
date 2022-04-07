import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as constellations from '@app/js/plugins/constellations/constellations';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('constellations.init', () => {
  test('0', () => {
    let result: any = constellations.init();
    expect(result).toMatchSnapshot();
  });
});

describe('constellations.bottomMenuClick', () => {
  test('0', () => {
    let result: any = constellations.bottomMenuClick('menu-constellations');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    constellations.bottomMenuClick('menu-constellations');
    constellations.bottomMenuClick('menu-constellations');
    let result: any = () => {
      constellations.bottomMenuClick('menu-constellations');
    };
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = constellations.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('constellations.hideSideMenus', () => {
  test('0', () => {
    let result: any = constellations.hideSideMenus();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('constellations.uiManagerInit', () => {
  test('0', () => {
    let result: any = constellations.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('constellations.constellationMenuClick', () => {
  test('0', () => {
    delete keepTrackApi.programs.groupsManager.SpaceStations;
    let result: any = constellations.constellationMenuClick('SpaceStations');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = constellations.constellationMenuClick('GlonassGroup');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = constellations.constellationMenuClick('GalileoGroup');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = constellations.constellationMenuClick('GPSGroup');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = constellations.constellationMenuClick('AmatuerRadio');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = constellations.constellationMenuClick('aehf');
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = constellations.constellationMenuClick('wgs');
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = constellations.constellationMenuClick('starlink');
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = constellations.constellationMenuClick('sbirs');
    expect(result).toMatchSnapshot();
  });

  test('20', () => {
    let result: any = () => {
      constellations.constellationMenuClick(NaN);
    };
    expect(result).toThrow();
  });
});

// @ponicode
describe('constellations.groupSelected', () => {
  test('0', () => {
    let result: any = () => {
      constellations.groupSelected('');
    };
    expect(result).toThrow();
  });

  test('20', () => {
    let result: any = () => {
      constellations.groupSelected('NaN');
    };
    expect(result).toThrow();
  });
});

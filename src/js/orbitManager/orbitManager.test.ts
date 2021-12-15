import * as orbitManager from '@app/js/orbitManager/orbitManager';
import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

describe('orbitManager.init', () => {
  test('0', () => {
    () => {
      orbitManager.init();
    };
  });
});

// @ponicode
describe('orbitManager.setSelectOrbit', () => {
  beforeEach(() => {
    orbitManager.init(keepTrackApi.programs.orbitManager.orbitWorker);
  });

  test('1', () => {
    let result: any = orbitManager.setSelectOrbit(56784);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = orbitManager.setSelectOrbit(987650);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = orbitManager.setSelectOrbit(12);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.workerOnMessage', () => {
  test('1', () => {
    let result: any = orbitManager.workerOnMessage({ data: { satId: 987650 } });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = orbitManager.workerOnMessage({ data: { satId: 56784 } });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = orbitManager.workerOnMessage({ data: { satId: 12345 } });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = orbitManager.workerOnMessage({ data: { satId: NaN } });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.clearSelectOrbit', () => {
  test('0', () => {
    let result: any = orbitManager.clearSelectOrbit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.addInViewOrbit', () => {
  test('0', () => {
    let result: any = orbitManager.addInViewOrbit(987650);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = orbitManager.addInViewOrbit(12);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = orbitManager.addInViewOrbit(12345);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = orbitManager.addInViewOrbit(56784);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = orbitManager.addInViewOrbit(NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.removeInViewOrbit', () => {
  test('0', () => {
    let result: any = orbitManager.removeInViewOrbit(56784);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = orbitManager.removeInViewOrbit(12345);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = orbitManager.removeInViewOrbit(987650);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = orbitManager.removeInViewOrbit(Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.clearInViewOrbit', () => {
  test('0', () => {
    let result: any = orbitManager.clearInViewOrbit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.clearHoverOrbit', () => {
  test('0', () => {
    let result: any = orbitManager.clearHoverOrbit();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    orbitManager.setHoverOrbit(1);
    let result: any = orbitManager.clearHoverOrbit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.setHoverOrbit', () => {
  test('2', () => {
    let result: any = orbitManager.setHoverOrbit(987650);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = orbitManager.setHoverOrbit(56784);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = orbitManager.setHoverOrbit(12345);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = orbitManager.setHoverOrbit(NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('orbitManager.allocateBuffer', () => {
  test('0', () => {
    let result: any = orbitManager.allocateBuffer();
    expect(result).toMatchSnapshot();
  });
});
// @ponicode
describe('orbitManager.draw', () => {
  beforeEach(() => {
    orbitManager.init(keepTrackApi.programs.orbitManager.orbitWorker);
  });
  test('0', () => {
    orbitManager.addInViewOrbit(1);
    let result: any = orbitManager.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => ({
      static: false,
    });
    orbitManager.setSelectOrbit(1);
    let result: any = orbitManager.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null);
    expect(result).toMatchSnapshot();
  });
});

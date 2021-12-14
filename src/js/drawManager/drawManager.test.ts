import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms, SatObject } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import * as drawManager from './drawManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

declare const settingsManager;

// @ponicode
describe('drawManager.init ', () => {
  test('0', () => {
    let result = drawManager.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.drawLoop ', () => {
  beforeAll(() => {
    drawManager.glInit();
  });
  test('0', () => {
    let result = drawManager.drawLoop(15);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.glInit ', () => {
  test('0', async () => {
    drawManager.glInit().then(() => expect(drawManager.drawManager.gl).toMatchSnapshot());
  });
});

// @ponicode
describe('drawManager.startWithOrbits  ', () => {
  beforeAll(() => {
    settingsManager.startWithOrbitsDisplayed = true;
  });
  afterAll(() => {
    settingsManager.startWithOrbitsDisplayed = false;
  });
  test('0', () => {
    drawManager.startWithOrbits().then(() => expect(drawManager).toMatchSnapshot());
  });
});

// @ponicode
describe('drawManager.drawOptionalScenery', () => {
  test('0', () => {
    let result: any = drawManager.drawOptionalScenery();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.satCalculate', () => {
  test('0', () => {
    let result: any = drawManager.satCalculate();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.screenShot', () => {
  test('0', () => {
    keepTrackApi.programs.drawManager.gl = <WebGL2RenderingContext>(<unknown>{
      viewport: () => {},
      drawingBufferWidth: 0,
      drawingBufferHeight: 0,
      canvas: {
        width: 0,
        height: 0,
      },
    });
    let result: any = drawManager.screenShot();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.watermarkedDataUrl', () => {
  test('0', () => {
    let result: any = drawManager.watermarkedDataUrl(<HTMLCanvasElement>{ height: 64, width: 544 }, 'test');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = drawManager.watermarkedDataUrl(<HTMLCanvasElement>{ height: 24, width: 100 }, 'test2');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = drawManager.watermarkedDataUrl(<HTMLCanvasElement>{ height: 150, width: 390 }, 'false');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = drawManager.watermarkedDataUrl(<HTMLCanvasElement>{ height: 0.0, width: 576 }, 'test3');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.orbitsAbove', () => {
  test('0', () => {
    let result: any = drawManager.orbitsAbove();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    let result: any = drawManager.orbitsAbove();
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('2', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    document.body.innerHTML = '<div id="sat-minibox"></div>';
    keepTrackApi.programs.satSet.orbitalSats = 1;
    drawManager.orbitsAbove();
    let result: any = drawManager.orbitsAbove();
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });
});

// @ponicode
describe('drawManager.updateHover', () => {
  test('0', () => {
    let result: any = drawManager.updateHover();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.onDrawLoopComplete', () => {
  test('0', () => {
    let result: any = drawManager.onDrawLoopComplete(() => {});
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.resizePostProcessingTexture', () => {
  test('0', () => {
    let result: any = drawManager.resizePostProcessingTexture(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.drawManager.sceneManager.sun, keepTrackApi.programs.drawManager.postProcessingManager);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.demoMode', () => {
  test('0', () => {
    let result: any = drawManager.demoMode();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    settingsManager.demoModeInterval = -1;
    let result: any = drawManager.demoMode();
    expect(result).toMatchSnapshot();
    settingsManager.demoModeInterval = 1000;
  });
});

// @ponicode
describe('drawManager.loadScene', () => {
  test('0', async () => {
    let result: any = await drawManager.loadScene();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.createDotsManager', () => {
  test('0', () => {
    let result: any = drawManager.createDotsManager(keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.hoverBoxOnSat', () => {
  beforeAll(() => {
    document.body.innerHTML = `
    <canvas id="keeptrack-canvas"></canvas>
    <div id="sat-hoverbox"></div>
    <div id="sat-hoverbox1"></div>
    <div id="sat-hoverbox2"></div>
    <div id="sat-hoverbox3"></div>
    <div id="sat-minibox"></div>
    `;
    drawManager.init();
  });
  test('0', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    settingsManager.isDemoModeOn = false;
    let result: any = drawManager.hoverBoxOnSat(25544, 1000, 1000);
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('1', () => {
    let result: any = drawManager.hoverBoxOnSat(-1, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>{ static: true };
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{ isRadarData: true, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0 });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{ isRadarData: true, missileComplex: 1, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0 });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{ isRadarData: true, satId: 1, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0 });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{
        static: true,
        type: SpaceObjectType.CONTORL_FACILITY,
        setRAE: jest.fn(),
        rae: { range: 0, az: 0, el: 0 },
        rcs: '0',
        azError: 0,
        elError: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { total: 0, x: 0, y: 0, z: 0 },
      });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () => <SatObject>(<unknown>{
        static: true,
        type: SpaceObjectType.STAR,
        setRAE: jest.fn(),
        rae: { range: 0, az: 0, el: 0 },
        rcs: '0',
        azError: 0,
        elError: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { total: 0, x: 0, y: 0, z: 0 },
        ra: 0,
        dec: 0,
      });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () =>
      <SatObject>(<unknown>{ missile: true, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0, position: { x: 0, y: 0, z: 0 }, velocity: { total: 0, x: 0, y: 0, z: 0 } });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    keepTrackApi.programs.satSet.getSatExtraOnly = () =>
      <SatObject>(<unknown>{ satId: 1, setRAE: jest.fn(), rae: { range: 0, az: 0, el: 0 }, rcs: '0', azError: 0, elError: 0, position: { x: 0, y: 0, z: 0 }, velocity: { total: 0, x: 0, y: 0, z: 0 } });
    let result: any = drawManager.hoverBoxOnSat(5, 1000, 1000);
    expect(result).toMatchSnapshot();
  });
});

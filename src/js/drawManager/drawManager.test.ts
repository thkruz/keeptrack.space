import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms, SettingsManager } from '../api/keepTrackTypes';
import * as drawManager from './drawManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

declare const settingsManager: SettingsManager;

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
    drawManager.glInit(keepTrackApi.programs.drawManager.gl);
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
    drawManager.startWithOrbits().then(() => expect(settingsManager.isOrbitOverlayVisible).toBe(true));
  });
});

// @ponicode
describe('drawManager.drawOptionalScenery', () => {
  test('0', () => {
    let result: any = drawManager.drawOptionalScenery(keepTrackApi.programs.drawManager);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    settingsManager.enableLimitedUI = false;
    settingsManager.isDrawLess = false;
    let result = drawManager.drawOptionalScenery(keepTrackApi.programs.drawManager);
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
describe('drawManager.onDrawLoopComplete', () => {
  test('0', () => {
    let result: any = drawManager.onDrawLoopComplete(() => {});
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('drawManager.resizePostProcessingTexture', () => {
  test('0', () => {
    let result: any = drawManager.resizePostProcessingTexture(
      keepTrackApi.programs.drawManager.gl,
      keepTrackApi.programs.drawManager.sceneManager.sun,
      keepTrackApi.programs.drawManager.postProcessingManager
    );
    expect(result).toMatchSnapshot();
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

import * as dots from '@app/js/drawManager/dots';
import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/externalApi';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('dots.init', () => {
  test('0', () => {
    let result: any = dots.init(keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('dots.setupShaders', () => {
  test('0', () => {
    let result: any = dots.setupShaders();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('dots.updatePMvCamMatrix', () => {
  test('0', () => {
    keepTrackApi.programs.mainCamera.camMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    let result: any = dots.updatePMvCamMatrix([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], keepTrackApi.programs.mainCamera);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('dots.draw', () => {
  test('0', () => {
    let result: any = dots.draw(keepTrackApi.programs.mainCamera, keepTrackApi.programs.ColorScheme, null);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    dots.init(keepTrackApi.programs.drawManager.gl);
    settingsManager.cruncherReady = true;
    let result: any = dots.draw(keepTrackApi.programs.mainCamera, keepTrackApi.programs.ColorScheme, null);
    expect(result).toMatchSnapshot();
    settingsManager.cruncherReady = false;
  });
});

// @ponicode
describe('dots.drawGpuPickingFrameBuffer', () => {
  test('0', () => {
    let result: any = dots.drawGpuPickingFrameBuffer(keepTrackApi.programs.mainCamera, keepTrackApi.programs.ColorScheme);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    dots.init(keepTrackApi.programs.drawManager.gl);
    settingsManager.cruncherReady = true;
    let result: any = dots.drawGpuPickingFrameBuffer(keepTrackApi.programs.mainCamera, keepTrackApi.programs.ColorScheme);
    expect(result).toMatchSnapshot();
    settingsManager.cruncherReady = false;
  });
});

// @ponicode
describe('dots.createDrawProgram', () => {
  test('0', () => {
    let result: any = dots.createDrawProgram(keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('dots.createPickingProgram', () => {
  test('0', () => {
    let result: any = dots.createPickingProgram(keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('dots.updatePositionBuffer', () => {
  test('0', () => {
    let result: any = dots.updatePositionBuffer(1, 1, keepTrackApi.programs.timeManager);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('dots.updateSizeBuffer', () => {
  test('0', () => {
    let result: any = dots.updateSizeBuffer(keepTrackApi.programs.satSet.satData);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('dots.setupPickingBuffer', () => {
  test('0', () => {
    let result: any = dots.setupPickingBuffer(keepTrackApi.programs.satSet.satData);
    expect(result).toMatchSnapshot();
  });
});

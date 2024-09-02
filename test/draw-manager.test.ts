/* eslint-disable dot-notation */
import { keepTrackApi } from '@app/keepTrackApi';
import { CameraType } from '@app/singletons/camera';
import { Moon } from '@app/singletons/draw-manager/moon';
import { WebGLRenderer } from '@app/singletons/webgl-renderer';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupDefaultHtml } from './environment/standard-env';

describe('drawManager', () => {
  let drawManagerInstance: WebGLRenderer;

  beforeEach(() => {
    drawManagerInstance = new WebGLRenderer();
  });
  // Should process getScreenCoords
  it('process_get_screen_coords', () => {
    expect(() => drawManagerInstance.getScreenCoords(defaultSat)).not.toThrow();
  });

  // Should process orbitsAbove
  it('process_orbits_above', () => {
    setupDefaultHtml();
    drawManagerInstance.isDrawOrbitsAbove = false;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    keepTrackApi.getMainCamera().cameraType = CameraType.PLANETARIUM;
    keepTrackApi.getSensorManager().currentSensors = [defaultSensor];
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance.isDrawOrbitsAbove = true;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance['satLabelModeLastTime_'] = -1000000000000000000;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
  });

  it('should calculate the moon\'s position', () => {
    const moon = new Moon();
    const date = new Date(2023, 1, 1);
    const updateResults = () => moon['updateEciPosition_'](date);

    expect(() => updateResults()).not.toThrow();
    expect(moon.position).toMatchSnapshot();
  });
});

/* eslint-disable dot-notation */
import { CameraType } from '@app/engine/camera/camera';
import { Moon } from '@app/engine/rendering/draw-manager/celestial-bodies/moon';
import { WebGLRenderer } from '@app/engine/rendering/webgl-renderer';
import { defaultSat, defaultSensor } from './environment/apiMocks';
import { setupDefaultHtml } from './environment/standard-env';
import { ServiceLocator } from '@app/engine/core/service-locator';

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
    ServiceLocator.getMainCamera().cameraType = CameraType.PLANETARIUM;
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance.isDrawOrbitsAbove = true;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance['satLabelModeLastTime_'] = -1000000000000000000;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
  });

  it('should calculate the moon\'s position', () => {
    const moon = new Moon();
    const date = new Date(2023, 1, 1);
    const updateResults = () => moon.updatePosition(date);

    expect(() => updateResults()).not.toThrow();
    expect(moon.position).toMatchSnapshot();
  });
});

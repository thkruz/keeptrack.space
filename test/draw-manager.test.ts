import { keepTrackApi } from '@app/js/keepTrackApi';
import { CameraType } from '@app/js/singletons/camera';
import { DrawManager, StandardDrawManager } from '@app/js/singletons/draw-manager';
import { defaultSat } from './environment/apiMocks';
import { setupDefaultHtml } from './environment/standard-env';

describe('drawManager', () => {
  let drawManagerInstance: DrawManager;
  beforeEach(() => {
    drawManagerInstance = new StandardDrawManager();
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
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance.isDrawOrbitsAbove = true;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance['satLabelModeLastTime_'] = -1000000000000000000;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
  });
});

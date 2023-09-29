import { CameraType, mainCameraInstance } from '@app/js/singletons/camera';
import { DrawManager, StandardDrawManager } from '@app/js/singletons/draw-manager';
import { defaultSat } from './environment/apiMocks';

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
    drawManagerInstance.isDrawOrbitsAbove = false;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    mainCameraInstance.cameraType = CameraType.PLANETARIUM;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance.isDrawOrbitsAbove = true;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance['satLabelModeLastTime_'] = -1000000000000000000;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
  });
});

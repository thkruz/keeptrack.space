import { keepTrackApi } from '@app/keepTrackApi';
import { CameraType } from '@app/singletons/camera';
import { Moon } from '@app/singletons/draw-manager/moon';
import { WebGLRenderer } from '@app/singletons/webgl-renderer';
import { SatMath } from '@app/static/sat-math';
import { defaultSat } from './environment/apiMocks';
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
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance.isDrawOrbitsAbove = true;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
    drawManagerInstance['satLabelModeLastTime_'] = -1000000000000000000;
    expect(() => drawManagerInstance.orbitsAbove()).not.toThrow();
  });

  it("should calculate the moon's position", () => {
    const moon = new Moon();
    const date = new Date(2023, 1, 1);
    const { gmst } = SatMath.calculateTimeVariables(date);
    const updateResults = () => moon['updateEciPosition_'](date, gmst);
    expect(() => updateResults()).not.toThrow();
    expect(moon.position[0]).toBeCloseTo(23637.386512679914);
    expect(moon.position[1]).toBeCloseTo(200000);
    expect(moon.position[2]).toBeCloseTo(101830.2263725754);
  });
});

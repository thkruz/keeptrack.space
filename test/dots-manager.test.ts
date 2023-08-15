import { keepTrackContainer } from '@app/js/container';
import { ColorSchemeManager, Singletons } from '@app/js/interfaces';
import { DotsManager } from '@app/js/singletons/dots-manager';
import { DrawManager } from '@app/js/singletons/draw-manager';
import { mat4 } from 'gl-matrix';
import { Milliseconds } from 'ootk';
import { setupStandardEnvironment } from './environment/standard-env';

describe('drawManager', () => {
  let dotsManagerInstance: DotsManager;
  beforeEach(() => {
    dotsManagerInstance = new DotsManager();
  });
  // Should process getScreenCoords
  it('process_get_screen_coords', () => {
    setupStandardEnvironment();
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer>null)).not.toThrow();
    dotsManagerInstance.isReady = true;
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer>null)).not.toThrow();
    settingsManager.cruncherReady = true;
    const colorSchemeManagerInstance = keepTrackContainer.get<ColorSchemeManager>(Singletons.ColorSchemeManager);
    colorSchemeManagerInstance.colorBuffer = new Uint8Array(4);
    dotsManagerInstance['settings_'] = {
      ...dotsManagerInstance['settings_'],
      satShader: {
        minSize: 1,
        maxSize: 1,
      } as any,
    };
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer>null)).not.toThrow();
  });

  // Should process updatePositionBuffer
  it('process_update_position_buffer', () => {
    dotsManagerInstance.positionData = new Float32Array(1);
    dotsManagerInstance.velocityData = new Float32Array(1);
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    drawManagerInstance.dtAdjusted = <Milliseconds>1000000000;
    expect(() => dotsManagerInstance.updatePositionBuffer()).not.toThrow();
    drawManagerInstance.dtAdjusted = <Milliseconds>1000000000;
    expect(() => dotsManagerInstance.updatePositionBuffer()).not.toThrow();
  });
});

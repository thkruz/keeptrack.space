/* eslint-disable dot-notation */
import { keepTrackApi } from '@app/keepTrackApi';
import { SettingsManager } from '@app/settings/settings';
import { DotsManager } from '@app/singletons/dots-manager';
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
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    colorSchemeManagerInstance.colorBuffer = new Uint8Array(4);
    dotsManagerInstance['settings_'] = <SettingsManager>{
      ...dotsManagerInstance['settings_'],
      satShader: {
        minSize: 1,
        maxSize: 1,
      } as unknown as WebGLProgram,
    };
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer>null)).not.toThrow();
  });

  // Should process updatePositionBuffer
  it('process_update_position_buffer', () => {
    dotsManagerInstance.positionData = new Float32Array(1);
    dotsManagerInstance.velocityData = new Float32Array(1);
    const drawManagerInstance = keepTrackApi.getRenderer();

    drawManagerInstance.dtAdjusted = <Milliseconds>1000000000;
    expect(() => dotsManagerInstance.updatePositionBuffer()).not.toThrow();
    drawManagerInstance.dtAdjusted = <Milliseconds>1000000000;
    expect(() => dotsManagerInstance.updatePositionBuffer()).not.toThrow();
  });
});

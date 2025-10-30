/* eslint-disable dot-notation */
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { DotsManager } from '@app/engine/rendering/dots-manager';
import { SettingsManager } from '@app/settings/settings';
import { Milliseconds } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { setupStandardEnvironment } from './environment/standard-env';

describe('drawManager', () => {
  let dotsManagerInstance: DotsManager;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
    dotsManagerInstance = new DotsManager();
  });
  // Should process getScreenCoords
  it('process_get_screen_coords', () => {
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer><unknown>null)).not.toThrow();
    dotsManagerInstance.isReady = true;
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer><unknown>null)).not.toThrow();
    settingsManager.cruncherReady = true;
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    colorSchemeManagerInstance.colorBuffer = new Uint8Array(4);
    dotsManagerInstance['settings_'] = <SettingsManager>{
      ...dotsManagerInstance['settings_'],
      satShader: {
        minSize: 1,
        maxSize: 1,
      } as unknown as WebGLProgram,
    };
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer><unknown>null)).not.toThrow();
  });

  // Should process updatePositionBuffer
  it('process_update_position_buffer', () => {
    dotsManagerInstance.positionData = new Float32Array(1);
    dotsManagerInstance.velocityData = new Float32Array(1);
    const drawManagerInstance = ServiceLocator.getRenderer();

    drawManagerInstance.dtAdjusted = <Milliseconds>1000000000;
    expect(() => dotsManagerInstance.update()).not.toThrow();
    drawManagerInstance.dtAdjusted = <Milliseconds>1000000000;
    expect(() => dotsManagerInstance.update()).not.toThrow();
  });
});

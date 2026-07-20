/* eslint-disable dot-notation */
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { DotsManager } from '@app/engine/rendering/dots-manager';
import { WebGLRenderer } from '@app/engine/rendering/webgl-renderer';
import { SettingsManager } from '@app/settings/settings';
import { BaseObject, Milliseconds } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { mat4 } from 'gl-matrix';
import { vi } from 'vitest';

describe('drawManager', () => {
  let dotsManagerInstance: DotsManager;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
    dotsManagerInstance = new DotsManager();
  });
  // Should process getScreenCoords
  it('process_get_screen_coords', () => {
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer>(<unknown>null))).not.toThrow();
    dotsManagerInstance.isReady = true;
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer>(<unknown>null))).not.toThrow();
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
    expect(() => dotsManagerInstance.draw(mat4.create(), <WebGLFramebuffer>(<unknown>null))).not.toThrow();
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

  // Regression for issue #1340 — null positionData/velocityData must not throw mid-render
  describe('updatePosVel guards null typed arrays (issue #1340)', () => {
    const stubStaticObject = { isStatic: () => true } as unknown as BaseObject;
    const stubMovingObject = { isStatic: () => false, type: -1, velocity: { x: 0, y: 0, z: 0 } } as unknown as BaseObject;

    it('returns silently when positionData is null but velocityData is set (worker delivered satVel without satPos)', () => {
      dotsManagerInstance.velocityData = new Float32Array(3);
      dotsManagerInstance.positionData = null as unknown as Float32Array;
      expect(() => dotsManagerInstance.updatePosVel(stubStaticObject, 0)).not.toThrow();
      expect(() => dotsManagerInstance.updatePosVel(stubMovingObject, 0)).not.toThrow();
    });

    it('returns silently when velocityData is null', () => {
      dotsManagerInstance.positionData = new Float32Array(3);
      dotsManagerInstance.velocityData = null as unknown as Float32Array;
      expect(() => dotsManagerInstance.updatePosVel(stubStaticObject, 0)).not.toThrow();
    });
  });

  // getRenderedPositionArray mirrors the dots vertex shader's ground rotation so
  // CPU consumers (camera follow, world shift, mesh, orbit-line head) line up with
  // the rendered dot. Above the ground-rotation radius it must be an exact passthrough.
  describe('getRenderedPositionArray', () => {
    it('returns the stored position unchanged above the ground-rotation radius', () => {
      // A high-altitude position (well above 6421 km from Earth's center).
      dotsManagerInstance.positionData = new Float32Array([0, 0, 0, 10000, 0, 0]);

      expect(dotsManagerInstance.getRenderedPositionArray(1)).toEqual([10000, 0, 0]);
    });

    it('applies the (currentGmst - cruncherGmst) rotation below the radius', () => {
      // A low position (< 6421 km from center) that the shader would rotate.
      dotsManagerInstance.positionData = new Float32Array([1000, 0, 0]);
      dotsManagerInstance.cruncherGmst = 0;
      ServiceLocator.getTimeManager().gmst = (Math.PI / 2) as never;

      const [x, y, z] = dotsManagerInstance.getRenderedPositionArray(0);

      // Rotating (1000,0,0) by +90deg about Z -> (0, 1000, 0).
      expect(x).toBeCloseTo(0, 6);
      expect(y).toBeCloseTo(1000, 6);
      expect(z).toBe(0);
    });

    it('is a no-op below the radius when currentGmst equals cruncherGmst', () => {
      dotsManagerInstance.positionData = new Float32Array([1000, 500, 0]);
      dotsManagerInstance.cruncherGmst = 0.3 as never;
      ServiceLocator.getTimeManager().gmst = 0.3 as never;

      const [x, y, z] = dotsManagerInstance.getRenderedPositionArray(0);

      expect(x).toBeCloseTo(1000, 6);
      expect(y).toBeCloseTo(500, 6);
      expect(z).toBe(0);
    });
  });

  // FC-08: cruncher messages must not clobber hand-propagated positions mid-capture
  describe('updateCruncherBuffers capture gate', () => {
    it('drops cruncher position data while renderer.isCapturing, applies it after', () => {
      const renderer = ServiceLocator.getRenderer();

      dotsManagerInstance.positionData = new Float32Array([1, 2, 3]);

      renderer.isCapturing = true;
      dotsManagerInstance.updateCruncherBuffers({ satPos: new Float32Array([9, 9, 9]) } as never);
      expect(Array.from(dotsManagerInstance.positionData)).toEqual([1, 2, 3]);

      renderer.isCapturing = false;
      dotsManagerInstance.updateCruncherBuffers({ satPos: new Float32Array([9, 9, 9]) } as never);
      expect(Array.from(dotsManagerInstance.positionData)).toEqual([9, 9, 9]);
    });
  });
});

describe('DotsManager picking program lifecycle', () => {
  let dotsManagerInstance: DotsManager;
  let renderer: WebGLRenderer;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
    dotsManagerInstance = ServiceLocator.getDotsManager();
    renderer = ServiceLocator.getRenderer();

    // Distinct sentinels per allocation so identity comparisons can verify the
    // create -> delete -> create-new lifecycle across resizes.
    let fbCounter = 0;
    let texCounter = 0;
    let rbCounter = 0;

    renderer.gl.createFramebuffer = vi.fn(() => ({ id: `fb-${++fbCounter}` }) as unknown as WebGLFramebuffer);
    renderer.gl.createTexture = vi.fn(() => ({ id: `tex-${++texCounter}` }) as unknown as WebGLTexture);
    renderer.gl.createRenderbuffer = vi.fn(() => ({ id: `rb-${++rbCounter}` }) as unknown as WebGLRenderbuffer);
    renderer.gl.deleteFramebuffer = vi.fn();
    renderer.gl.deleteTexture = vi.fn();
    renderer.gl.deleteRenderbuffer = vi.fn();

    // Stub the picking shader source so initProgramPicking can compile through the
    // mock WebGL context without needing full DotsManager.init().
    dotsManagerInstance['shaders_'].picking = {
      vert: 'vert-source',
      frag: 'frag-source',
    };

    dotsManagerInstance.initProgramPicking();
  });

  it('only compiles the picking program once across resize cycles', () => {
    const programAfterInit = dotsManagerInstance.programs.picking.program;

    expect(programAfterInit).toBeTruthy();

    dotsManagerInstance.resizePickingFramebuffer();
    dotsManagerInstance.resizePickingFramebuffer();
    dotsManagerInstance.resizePickingFramebuffer();

    expect(dotsManagerInstance.programs.picking.program).toBe(programAfterInit);
  });

  it('deletes previous framebuffer/texture/renderbuffer on resize', () => {
    const initialFramebuffer = ServiceLocator.getScene().frameBuffers.gpuPicking;
    const initialTexture = dotsManagerInstance.pickingTexture;
    const initialRenderBuffer = dotsManagerInstance.pickingRenderBuffer;

    dotsManagerInstance.resizePickingFramebuffer();

    expect(renderer.gl.deleteFramebuffer).toHaveBeenCalledWith(initialFramebuffer);
    expect(renderer.gl.deleteTexture).toHaveBeenCalledWith(initialTexture);
    expect(renderer.gl.deleteRenderbuffer).toHaveBeenCalledWith(initialRenderBuffer);
    expect(dotsManagerInstance.pickingTexture).not.toBe(initialTexture);
    expect(dotsManagerInstance.pickingRenderBuffer).not.toBe(initialRenderBuffer);
  });

  it('does not reallocate pickReadPixelBuffer on resize', () => {
    const initialBuffer = dotsManagerInstance.pickReadPixelBuffer;

    expect(initialBuffer).toBeInstanceOf(Uint8Array);

    dotsManagerInstance.resizePickingFramebuffer();
    dotsManagerInstance.resizePickingFramebuffer();

    expect(dotsManagerInstance.pickReadPixelBuffer).toBe(initialBuffer);
  });
});

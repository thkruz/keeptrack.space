import { Scene } from '@app/engine/core/scene';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { FrameProfiler } from '@app/engine/utils/frame-profiler';

import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * The performance-downgrade cascade must require measured GPU load before
 * disabling visuals. A sub-30fps frame delta with an idle GPU is a
 * presentation cap (remote desktop, OS frame limiter) - downgrading there
 * destroys the scene (planets off kills planet orbits AND freezes deep-space
 * probes) without ever raising the frame rate.
 */
describe('Scene.updateVisualsBasedOnPerformance_', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let scene: any;
  /**
   * scene.ts reads the AMBIENT GLOBAL settingsManager (no import), so the test
   * must mutate that same object - the module import is a different instance
   * in the vitest realm.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sm: any;
  let toastSpy: ReturnType<typeof vi.fn>;
  let savedFlags: Record<string, unknown>;

  const runCheck = () => scene.updateVisualsBasedOnPerformance_();

  beforeEach(() => {
    setupStandardEnvironment();
    scene = ServiceLocator.getScene() as unknown as Scene;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sm = (globalThis as any).settingsManager;

    savedFlags = {
      isDisablePerformanceDowngrade: sm.isDisablePerformanceDowngrade,
      isDisableGodrays: sm.isDisableGodrays,
      isDrawAurora: sm.isDrawAurora,
      isUseSunTexture: sm.isUseSunTexture,
      sizeOfSun: sm.sizeOfSun,
    };

    sm.isDisablePerformanceDowngrade = false;
    sm.isDisableGodrays = false; // first cascade step is armed

    // 10-second re-check timer elapsed, frame delta below the 30 fps limit
    scene.updateVisualsBasedOnPerformanceTime_ = 0;
    scene.averageDrawTime = 34;

    toastSpy = vi.fn();
    ServiceLocator.getUiManager().toast = toastSpy as never;
  });

  afterEach(() => {
    Object.assign(sm, savedFlags);
    vi.restoreAllMocks();
  });

  it('does NOT downgrade when the GPU is idle (present-capped environment)', () => {
    vi.spyOn(FrameProfiler.getInstance(), 'gpuBusyAvgMs').mockReturnValue(2.7);

    runCheck();

    expect(sm.isDisableGodrays).toBe(false);
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('downgrades when the GPU is measurably loaded', () => {
    vi.spyOn(FrameProfiler.getInstance(), 'gpuBusyAvgMs').mockReturnValue(28);

    runCheck();

    expect(sm.isDisableGodrays).toBe(true);
    expect(toastSpy).toHaveBeenCalled();
  });

  it('keeps the legacy frame-delta heuristic when GPU timing is unavailable', () => {
    vi.spyOn(FrameProfiler.getInstance(), 'gpuBusyAvgMs').mockReturnValue(null);

    runCheck();

    expect(sm.isDisableGodrays).toBe(true);
  });

  it('does nothing when the frame rate is fine', () => {
    vi.spyOn(FrameProfiler.getInstance(), 'gpuBusyAvgMs').mockReturnValue(28);
    scene.averageDrawTime = 16;

    runCheck();

    expect(sm.isDisableGodrays).toBe(false);
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('respects isDisablePerformanceDowngrade', () => {
    vi.spyOn(FrameProfiler.getInstance(), 'gpuBusyAvgMs').mockReturnValue(28);
    sm.isDisablePerformanceDowngrade = true;

    runCheck();

    expect(sm.isDisableGodrays).toBe(false);
  });
});

describe('FrameProfiler GPU busy monitor', () => {
  it('reports null and never throws when timer queries are unsupported', () => {
    const profiler = FrameProfiler.getInstance();

    profiler.setEnabled(false);

    expect(() => {
      profiler.monitorFrameGpuBegin();
      profiler.monitorFrameGpuEnd();
    }).not.toThrow();

    // jsdom glMock has no EXT_disjoint_timer_query_webgl2
    expect(profiler.gpuBusyAvgMs()).toBeNull();
  });

  it('reports null when the full profiler is on but has no GPU samples', () => {
    const profiler = FrameProfiler.getInstance();

    profiler.setEnabled(true);
    expect(profiler.gpuBusyAvgMs()).toBeNull();
    profiler.setEnabled(false);
  });
});

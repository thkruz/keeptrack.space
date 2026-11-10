import { ServiceLocator } from '@app/engine/core/service-locator';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbedEngine } from '../embed-engine-impl';

/** Parking the embed must also idle the position worker, which otherwise keeps its own 1 s loop running. */
describe('setRenderSuspended pauses the position worker', () => {
  const calls: string[] = [];
  const sendPause = vi.fn((isPaused: boolean) => calls.push(`pause:${isPaused}`));
  const engineStub = {
    suspendLoop: vi.fn(() => calls.push('suspendLoop')),
    resumeLoop: vi.fn(() => calls.push('resumeLoop')),
  };

  afterEach(() => {
    vi.restoreAllMocks();
    calls.length = 0;
    delete (window as unknown as { keepTrack?: unknown }).keepTrack;
  });

  it('pauses the worker on suspend and resumes it before the render loop restarts', () => {
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({ satCruncherThread: { sendPause } } as never);
    (window as unknown as { keepTrack: unknown }).keepTrack = { engine: engineStub };
    const engine = new KeepTrackEmbedEngine('scenario');

    engine.setRenderSuspended(true);
    engine.setRenderSuspended(false);

    expect(calls).toEqual(['suspendLoop', 'pause:true', 'pause:false', 'resumeLoop']);
  });

  it('does not throw before the catalog manager exists', () => {
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue(undefined as never);
    const engine = new KeepTrackEmbedEngine('scenario');

    expect(() => engine.setRenderSuspended(true)).not.toThrow();
  });
});

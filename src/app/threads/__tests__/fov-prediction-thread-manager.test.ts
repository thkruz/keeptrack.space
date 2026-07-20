import { FovPredictionThreadManager } from '@app/app/threads/fov-prediction-thread-manager';
import { vi } from 'vitest';

const IN = { INIT: 0, UPDATE_TIME: 1, CANCEL: 2 } as const;
const OUT = { FULL_SWEEP_COMPLETE: 0, PROGRESS: 2 } as const;

interface OnMessageable {
  onMessage(e: { data: unknown }): void;
}

const makeManager = () => {
  const postMessage = vi.fn();
  const stub = { postMessage, terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as Worker;
  const mgr = new FovPredictionThreadManager([]);

  mgr.init(stub);

  return { mgr, postMessage };
};

describe('FovPredictionThreadManager', () => {
  it('sendInit posts an INIT message and resets minutesToEntry', () => {
    const { mgr, postMessage } = makeManager();

    mgr.sendInit('[]', [], 1000, [0, 1], 90, 2);

    const sent = postMessage.mock.calls[0][0] as { typ: number; maxLookaheadMin: number; sweepStepMin: number };

    expect(sent.typ).toBe(IN.INIT);
    expect(sent.maxLookaheadMin).toBe(90);
    expect(sent.sweepStepMin).toBe(2);
    expect(mgr.minutesToEntry).toBeNull();
  });

  it('sendTimeUpdate and cancel post the right message types', () => {
    const { mgr, postMessage } = makeManager();

    mgr.sendTimeUpdate(2000);
    expect((postMessage.mock.calls[0][0] as { typ: number }).typ).toBe(IN.UPDATE_TIME);

    mgr.cancel();
    expect((postMessage.mock.calls[1][0] as { typ: number }).typ).toBe(IN.CANCEL);
    expect(mgr.minutesToEntry).toBeNull();
  });

  it('stores minutesToEntry on FULL_SWEEP_COMPLETE and consumeMinutesToEntry clears it', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;
    const arr = new Float32Array([1, 2, 3]);

    handler.onMessage({ data: { typ: OUT.FULL_SWEEP_COMPLETE, minutesToEntry: arr } });

    expect(mgr.minutesToEntry).toBe(arr);
    expect(mgr.consumeMinutesToEntry()).toBe(arr);
    expect(mgr.minutesToEntry).toBeNull();
  });

  it('invokes the progress callback on PROGRESS messages', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;
    const cb = vi.fn();

    mgr.setProgressCallback(cb);
    handler.onMessage({ data: { typ: OUT.PROGRESS, progress: 0.42 } });

    expect(cb).toHaveBeenCalledWith(0.42);
  });

  it('marks ready on the "ready" message', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: 'ready' });
    expect(mgr.isReady).toBe(true);
  });
});

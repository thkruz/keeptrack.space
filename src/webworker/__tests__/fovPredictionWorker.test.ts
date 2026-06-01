import { vi } from 'vitest';

// const-enum values (erased at compile time)
const IN = { INIT: 0, UPDATE_TIME: 1, CANCEL: 2 } as const;
const OUT = { FULL_SWEEP_COMPLETE: 0, INCREMENTAL_UPDATE: 1, PROGRESS: 2, PRIORITY_SWEEP_COMPLETE: 3 } as const;

const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

let posted: { typ?: number; minutesToEntry?: Float32Array }[] = [];

const loadWorker = async () => {
  await import('@app/webworker/fovPredictionWorker');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as ((m: { data: unknown }) => void))({ data });
};

describe('fovPredictionWorker', () => {
  beforeEach(() => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: { typ?: number }) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  it('posts "ready" on load and installs an onmessage handler', async () => {
    await loadWorker();

    expect(posted).toContainEqual('ready');
    expect(typeof globalThis.onmessage).toBe('function');
  });

  it('runs a full sweep on INIT and posts FULL_SWEEP_COMPLETE with minutesToEntry', async () => {
    await loadWorker();
    posted = [];

    dispatch({
      typ: IN.INIT,
      catalogJson: JSON.stringify([{ tle1: TLE1, tle2: TLE2, active: true }]),
      sensors: [],
      simTimeMs: Date.UTC(2008, 8, 20, 0, 0, 0),
      maxLookaheadMin: 120,
      sweepStepMin: 5,
    });

    // fullSweep yields via setTimeout(0) between batches — drive it to completion.
    await vi.runAllTimersAsync();

    const complete = posted.find((p) => p.typ === OUT.FULL_SWEEP_COMPLETE);

    expect(complete).toBeDefined();
    expect(complete!.minutesToEntry).toBeInstanceOf(Float32Array);
    expect(complete!.minutesToEntry!.length).toBe(1);
  });

  it('handles UPDATE_TIME and CANCEL without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: IN.UPDATE_TIME, simTimeMs: Date.UTC(2008, 8, 20, 0, 30, 0) })).not.toThrow();
    expect(() => dispatch({ typ: IN.CANCEL })).not.toThrow();
  });
});

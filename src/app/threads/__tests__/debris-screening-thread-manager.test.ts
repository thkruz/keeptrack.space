import { DebrisScreeningThreadManager, DsScreeningCallbacks, DsScreeningParams } from '@app/app/threads/debris-screening-thread-manager';
import { vi } from 'vitest';

const OUT = { CHUNK: 1, COMPLETE: 2, ERROR: 3, PROGRESS: 4 } as const;
const IN_START = 0;
const IN_CANCEL = 1;

interface OnMessageable { onMessage(e: { data: unknown }): void }

const makeManager = () => {
  const postMessage = vi.fn();
  const stub = { postMessage, terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as Worker;
  const mgr = new DebrisScreeningThreadManager([]);

  mgr.init(stub);

  return { mgr, postMessage };
};

const params = (): DsScreeningParams => ({
  primary: { tle1: 'a', tle2: 'b', name: 'P', radius: 0.05 },
  secondaries: [{ tle1: 'c', tle2: 'd', name: 'S', radius: 0.05 }],
  startTimeMs: 0,
  endTimeMs: 1000,
  searchStepSize: 60,
  uVal: 1,
  vVal: 1,
  wVal: 1,
  covarianceConfidenceLevel: 0.95,
});

const callbacks = (): DsScreeningCallbacks => ({
  onChunk: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
  onProgress: vi.fn(),
});

describe('DebrisScreeningThreadManager', () => {
  it('posts a START_SCREENING message and returns an incrementing runId', () => {
    const { mgr, postMessage } = makeManager();

    const runId = mgr.startScreening(params(), callbacks());

    expect(runId).toBe(1);
    const sent = postMessage.mock.calls[0][0] as { typ: number; runId: number; batchSize: number };

    expect(sent.typ).toBe(IN_START);
    expect(sent.runId).toBe(1);
    expect(sent.batchSize).toBe(15); // default
  });

  it('routes CHUNK / COMPLETE messages to callbacks for the current run', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startScreening(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId, results: [], processedCount: 3, totalCandidates: 10 } });
    expect(cbs.onChunk).toHaveBeenCalledWith([], 3, 10);

    handler.onMessage({ data: { typ: OUT.COMPLETE, runId, totalResults: 2, totalCandidates: 10 } });
    expect(cbs.onComplete).toHaveBeenCalledWith(2, 10);
  });

  it('routes ERROR and PROGRESS messages', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startScreening(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.PROGRESS, runId, phase: 'coarse_filter', candidateCount: 7 } });
    expect(cbs.onProgress).toHaveBeenCalledWith('coarse_filter', 7);

    handler.onMessage({ data: { typ: OUT.ERROR, runId, message: 'boom' } });
    expect(cbs.onError).toHaveBeenCalledWith('boom');
  });

  it('discards messages from a stale runId', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();

    mgr.startScreening(params(), cbs); // runId 1
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId: 999, results: [], processedCount: 1, totalCandidates: 1 } });
    expect(cbs.onChunk).not.toHaveBeenCalled();
  });

  it('marks ready on the "ready" message', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: 'ready' });
    expect(mgr.isReady).toBe(true);
  });

  it('posts a CANCEL message on cancelScreening', () => {
    const { mgr, postMessage } = makeManager();

    mgr.startScreening(params(), callbacks());
    postMessage.mockClear();
    mgr.cancelScreening();

    expect((postMessage.mock.calls[0][0] as { typ: number }).typ).toBe(IN_CANCEL);
  });
});

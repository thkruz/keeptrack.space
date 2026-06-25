import { Time2LonCallbacks, Time2LonParams, Time2LonThreadManager } from '@app/app/threads/time2lon-thread-manager';
import { vi } from 'vitest';

const OUT = { CHUNK: 0, PROGRESS: 1, COMPLETE: 2, ERROR: 3 } as const;
const IN_START = 0;
const IN_CANCEL = 1;

interface OnMessageable { onMessage(e: { data: unknown }): void }

const makeManager = () => {
  const postMessage = vi.fn();
  const stub = { postMessage, terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as Worker;
  const mgr = new Time2LonThreadManager([]);

  mgr.init(stub);

  return { mgr, postMessage };
};

const params = (): Time2LonParams => ({
  sats: [{ satId: 1, satName: 'GEOSAT', country: 'United States', tle1: 'a', tle2: 'b', periodMin: 1436 }],
  nowMs: 0,
  samplePoints: 24,
  maxTimeMin: 1440,
});

const callbacks = (): Time2LonCallbacks => ({
  onChunk: vi.fn(),
  onProgress: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

describe('Time2LonThreadManager', () => {
  it('posts a START message and returns an incrementing runId', () => {
    const { mgr, postMessage } = makeManager();

    const runId = mgr.startTime2Lon(params(), callbacks());

    expect(runId).toBe(1);
    const sent = postMessage.mock.calls[0][0] as { typ: number; runId: number; samplePoints: number; maxTimeMin: number };

    expect(sent.typ).toBe(IN_START);
    expect(sent.runId).toBe(1);
    expect(sent.samplePoints).toBe(24);
    expect(sent.maxTimeMin).toBe(1440);
  });

  it('routes CHUNK / PROGRESS / COMPLETE messages to callbacks for the current run', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startTime2Lon(params(), cbs);
    const handler = mgr as unknown as OnMessageable;
    const line = { satName: 'GEOSAT', satId: 1, country: 'United States', points: [] };

    handler.onMessage({ data: { typ: OUT.CHUNK, runId, line } });
    expect(cbs.onChunk).toHaveBeenCalledWith(line);

    handler.onMessage({ data: { typ: OUT.PROGRESS, runId, processed: 1, total: 3 } });
    expect(cbs.onProgress).toHaveBeenCalledWith(1, 3);

    handler.onMessage({ data: { typ: OUT.COMPLETE, runId } });
    expect(cbs.onComplete).toHaveBeenCalled();
  });

  it('routes ERROR messages', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startTime2Lon(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.ERROR, runId, message: 'boom' } });
    expect(cbs.onError).toHaveBeenCalledWith('boom');
  });

  it('discards messages from a stale runId (the rapid-filter-change race guard)', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();

    mgr.startTime2Lon(params(), cbs); // runId 1
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId: 999, line: null } });
    expect(cbs.onChunk).not.toHaveBeenCalled();
  });

  it('marks ready on the "ready" message', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: 'ready' });
    expect(mgr.isReady).toBe(true);
  });

  it('posts a CANCEL message on cancelTime2Lon', () => {
    const { mgr, postMessage } = makeManager();

    mgr.startTime2Lon(params(), callbacks());
    postMessage.mockClear();
    mgr.cancelTime2Lon();

    expect((postMessage.mock.calls[0][0] as { typ: number }).typ).toBe(IN_CANCEL);
  });
});

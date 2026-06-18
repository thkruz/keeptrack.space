import { OverflightCallbacks, OverflightParams, OverflightThreadManager } from '@app/app/threads/overflight-thread-manager';
import { vi } from 'vitest';

const OUT = { CHUNK: 0, PROGRESS: 1, COMPLETE: 2, ERROR: 3 } as const;
const IN_START = 0;
const IN_CANCEL = 1;

interface OnMessageable { onMessage(e: { data: unknown }): void }

const makeManager = () => {
  const postMessage = vi.fn();
  const stub = { postMessage, terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as Worker;
  const mgr = new OverflightThreadManager([]);

  mgr.init(stub);

  return { mgr, postMessage };
};

const params = (): OverflightParams => ({
  sats: [{ sccNum: '25544', name: 'ISS (ZARYA)', tle1: 'a', tle2: 'b' }],
  zone: { lat: 0, lon: 0, latMargin: 2, lonMargin: 3 },
  startMs: 0,
  durationSec: 259200,
  intervalSec: 30,
});

const callbacks = (): OverflightCallbacks => ({
  onChunk: vi.fn(),
  onProgress: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

describe('OverflightThreadManager', () => {
  it('posts a START message and returns an incrementing runId', () => {
    const { mgr, postMessage } = makeManager();

    const runId = mgr.startOverflight(params(), callbacks());

    expect(runId).toBe(1);
    const sent = postMessage.mock.calls[0][0] as { typ: number; runId: number; intervalSec: number };

    expect(sent.typ).toBe(IN_START);
    expect(sent.runId).toBe(1);
    expect(sent.intervalSec).toBe(30);
  });

  it('routes CHUNK / PROGRESS / COMPLETE messages to callbacks for the current run', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startOverflight(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId, results: [] } });
    expect(cbs.onChunk).toHaveBeenCalledWith([]);

    handler.onMessage({ data: { typ: OUT.PROGRESS, runId, processed: 1, total: 3 } });
    expect(cbs.onProgress).toHaveBeenCalledWith(1, 3);

    handler.onMessage({ data: { typ: OUT.COMPLETE, runId } });
    expect(cbs.onComplete).toHaveBeenCalled();
  });

  it('routes ERROR messages', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startOverflight(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.ERROR, runId, message: 'boom' } });
    expect(cbs.onError).toHaveBeenCalledWith('boom');
  });

  it('discards messages from a stale runId', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();

    mgr.startOverflight(params(), cbs); // runId 1
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId: 999, results: [] } });
    expect(cbs.onChunk).not.toHaveBeenCalled();
  });

  it('marks ready on the "ready" message', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: 'ready' });
    expect(mgr.isReady).toBe(true);
  });

  it('posts a CANCEL message on cancelOverflight', () => {
    const { mgr, postMessage } = makeManager();

    mgr.startOverflight(params(), callbacks());
    postMessage.mockClear();
    mgr.cancelOverflight();

    expect((postMessage.mock.calls[0][0] as { typ: number }).typ).toBe(IN_CANCEL);
  });
});

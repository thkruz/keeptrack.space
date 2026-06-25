import { BestPassCallbacks, BestPassParams, BestPassThreadManager } from '@app/app/threads/best-pass-thread-manager';
import { vi } from 'vitest';

const OUT = { CHUNK: 0, PROGRESS: 1, COMPLETE: 2, ERROR: 3 } as const;
const IN_START = 0;
const IN_CANCEL = 1;

interface OnMessageable { onMessage(e: { data: unknown }): void }

const makeManager = () => {
  const postMessage = vi.fn();
  const stub = { postMessage, terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as Worker;
  const mgr = new BestPassThreadManager([]);

  mgr.init(stub);

  return { mgr, postMessage };
};

const params = (): BestPassParams => ({
  sats: [{ sccNum: '25544', tle1: 'a', tle2: 'b' }],
  sensors: [],
  sensorNames: ['Sensor A'],
  baseTimeMs: 0,
  lengthDays: 7,
  intervalSec: 5,
  maxResults: 5000,
  sunEci: { x: 1, y: 2, z: 3 },
});

const callbacks = (): BestPassCallbacks => ({
  onChunk: vi.fn(),
  onProgress: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

describe('BestPassThreadManager', () => {
  it('posts a START message and returns an incrementing runId', () => {
    const { mgr, postMessage } = makeManager();

    const runId = mgr.startBestPass(params(), callbacks());

    expect(runId).toBe(1);
    const sent = postMessage.mock.calls[0][0] as { typ: number; runId: number; lengthDays: number };

    expect(sent.typ).toBe(IN_START);
    expect(sent.runId).toBe(1);
    expect(sent.lengthDays).toBe(7);
  });

  it('routes CHUNK / PROGRESS / COMPLETE messages to callbacks for the current run', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startBestPass(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId, passes: [] } });
    expect(cbs.onChunk).toHaveBeenCalledWith([]);

    handler.onMessage({ data: { typ: OUT.PROGRESS, runId, processed: 1, total: 3 } });
    expect(cbs.onProgress).toHaveBeenCalledWith(1, 3);

    handler.onMessage({ data: { typ: OUT.COMPLETE, runId, truncated: true } });
    expect(cbs.onComplete).toHaveBeenCalledWith(true);
  });

  it('routes ERROR messages', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startBestPass(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.ERROR, runId, message: 'boom' } });
    expect(cbs.onError).toHaveBeenCalledWith('boom');
  });

  it('discards messages from a stale runId', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();

    mgr.startBestPass(params(), cbs); // runId 1
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId: 999, passes: [] } });
    expect(cbs.onChunk).not.toHaveBeenCalled();
  });

  it('marks ready on the "ready" message', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: 'ready' });
    expect(mgr.isReady).toBe(true);
  });

  it('posts a CANCEL message on cancelBestPass', () => {
    const { mgr, postMessage } = makeManager();

    mgr.startBestPass(params(), callbacks());
    postMessage.mockClear();
    mgr.cancelBestPass();

    expect((postMessage.mock.calls[0][0] as { typ: number }).typ).toBe(IN_CANCEL);
  });
});

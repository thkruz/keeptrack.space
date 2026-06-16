import { TocaPocaCallbacks, TocaPocaParams, TocaPocaThreadManager } from '@app/app/threads/toca-poca-thread-manager';
import { vi } from 'vitest';

const OUT = { COMPLETE: 0, ERROR: 1 } as const;
const IN_START = 0;
const IN_CANCEL = 1;

interface OnMessageable { onMessage(e: { data: unknown }): void }

const makeManager = () => {
  const postMessage = vi.fn();
  const stub = { postMessage, terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as Worker;
  const mgr = new TocaPocaThreadManager([]);

  mgr.init(stub);

  return { mgr, postMessage };
};

const params = (): TocaPocaParams => ({
  primary: { sccNum: '00005', name: 'VANGUARD 1', tle1: 'a', tle2: 'b' },
  target: { sccNum: '44713', name: 'STARLINK-TEST', tle1: 'c', tle2: 'd' },
  baseTimeMs: 0,
  windowMinutes: 10080,
  stepSeconds: 60,
  maxEvents: 10,
  maxDistanceKm: null,
});

const callbacks = (): TocaPocaCallbacks => ({
  onComplete: vi.fn(),
  onError: vi.fn(),
});

describe('TocaPocaThreadManager', () => {
  it('posts a START message and returns an incrementing runId', () => {
    const { mgr, postMessage } = makeManager();

    const runId = mgr.startSearch(params(), callbacks());

    expect(runId).toBe(1);
    const sent = postMessage.mock.calls[0][0] as { typ: number; runId: number; windowMinutes: number };

    expect(sent.typ).toBe(IN_START);
    expect(sent.runId).toBe(1);
    expect(sent.windowMinutes).toBe(10080);
  });

  it('routes COMPLETE to onComplete for the current run', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startSearch(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.COMPLETE, runId, events: [], closestDistanceKm: 4.2, totalFound: 3 } });
    expect(cbs.onComplete).toHaveBeenCalledWith([], 4.2, 3);
  });

  it('routes ERROR messages', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startSearch(params(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.ERROR, runId, message: 'boom' } });
    expect(cbs.onError).toHaveBeenCalledWith('boom');
  });

  it('discards messages from a stale runId', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();

    mgr.startSearch(params(), cbs); // runId 1
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.COMPLETE, runId: 999, events: [], closestDistanceKm: null, totalFound: 0 } });
    expect(cbs.onComplete).not.toHaveBeenCalled();
  });

  it('marks ready on the "ready" message', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: 'ready' });
    expect(mgr.isReady).toBe(true);
  });

  it('posts a CANCEL message on cancelSearch', () => {
    const { mgr, postMessage } = makeManager();

    mgr.startSearch(params(), callbacks());
    postMessage.mockClear();
    mgr.cancelSearch();

    expect((postMessage.mock.calls[0][0] as { typ: number }).typ).toBe(IN_CANCEL);
  });
});

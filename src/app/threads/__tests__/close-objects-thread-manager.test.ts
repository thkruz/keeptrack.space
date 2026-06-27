import { CoWorkerMsgType, CoWorkerOutMsgType } from '@app/webworker/close-objects-messages';
import { describe, expect, it, vi } from 'vitest';
import {
  CloseObjectsThreadManager,
  CoSearchCallbacks,
  CoSearchParams,
} from '../close-objects-thread-manager';

const makeWorkerStub = () => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown as Worker & { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> });

const makeMgr = () => {
  const worker = makeWorkerStub();
  const mgr = new CloseObjectsThreadManager([]);

  mgr.init(worker);

  return { mgr, worker };
};

const params = (): CoSearchParams => ({
  sats: [{ tle1: 'a', tle2: 'b', sccNum: '1', name: 'A', perigee: 400, apogee: 410 }],
  pairs: [[0, 0]],
  searchRadiusKm: 10,
  minMissDistanceKm: 0.1,
  simEpochMs: 0,
  verifyOffsetMs: 1000,
  tcaWindowMs: 60000,
  coarseStepMs: 1000,
  tolMs: 1,
  maxTcaPairs: 100,
});

const callbacks = (): CoSearchCallbacks => ({
  onVerified: vi.fn(),
  onTcaChunk: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

interface OnMessageable { onMessage(e: { data: unknown }): void }

describe('CloseObjectsThreadManager', () => {
  describe('lifecycle', () => {
    it('uses the provided worker stub', () => {
      const { mgr, worker } = makeMgr();

      expect(mgr.worker).toBe(worker);
    });

    it('terminates and clears the worker', () => {
      const { mgr, worker } = makeMgr();

      mgr.terminate();
      expect(worker.terminate).toHaveBeenCalled();
      expect(mgr.worker).toBeNull();
    });
  });

  describe('startSearch / cancelSearch', () => {
    it('posts START_SEARCH with all params and returns an incrementing runId', () => {
      const { mgr, worker } = makeMgr();

      const runId = mgr.startSearch(params(), callbacks());

      expect(runId).toBe(1);
      const sent = worker.postMessage.mock.calls[0][0] as { typ: number; runId: number; searchRadiusKm: number; maxTcaPairs: number };

      expect(sent.typ).toBe(CoWorkerMsgType.START_SEARCH);
      expect(sent.runId).toBe(1);
      expect(sent.searchRadiusKm).toBe(10);
      expect(sent.maxTcaPairs).toBe(100);
    });

    it('bumps runId on each start', () => {
      const { mgr } = makeMgr();

      expect(mgr.startSearch(params(), callbacks())).toBe(1);
      expect(mgr.startSearch(params(), callbacks())).toBe(2);
    });

    it('posts CANCEL with the current runId', () => {
      const { mgr, worker } = makeMgr();

      mgr.startSearch(params(), callbacks());
      worker.postMessage.mockClear();
      mgr.cancelSearch();

      const sent = worker.postMessage.mock.calls[0][0] as { typ: number; runId: number };

      expect(sent.typ).toBe(CoWorkerMsgType.CANCEL);
      expect(sent.runId).toBe(1);
    });
  });

  describe('message routing', () => {
    it('marks ready on the "ready" message', () => {
      const { mgr } = makeMgr();
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: 'ready' });
      expect(mgr.isReady).toBe(true);
    });

    it('routes VERIFIED, TCA_CHUNK and COMPLETE to callbacks for the current run', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.startSearch(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.VERIFIED, runId, results: [] } });
      expect(cbs.onVerified).toHaveBeenCalledWith([]);

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.TCA_CHUNK, runId, updates: [{ i: 0, tcaEpochMs: 5, missAtTcaKm: 2 }], processed: 1, total: 3 } });
      expect(cbs.onTcaChunk).toHaveBeenCalledWith([{ i: 0, tcaEpochMs: 5, missAtTcaKm: 2 }], 1, 3);

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.COMPLETE, runId, tcaCount: 7 } });
      expect(cbs.onComplete).toHaveBeenCalledWith(7);
    });

    it('routes ERROR and then ignores further messages (callbacks cleared)', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.startSearch(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.ERROR, runId, message: 'kaboom' } });
      expect(cbs.onError).toHaveBeenCalledWith('kaboom');

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.VERIFIED, runId, results: [] } });
      expect(cbs.onVerified).not.toHaveBeenCalled();
    });

    it('clears callbacks after COMPLETE', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.startSearch(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.COMPLETE, runId, tcaCount: 0 } });
      (cbs.onComplete as ReturnType<typeof vi.fn>).mockClear();

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.COMPLETE, runId, tcaCount: 0 } });
      expect(cbs.onComplete).not.toHaveBeenCalled();
    });

    it('discards messages from a stale runId', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();

      mgr.startSearch(params(), cbs); // runId 1
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: CoWorkerOutMsgType.VERIFIED, runId: 999, results: [] } });
      expect(cbs.onVerified).not.toHaveBeenCalled();
    });
  });
});

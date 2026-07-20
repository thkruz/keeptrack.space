import { RpoWorkerMsgType, RpoWorkerOutMsgType } from '@app/webworker/proximity-ops-messages';
import { describe, expect, it, vi } from 'vitest';
import { ProximityOpsCallbacks, ProximityOpsThreadManager, ProximityOpsThreadParams } from '../proximity-ops-thread-manager';

const makeWorkerStub = () =>
  ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as Worker & { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> };

const makeMgr = () => {
  const worker = makeWorkerStub();
  const mgr = new ProximityOpsThreadManager([]);

  mgr.init(worker);

  return { mgr, worker };
};

const params = (): ProximityOpsThreadParams => ({
  mode: 'ava-geo',
  sats: [] as ProximityOpsThreadParams['sats'],
  params: {} as ProximityOpsThreadParams['params'],
});

const callbacks = (): ProximityOpsCallbacks => ({
  onProgress: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

interface OnMessageable {
  onMessage(e: { data: unknown }): void;
}

describe('ProximityOpsThreadManager', () => {
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

  describe('startSurvey / cancelSurvey', () => {
    it('posts a START message and returns an incrementing runId', () => {
      const { mgr, worker } = makeMgr();

      const runId = mgr.startSurvey(params(), callbacks());

      expect(runId).toBe(1);
      const sent = worker.postMessage.mock.calls[0][0] as { typ: number; runId: number; mode: string };

      expect(sent.typ).toBe(RpoWorkerMsgType.START);
      expect(sent.runId).toBe(1);
      expect(sent.mode).toBe('ava-geo');
    });

    it('bumps runId on each start', () => {
      const { mgr } = makeMgr();

      expect(mgr.startSurvey(params(), callbacks())).toBe(1);
      expect(mgr.startSurvey(params(), callbacks())).toBe(2);
    });

    it('posts CANCEL with the current runId', () => {
      const { mgr, worker } = makeMgr();

      mgr.startSurvey(params(), callbacks());
      worker.postMessage.mockClear();
      mgr.cancelSurvey();

      const sent = worker.postMessage.mock.calls[0][0] as { typ: number; runId: number };

      expect(sent.typ).toBe(RpoWorkerMsgType.CANCEL);
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

    it('routes PROGRESS and COMPLETE to callbacks for the current run', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.startSurvey(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: RpoWorkerOutMsgType.PROGRESS, runId, done: 2, total: 5 } });
      expect(cbs.onProgress).toHaveBeenCalledWith(2, 5);

      handler.onMessage({ data: { typ: RpoWorkerOutMsgType.COMPLETE, runId, events: [] } });
      expect(cbs.onComplete).toHaveBeenCalledWith([]);
    });

    it('routes ERROR and clears callbacks', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.startSurvey(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: RpoWorkerOutMsgType.ERROR, runId, message: 'fail' } });
      expect(cbs.onError).toHaveBeenCalledWith('fail');

      handler.onMessage({ data: { typ: RpoWorkerOutMsgType.PROGRESS, runId, done: 1, total: 1 } });
      expect(cbs.onProgress).not.toHaveBeenCalled();
    });

    it('clears callbacks after COMPLETE so later messages are ignored', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.startSurvey(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: RpoWorkerOutMsgType.COMPLETE, runId, events: [] } });
      (cbs.onComplete as ReturnType<typeof vi.fn>).mockClear();

      handler.onMessage({ data: { typ: RpoWorkerOutMsgType.COMPLETE, runId, events: [] } });
      expect(cbs.onComplete).not.toHaveBeenCalled();
    });

    it('discards messages from a stale runId', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();

      mgr.startSurvey(params(), cbs); // runId 1
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: RpoWorkerOutMsgType.PROGRESS, runId: 999, done: 1, total: 1 } });
      expect(cbs.onProgress).not.toHaveBeenCalled();
    });
  });
});

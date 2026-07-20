import { AzRangeMsgType, AzRangeOutMsgType } from '@app/webworker/az-range-heatmap-messages';
import { describe, expect, it, vi } from 'vitest';
import { AzRangeCallbacks, AzRangeHeatmapThreadManager, AzRangeParams } from '../az-range-heatmap-thread-manager';

/** A Worker stub whose postMessage/terminate are spies, passed to init() as workerStub. */
const makeWorkerStub = () =>
  ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as Worker & { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> };

/** Builds an initialized manager backed by a spy worker (Node single-worker path). */
const makeMgr = () => {
  const worker = makeWorkerStub();
  const mgr = new AzRangeHeatmapThreadManager([]);

  mgr.init(worker);

  return { mgr, worker };
};

const params = (): AzRangeParams => ({
  tleData: [{ tle1: 'a', tle2: 'b', sccNum: '25544' }],
  sensorLat: 1,
  sensorLon: 2,
  sensorAlt: 0,
  sensorMaxRng: 1000,
  startTimeMs: 0,
  durationSec: 60,
  stepSec: 5,
  elevationDeg: 10,
  marginDeg: 1,
  numAzBins: 2,
  numRngBins: 2,
  fovMinAz: 0,
  fovMaxAz: 360,
});

const callbacks = (): AzRangeCallbacks => ({
  onPartial: vi.fn(),
  onResult: vi.fn(),
  onError: vi.fn(),
});

const emptyBins = () => [
  [0, 0],
  [0, 0],
];

interface OnMessageable {
  onMessage(e: { data: unknown }): void;
}

describe('AzRangeHeatmapThreadManager', () => {
  describe('lifecycle', () => {
    it('uses the provided worker stub on the Node path', () => {
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

  describe('start / cancel', () => {
    it('posts a START message and returns an incrementing runId', () => {
      const { mgr, worker } = makeMgr();

      const runId = mgr.start(params(), callbacks());

      expect(runId).toBe(1);
      const sent = worker.postMessage.mock.calls[0][0] as { typ: number; runId: number; numAzBins: number };

      expect(sent.typ).toBe(AzRangeMsgType.START);
      expect(sent.runId).toBe(1);
      expect(sent.numAzBins).toBe(2);
    });

    it('bumps runId on each start', () => {
      const { mgr } = makeMgr();

      expect(mgr.start(params(), callbacks())).toBe(1);
      expect(mgr.start(params(), callbacks())).toBe(2);
    });

    it('posts a CANCEL message on cancel', () => {
      const { mgr, worker } = makeMgr();

      mgr.start(params(), callbacks());
      worker.postMessage.mockClear();
      mgr.cancel();

      const sent = worker.postMessage.mock.calls[0][0] as { typ: number };

      expect(sent.typ).toBe(AzRangeMsgType.CANCEL);
    });
  });

  describe('message routing', () => {
    it('marks ready on the "ready" message', () => {
      const { mgr } = makeMgr();
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: 'ready' });
      expect(mgr.isReady).toBe(true);
    });

    it('forwards PARTIAL through onPartial with merged bins and slowest-worker progress', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.start(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({
        data: {
          typ: AzRangeOutMsgType.PARTIAL,
          runId,
          bins: [
            [1, 2],
            [3, 4],
          ],
          numAzBins: 2,
          numRngBins: 2,
          maxRng: 1000,
          stepsProcessed: 5,
          stepsTotal: 12,
        },
      });

      expect(cbs.onPartial).toHaveBeenCalledTimes(1);
      const arg = (cbs.onPartial as ReturnType<typeof vi.fn>).mock.calls[0][0] as { bins: number[][]; stepsProcessed: number };

      expect(arg.bins).toEqual([
        [1, 2],
        [3, 4],
      ]);
      expect(arg.stepsProcessed).toBe(5);
    });

    it('aggregates a single-worker RESULT and forwards onResult when pending hits zero', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.start(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({
        data: {
          typ: AzRangeOutMsgType.RESULT,
          runId,
          bins: [
            [5, 0],
            [0, 7],
          ],
          numAzBins: 2,
          numRngBins: 2,
          maxRng: 1000,
          binSatNums: [
            [['25544'], []],
            [[], ['25544']],
          ],
        },
      });

      expect(cbs.onResult).toHaveBeenCalledTimes(1);
      const arg = (cbs.onResult as ReturnType<typeof vi.fn>).mock.calls[0][0] as { bins: number[][]; binSatNums: string[][][] };

      expect(arg.bins).toEqual([
        [5, 0],
        [0, 7],
      ]);
      expect(arg.binSatNums[0][0]).toEqual(['25544']);
    });

    it('routes ERROR through onError and clears callbacks', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();
      const runId = mgr.start(params(), cbs);
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: { typ: AzRangeOutMsgType.ERROR, runId, message: 'boom' } });
      expect(cbs.onError).toHaveBeenCalledWith('boom');

      // After an error the callbacks are cleared; a follow-up RESULT is ignored.
      handler.onMessage({
        data: {
          typ: AzRangeOutMsgType.RESULT,
          runId,
          bins: emptyBins(),
          numAzBins: 2,
          numRngBins: 2,
          maxRng: 1000,
          binSatNums: [
            [[], []],
            [[], []],
          ],
        },
      });
      expect(cbs.onResult).not.toHaveBeenCalled();
    });

    it('discards messages from a stale runId', () => {
      const { mgr } = makeMgr();
      const cbs = callbacks();

      mgr.start(params(), cbs); // runId 1
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({
        data: {
          typ: AzRangeOutMsgType.PARTIAL,
          runId: 999,
          bins: emptyBins(),
          numAzBins: 2,
          numRngBins: 2,
          maxRng: 1000,
          stepsProcessed: 1,
          stepsTotal: 2,
        },
      });

      expect(cbs.onPartial).not.toHaveBeenCalled();
    });

    it('ignores messages with no callbacks set', () => {
      const { mgr } = makeMgr();
      const handler = mgr as unknown as OnMessageable;

      expect(() =>
        handler.onMessage({
          data: {
            typ: AzRangeOutMsgType.ERROR,
            runId: 0,
            message: 'noop',
          },
        })
      ).not.toThrow();
    });
  });
});

import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ColorWorkerMsgType } from '@app/engine/rendering/color-worker/color-worker-messages';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorCruncherThreadManager } from '../color-cruncher-thread-manager';

/** A Worker stub whose postMessage/terminate are spies, passed to init() as workerStub. */
const makeWorkerStub = () =>
  ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as Worker & { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> };

/** Builds an initialized manager backed by a spy worker. */
const makeMgr = () => {
  const worker = makeWorkerStub();
  const mgr = new ColorCruncherThreadManager([]);

  mgr.init(worker);

  return { mgr, worker };
};

const lastMsg = (worker: { postMessage: ReturnType<typeof vi.fn> }): Record<string, unknown> => worker.postMessage.mock.calls.at(-1)![0] as Record<string, unknown>;

describe('ColorCruncherThreadManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lifecycle', () => {
    it('uses the provided worker stub', () => {
      const { mgr, worker } = makeMgr();

      expect(mgr.worker).toBe(worker);
    });

    it('auto-creates a mock worker and reports ready when no stub is given', () => {
      const mgr = new ColorCruncherThreadManager([]);

      mgr.init();

      expect(mgr.worker).not.toBeNull();
      expect(mgr.isReady).toBe(true);
    });

    it('terminates and clears the worker', () => {
      const { mgr, worker } = makeMgr();

      mgr.terminate();

      expect(worker.terminate).toHaveBeenCalled();
      expect(mgr.worker).toBeNull();
    });

    it('send helpers are silent no-ops before a worker exists', () => {
      const mgr = new ColorCruncherThreadManager([]);

      expect(() => {
        mgr.sendForceRecolor();
        mgr.terminate();
      }).not.toThrow();
    });
  });

  describe('send helpers', () => {
    it('sendCatalogData posts INIT_CATALOG and records the sequence number', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendCatalogData({ foo: 1 } as never, 9);

      expect(lastMsg(worker)).toMatchObject({ typ: ColorWorkerMsgType.INIT_CATALOG, seqNum: 9 });
    });

    it('sendSchemeChange posts UPDATE_SCHEME with the scheme id and group flag', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendSchemeChange('RcsColorScheme', true);

      expect(lastMsg(worker)).toEqual({
        typ: ColorWorkerMsgType.UPDATE_SCHEME,
        schemeId: 'RcsColorScheme',
        isGroupScheme: true,
      });
    });

    it('sendFilterUpdate posts UPDATE_FILTERS', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendFilterUpdate({ a: 1 } as never);

      expect(lastMsg(worker)).toMatchObject({ typ: ColorWorkerMsgType.UPDATE_FILTERS });
    });

    it('sendGroupUpdate posts UPDATE_GROUP with ids', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendGroupUpdate([1, 2, 3]);

      expect(lastMsg(worker)).toEqual({ typ: ColorWorkerMsgType.UPDATE_GROUP, groupIds: [1, 2, 3] });
    });

    it('sendForceRecolor posts FORCE_RECOLOR', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendForceRecolor();

      expect(lastMsg(worker)).toEqual({ typ: ColorWorkerMsgType.FORCE_RECOLOR });
    });

    it('sendObjectTypeFlags posts UPDATE_OBJ_TYPE_FLAGS', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendObjectTypeFlags({ payload: true });

      expect(lastMsg(worker)).toEqual({ typ: ColorWorkerMsgType.UPDATE_OBJ_TYPE_FLAGS, objectTypeFlags: { payload: true } });
    });

    it('sendColorTheme posts UPDATE_COLOR_THEME', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendColorTheme({ payload: [1, 0, 0, 1] });

      expect(lastMsg(worker)).toEqual({ typ: ColorWorkerMsgType.UPDATE_COLOR_THEME, colorTheme: { payload: [1, 0, 0, 1] } });
    });

    it('sendDynamicUpdate snapshots typed arrays and posts UPDATE_DYNAMIC', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendDynamicUpdate(new Int8Array([1]), new Int8Array([0]), new Float32Array([2]), 42);

      const msg = lastMsg(worker);

      expect(msg.typ).toBe(ColorWorkerMsgType.UPDATE_DYNAMIC);
      expect(msg.dotsOnScreen).toBe(42);
    });

    it('sendDynamicUpdate tolerates null buffers', () => {
      const { mgr, worker } = makeMgr();

      expect(() => mgr.sendDynamicUpdate(null, null, null)).not.toThrow();
      expect(lastMsg(worker).typ).toBe(ColorWorkerMsgType.UPDATE_DYNAMIC);
    });
  });

  describe('onMessage / consumeColorData', () => {
    it('returns null from consumeColorData before any buffers arrive', () => {
      const { mgr } = makeMgr();

      expect(mgr.consumeColorData()).toBeNull();
    });

    it('marks ready on a "ready" message', () => {
      const mgr = new ColorCruncherThreadManager([]);

      (mgr as unknown as { onMessage: (e: MessageEvent) => void }).onMessage({ data: 'ready' } as MessageEvent);

      expect(mgr.isReady).toBe(true);
    });

    it('stores incoming color buffers, emits a ready event, then consumes once', () => {
      const { mgr } = makeMgr();
      const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit').mockImplementation(() => undefined);
      const colorData = new Float32Array([1, 2, 3, 4]);
      const pickableData = new Int8Array([1]);

      (mgr as unknown as { onMessage: (e: MessageEvent) => void }).onMessage({
        data: { colorData, pickableData, seqNum: 0 },
      } as MessageEvent);

      expect(emitSpy).toHaveBeenCalledWith(EventBusEvent.onColorBufferReady);

      const consumed = mgr.consumeColorData();

      expect(consumed).toEqual({ colorData, pickableData });
      expect(mgr.consumeColorData()).toBeNull();
    });

    it('discards stale buffers from an older catalog sequence', () => {
      const { mgr } = makeMgr();

      mgr.sendCatalogData({} as never, 5); // currentSeqNum_ = 5

      (mgr as unknown as { onMessage: (e: MessageEvent) => void }).onMessage({
        data: { colorData: new Float32Array([1]), pickableData: new Int8Array([1]), seqNum: 1 },
      } as MessageEvent);

      expect(mgr.consumeColorData()).toBeNull();
    });
  });
});

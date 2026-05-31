import { PosCruncherMsgType } from '@app/webworker/position-cruncher-messages';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SatCruncherThreadManager } from '../sat-cruncher-thread-manager';

/** A Worker stub whose postMessage/terminate are spies, passed to init() as workerStub. */
const makeWorkerStub = () => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown as Worker & { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> });

const makeMgr = () => {
  const worker = makeWorkerStub();
  const mgr = new SatCruncherThreadManager([]);

  mgr.init(worker);

  return { mgr, worker };
};

const lastMsg = (worker: { postMessage: ReturnType<typeof vi.fn> }): Record<string, unknown> =>
  worker.postMessage.mock.calls.at(-1)![0] as Record<string, unknown>;

describe('SatCruncherThreadManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    it('send helpers are silent no-ops before a worker exists', () => {
      const mgr = new SatCruncherThreadManager([]);

      expect(() => {
        mgr.sendSunlightViewToggle(true);
        mgr.sendSatelliteSelected([1]);
      }).not.toThrow();
    });
  });

  describe('send helpers', () => {
    it('sendCatalogData posts OBJ_DATA and increments the sequence number', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendCatalogData('catalog-text', 50, true);

      expect(lastMsg(worker)).toEqual({
        typ: PosCruncherMsgType.OBJ_DATA,
        dat: 'catalog-text',
        fieldOfViewSetLength: 50,
        isLowPerf: true,
        seqNum: 1,
      });

      mgr.sendCatalogData('again', 60);
      expect(lastMsg(worker).seqNum).toBe(2);
    });

    it('sendTimeSync posts OFFSET with the time fields', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendTimeSync(1000, 42, 2);

      expect(lastMsg(worker)).toEqual({
        typ: PosCruncherMsgType.OFFSET,
        staticOffset: 1000,
        dynamicOffsetEpoch: 42,
        propRate: 2,
      });
    });

    it('sendSatEdit posts SAT_EDIT with the satellite fields', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendSatEdit(7, 'TLE-1', 'TLE-2', true);

      expect(lastMsg(worker)).toEqual({
        typ: PosCruncherMsgType.SAT_EDIT,
        id: 7,
        tle1: 'TLE-1',
        tle2: 'TLE-2',
        active: true,
      });
    });

    it('sendNewMissile spreads the missile payload under NEW_MISSILE', () => {
      const { mgr, worker } = makeMgr();
      const data = {
        id: 5,
        active: true,
        latList: [1, 2],
        lonList: [3, 4],
        altList: [5, 6],
        startTime: 123,
      } as never;

      mgr.sendNewMissile(data);

      expect(lastMsg(worker)).toMatchObject({ typ: PosCruncherMsgType.NEW_MISSILE, id: 5, startTime: 123 });
    });

    it('sendSensorUpdate posts SENSOR with the sensor array', () => {
      const { mgr, worker } = makeMgr();
      const sensors = [{ objName: 'RADAR-1' }] as never;

      mgr.sendSensorUpdate(sensors);

      expect(lastMsg(worker)).toEqual({ typ: PosCruncherMsgType.SENSOR, sensor: sensors });
    });

    it('sendSunlightViewToggle posts SUNLIGHT_VIEW with the flag', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendSunlightViewToggle(true);

      expect(lastMsg(worker)).toEqual({ typ: PosCruncherMsgType.SUNLIGHT_VIEW, isSunlightView: true });
    });

    it('sendMarkerUpdate posts UPDATE_MARKERS', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendMarkerUpdate(10);

      expect(lastMsg(worker)).toMatchObject({ typ: PosCruncherMsgType.UPDATE_MARKERS, fieldOfViewSetLength: 10 });
    });

    it('sendSatelliteSelected posts SATELLITE_SELECTED with the ids', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendSatelliteSelected([1, 2, 3]);

      expect(lastMsg(worker)).toEqual({ typ: PosCruncherMsgType.SATELLITE_SELECTED, satelliteSelected: [1, 2, 3] });
    });
  });

  describe('onMessage guards', () => {
    it('returns early when there is no message data', () => {
      const { mgr } = makeMgr();

      expect(() => (mgr as unknown as { onMessage: (e: { data: unknown }) => void }).onMessage({ data: null })).not.toThrow();
    });

    it('discards stale messages from an older catalog sequence', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendCatalogData('x', 1); // currentSeqNum_ = 1
      void worker;

      // A message with a lower seqNum must be ignored without touching DotsManager.
      expect(() => (mgr as unknown as { onMessage: (e: { data: unknown }) => void }).onMessage({ data: { seqNum: 0 } })).not.toThrow();
    });
  });
});

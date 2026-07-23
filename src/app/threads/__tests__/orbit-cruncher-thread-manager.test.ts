import { ServiceLocator } from '@app/engine/core/service-locator';
import { OrbitCruncherMsgType, OrbitDrawTypes } from '@app/webworker/orbit-cruncher-messages';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrbitCruncherThreadManager } from '../orbit-cruncher-thread-manager';

// Accurate-shape stubs for the orbit manager + renderer the RESPONSE_DATA path touches.
// We spy on the real ServiceLocator (rather than vi.mock the module) so the shared
// test environment's other ServiceLocator getters keep working.
const orbitCache = new Map<number, Float32Array>();
const glBuffers: Record<number, unknown> = { 7: { id: 'buf7' } };
const inProgress: Record<number, boolean> = { 7: true };
const setOrbitAnchor = vi.fn();
const gl = { ARRAY_BUFFER: 0x8892, DYNAMIC_DRAW: 0x88e8, bindBuffer: vi.fn(), bufferData: vi.fn() };

const stubServiceLocator = () => {
  vi.spyOn(ServiceLocator, 'getOrbitManager').mockReturnValue({
    orbitCache,
    glBuffers_: glBuffers,
    inProgress_: inProgress,
    setOrbitAnchor,
  } as unknown as ReturnType<typeof ServiceLocator.getOrbitManager>);
  vi.spyOn(ServiceLocator, 'getRenderer').mockReturnValue({ gl } as unknown as ReturnType<typeof ServiceLocator.getRenderer>);
};

afterEach(() => {
  vi.restoreAllMocks();
});

const makeWorkerStub = () =>
  ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as Worker & { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> };

const makeMgr = () => {
  const worker = makeWorkerStub();
  const mgr = new OrbitCruncherThreadManager([]);

  mgr.init(worker);

  return { mgr, worker };
};

const lastMsg = (worker: { postMessage: ReturnType<typeof vi.fn> }): Record<string, unknown> => worker.postMessage.mock.calls.at(-1)![0] as Record<string, unknown>;

interface OnMessageable {
  onMessage(e: { data: unknown }): void;
}

describe('OrbitCruncherThreadManager', () => {
  describe('lifecycle', () => {
    it('uses the provided worker stub', () => {
      const { mgr, worker } = makeMgr();

      expect(mgr.worker).toBe(worker);
    });

    it('postMessage is a silent no-op when there is no worker', () => {
      const mgr = new OrbitCruncherThreadManager([]);

      expect(() => mgr.postMessage({ typ: OrbitCruncherMsgType.SETTINGS_UPDATE, numberOfOrbitsToDraw: 1 })).not.toThrow();
    });

    it('is non-essential so a stall never gates boot', () => {
      const mgr = new OrbitCruncherThreadManager([]);

      expect(mgr.isEssential).toBe(false);
    });
  });

  describe('typed send methods', () => {
    it('sendInit posts INIT and bumps the sequence number', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendInit('objData', 256, 0.6, 4);

      expect(lastMsg(worker)).toMatchObject({
        typ: OrbitCruncherMsgType.INIT,
        objData: 'objData',
        numSegs: 256,
        orbitFadeFactor: 0.6,
        numberOfOrbitsToDraw: 4,
        seqNum: 1,
      });
    });

    it('sendSatelliteUpdate carries the current seqNum and orbit fields', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendInit('o', 1); // seqNum -> 1
      mgr.sendSatelliteUpdate(42, 1000, true, false, 'tle1', 'tle2');

      expect(lastMsg(worker)).toMatchObject({
        typ: OrbitCruncherMsgType.SATELLITE_UPDATE,
        id: 42,
        simulationTime: 1000,
        isEcfOutput: true,
        isPolarViewEcf: false,
        tle1: 'tle1',
        tle2: 'tle2',
        seqNum: 1,
      });
    });

    it('sendMissileUpdate posts MISSILE_UPDATE with lat/lon/alt lists', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendMissileUpdate(9, 2000, false, true, {
        latList: [1, 2] as never,
        lonList: [3, 4] as never,
        altList: [5, 6] as never,
        startTime: 1000,
      });

      expect(lastMsg(worker)).toMatchObject({
        typ: OrbitCruncherMsgType.MISSILE_UPDATE,
        id: 9,
        simulationTime: 2000,
        isEcfOutput: false,
        isPolarViewEcf: true,
        latList: [1, 2],
        lonList: [3, 4],
        altList: [5, 6],
        startTime: 1000,
      });
    });

    it('sendChangeOrbitType posts CHANGE_ORBIT_TYPE', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendChangeOrbitType(OrbitDrawTypes.TRAIL);

      expect(lastMsg(worker)).toEqual({
        typ: OrbitCruncherMsgType.CHANGE_ORBIT_TYPE,
        orbitType: OrbitDrawTypes.TRAIL,
      });
    });

    it('sendSettingsUpdate posts SETTINGS_UPDATE', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendSettingsUpdate(12);

      expect(lastMsg(worker)).toEqual({
        typ: OrbitCruncherMsgType.SETTINGS_UPDATE,
        numberOfOrbitsToDraw: 12,
      });
    });

    it('increments seqNum on each sendInit', () => {
      const { mgr, worker } = makeMgr();

      mgr.sendInit('a', 1);
      mgr.sendInit('b', 1);

      expect(lastMsg(worker).seqNum).toBe(2);
    });
  });

  describe('onMessage', () => {
    it('marks ready on the "ready" message', () => {
      const { mgr } = makeMgr();
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({ data: 'ready' });
      expect(mgr.isReady).toBe(true);
    });

    it('ignores messages that are not RESPONSE_DATA', () => {
      const { mgr } = makeMgr();
      const handler = mgr as unknown as OnMessageable;

      expect(() => handler.onMessage({ data: { typ: OrbitCruncherMsgType.INIT } })).not.toThrow();
      expect(gl.bufferData).not.toHaveBeenCalled();
    });

    it('discards RESPONSE_DATA from an older sequence number', () => {
      const { mgr } = makeMgr();

      mgr.sendInit('o', 1); // currentSeqNum_ -> 1
      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({
        data: { typ: OrbitCruncherMsgType.RESPONSE_DATA, satId: 7, pointsOut: new Float32Array([1]), seqNum: 0 },
      });

      expect(gl.bufferData).not.toHaveBeenCalled();
    });

    it('uploads points and clears inProgress for a current RESPONSE_DATA (cache miss path)', () => {
      stubServiceLocator();
      const { mgr } = makeMgr();

      gl.bindBuffer.mockClear();
      gl.bufferData.mockClear();
      orbitCache.delete(7);
      inProgress[7] = true;

      const handler = mgr as unknown as OnMessageable;
      const pts = new Float32Array([1, 2, 3]);

      handler.onMessage({
        data: { typ: OrbitCruncherMsgType.RESPONSE_DATA, satId: 7, pointsOut: pts, anchor: [7000, -42, 3], seqNum: 0 },
      });

      expect(orbitCache.get(7)).toEqual(pts);
      expect(setOrbitAnchor).toHaveBeenCalledWith(7, [7000, -42, 3]);
      expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, glBuffers[7]);
      expect(gl.bufferData).toHaveBeenCalledTimes(1);
      expect(inProgress[7]).toBe(false);
    });

    it('reuses the cached buffer on a RESPONSE_DATA cache hit', () => {
      stubServiceLocator();
      const { mgr } = makeMgr();

      gl.bufferData.mockClear();
      const cached = new Float32Array([0, 0, 0]);

      orbitCache.set(7, cached);
      inProgress[7] = true;

      const handler = mgr as unknown as OnMessageable;

      handler.onMessage({
        data: { typ: OrbitCruncherMsgType.RESPONSE_DATA, satId: 7, pointsOut: new Float32Array([9, 8, 7]), seqNum: 0 },
      });

      // Same Float32Array instance reused, contents overwritten via .set().
      expect(orbitCache.get(7)).toBe(cached);
      expect(Array.from(cached)).toEqual([9, 8, 7]);
      expect(inProgress[7]).toBe(false);
    });
  });
});

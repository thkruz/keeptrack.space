import { DetailedSatellite, DetailedSensor } from '@ootk/src/main';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CruncherType } from '../cruncher-type';
import { SatCruncherThreadManager } from '../sat-cruncher-thread-manager';

class FakeWorker {
  postMessage = vi.fn();
  terminate = vi.fn();
  onmessage: ((e: MessageEvent) => void) | null = null;
}

const withFakeWorker = (mgr: SatCruncherThreadManager): FakeWorker => {
  const fake = new FakeWorker();

  vi.spyOn(mgr as unknown as { createWorker_: () => Worker }, 'createWorker_').mockReturnValue(fake as unknown as Worker);
  mgr.init();

  return fake;
};

describe('SatCruncherThreadManager', () => {
  let mgr: SatCruncherThreadManager;

  beforeEach(() => {
    mgr = new SatCruncherThreadManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lifecycle', () => {
    it('creates a worker on init', () => {
      const fake = withFakeWorker(mgr);

      expect(mgr.getWorker()).toBe(fake);
    });

    it('warns and leaves the worker null when construction throws', () => {
      vi.spyOn(mgr as unknown as { createWorker_: () => Worker }, 'createWorker_').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => mgr.init()).not.toThrow();
      expect(mgr.getWorker()).toBeNull();
    });

    it('terminates and clears the worker', () => {
      const fake = withFakeWorker(mgr);

      mgr.terminate();

      expect(fake.terminate).toHaveBeenCalled();
      expect(mgr.getWorker()).toBeNull();
    });
  });

  describe('postMessage / onMessage', () => {
    it('forwards a payload to the worker', () => {
      const fake = withFakeWorker(mgr);

      mgr.postMessage({ a: 1 });

      expect(fake.postMessage).toHaveBeenCalledWith({ a: 1 });
    });

    it('guards postMessage and onMessage when there is no worker', () => {
      expect(() => mgr.postMessage({ a: 1 })).not.toThrow();
      expect(() => mgr.onMessage(vi.fn())).not.toThrow();
    });

    it('wires onMessage to the worker', () => {
      const fake = withFakeWorker(mgr);
      const cb = vi.fn();

      mgr.onMessage(cb);

      expect(fake.onmessage).toBe(cb);
    });
  });

  describe('typed send helpers', () => {
    it('sendSatEdit posts a SAT_EDIT message with the satellite fields', () => {
      const fake = withFakeWorker(mgr);
      const sat = { id: 7, active: true, tle1: 'TLE-1', tle2: 'TLE-2' } as unknown as DetailedSatellite;

      mgr.sendSatEdit(sat);

      expect(fake.postMessage).toHaveBeenCalledWith({
        typ: CruncherType.SAT_EDIT,
        id: 7,
        active: true,
        tle1: 'TLE-1',
        tle2: 'TLE-2',
      });
    });

    it('sendSensorUpdate posts a SENSOR message with the sensor', () => {
      const fake = withFakeWorker(mgr);
      const sensor = { objName: 'RADAR-1' } as unknown as DetailedSensor;

      mgr.sendSensorUpdate(sensor);

      expect(fake.postMessage).toHaveBeenCalledWith({ typ: CruncherType.SENSOR, sensor });
    });

    it('sendSensorUpdate accepts a null sensor', () => {
      const fake = withFakeWorker(mgr);

      mgr.sendSensorUpdate(null);

      expect(fake.postMessage).toHaveBeenCalledWith({ typ: CruncherType.SENSOR, sensor: null });
    });

    it('sendTimeSync posts an OFFSET message spreading the date data', () => {
      const fake = withFakeWorker(mgr);

      mgr.sendTimeSync({ staticOffset: 1000, dynamicOffsetEpoch: 42, propRate: 1 } as never);

      expect(fake.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        typ: CruncherType.OFFSET,
        staticOffset: 1000,
        dynamicOffsetEpoch: 42,
        propRate: 1,
      }));
    });

    it('send helpers are silent no-ops when there is no worker', () => {
      const sat = { id: 1, active: true, tle1: 'a', tle2: 'b' } as unknown as DetailedSatellite;

      expect(() => {
        mgr.sendSatEdit(sat);
        mgr.sendSensorUpdate(null);
        mgr.sendTimeSync({ staticOffset: 0 } as never);
      }).not.toThrow();
    });
  });
});

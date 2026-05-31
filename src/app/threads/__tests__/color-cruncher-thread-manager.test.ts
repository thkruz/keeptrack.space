import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorCruncherThreadManager } from '../color-cruncher-thread-manager';

/** Minimal Worker stub — jsdom has no Worker implementation. */
class FakeWorker {
  postMessage = vi.fn();
  terminate = vi.fn();
  onmessage: ((e: MessageEvent) => void) | null = null;
}

/**
 * createWorker_ does `new Worker(new URL('...', import.meta.url))`, which cannot
 * run under jsdom (URL/Worker are unavailable). Spy it to return a fake worker so
 * the rest of the manager's wiring is exercised honestly.
 */
const withFakeWorker = (mgr: ColorCruncherThreadManager): FakeWorker => {
  const fake = new FakeWorker();

  vi.spyOn(mgr as unknown as { createWorker_: () => Worker }, 'createWorker_').mockReturnValue(fake as unknown as Worker);

  return fake;
};

describe('ColorCruncherThreadManager', () => {
  let mgr: ColorCruncherThreadManager;

  beforeEach(() => {
    mgr = new ColorCruncherThreadManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('creates a worker when the Worker constructor succeeds', () => {
      const fake = withFakeWorker(mgr);

      mgr.init();

      expect(mgr.getWorker()).toBe(fake);
    });

    it('warns and leaves the worker null when construction throws', () => {
      vi.spyOn(mgr as unknown as { createWorker_: () => Worker }, 'createWorker_').mockImplementation(() => {
        throw new Error('no worker');
      });

      expect(() => mgr.init()).not.toThrow();
      expect(mgr.getWorker()).toBeNull();
    });
  });

  describe('postMessage', () => {
    it('forwards the payload to the worker', () => {
      const fake = withFakeWorker(mgr);

      mgr.init();
      const payload = { foo: 'bar' };

      mgr.postMessage(payload);

      expect(fake.postMessage).toHaveBeenCalledWith(payload);
    });

    it('is a no-op when there is no worker', () => {
      expect(() => mgr.postMessage({ foo: 1 })).not.toThrow();
    });
  });

  describe('onMessage', () => {
    it('wires the callback to the worker onmessage handler', () => {
      const fake = withFakeWorker(mgr);

      mgr.init();
      const cb = vi.fn();

      mgr.onMessage(cb);

      expect(fake.onmessage).toBe(cb);
    });

    it('is a no-op when there is no worker', () => {
      expect(() => mgr.onMessage(vi.fn())).not.toThrow();
    });
  });

  describe('terminate', () => {
    it('terminates and clears the worker', () => {
      const fake = withFakeWorker(mgr);

      mgr.init();
      mgr.terminate();

      expect(fake.terminate).toHaveBeenCalled();
      expect(mgr.getWorker()).toBeNull();
    });

    it('is a no-op when there is no worker', () => {
      expect(() => mgr.terminate()).not.toThrow();
    });
  });
});

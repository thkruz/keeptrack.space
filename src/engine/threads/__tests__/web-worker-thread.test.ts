import { errorManagerInstance } from '@app/engine/utils/errorManager';
import * as isThisNodeMod from '@app/engine/utils/isThisNode';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { vi } from 'vitest';

class TestThread extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE = 'js/test-worker.js';
}

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor(public url: string) {}
}

const stubWorker = () => ({ postMessage: vi.fn(), terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as Worker;

describe('WebWorkerThreadManager', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Node environment', () => {
    it('creates a mock worker and is ready after init()', () => {
      const mgr = new TestThread([]);

      mgr.init();

      expect(mgr.worker).not.toBeNull();
      expect(mgr.isReady).toBe(true);
    });

    it('uses a provided worker stub', () => {
      const mgr = new TestThread([]);
      const stub = stubWorker();

      mgr.init(stub);

      expect(mgr.worker).toBe(stub);
    });

    it('registers itself into the threads registry', () => {
      const registry: WebWorkerThreadManager[] = [];
      const mgr = new TestThread(registry);

      expect(registry).toContain(mgr);
    });

    it('postMessage forwards to the worker and terminate clears it', () => {
      const mgr = new TestThread([]);
      const stub = stubWorker();

      mgr.init(stub);
      mgr.postMessage({ hi: 1 });
      expect(stub.postMessage).toHaveBeenCalledWith({ hi: 1 }, []);

      mgr.terminate();
      expect(stub.terminate).toHaveBeenCalled();
      expect(mgr.worker).toBeNull();
    });

    it('base onMessage marks ready on the "ready" message', () => {
      const mgr = new TestThread([]);

      mgr.init(stubWorker());
      (mgr as unknown as { onMessage(e: { data: unknown }): void }).onMessage({ data: 'ready' });
      expect(mgr.isReady).toBe(true);
    });

    it('exposes a no-op mock worker whose methods can be called', () => {
      const mgr = new TestThread([]);

      mgr.init(); // auto-creates the node mock worker
      const worker = mgr.worker!;

      expect(() => {
        worker.postMessage('x');
        worker.terminate();
        worker.addEventListener('message', () => undefined);
        worker.removeEventListener('message', () => undefined);
      }).not.toThrow();
    });
  });

  describe('browser environment', () => {
    beforeEach(() => {
      vi.spyOn(isThisNodeMod, 'isThisNode').mockReturnValue(false);
    });

    it('creates a real Worker and binds onmessage/onerror', () => {
      vi.stubGlobal('Worker', MockWorker);
      const mgr = new TestThread([]);

      mgr.init();

      const worker = mgr.worker as unknown as MockWorker;

      expect(worker).toBeInstanceOf(MockWorker);
      expect(worker.url).toBe('./js/test-worker.js');
      expect(typeof worker.onmessage).toBe('function');

      // onmessage -> base handler -> ready
      worker.onmessage!({ data: 'ready' });
      expect(mgr.isReady).toBe(true);

      // onerror -> reportEvent
      const report = vi.spyOn(errorManagerInstance, 'reportEvent').mockImplementation(() => undefined);

      worker.onerror!({ error: new Error('boom'), message: 'm', filename: 'f', lineno: 1, colno: 2 });
      expect(report).toHaveBeenCalled();
    });

    it('returns early (ready) when given a worker stub', () => {
      vi.stubGlobal('Worker', MockWorker);
      const mgr = new TestThread([]);
      const stub = stubWorker();

      mgr.init(stub);

      expect(mgr.worker).toBe(stub);
      expect(mgr.isReady).toBe(true);
    });

    it('throws when Worker is unsupported', () => {
      vi.stubGlobal('Worker', undefined);
      const mgr = new TestThread([]);

      expect(() => mgr.init()).toThrow(/does not support web workers/u);
    });

    it('rethrows when the Worker constructor fails (non-file protocol)', () => {
      class ThrowingWorker {
        constructor() {
          throw new Error('construct fail');
        }
      }

      vi.stubGlobal('Worker', ThrowingWorker);
      const mgr = new TestThread([]);

      expect(() => mgr.init()).toThrow();
    });

    it('throws the file-access hint when the Worker fails under file:// protocol', () => {
      class ThrowingWorker {
        constructor() {
          throw new Error('construct fail');
        }
      }

      vi.stubGlobal('Worker', ThrowingWorker);
      vi.stubGlobal('window', { location: { href: 'file:///C:/app/index.html' } });
      const mgr = new TestThread([]);

      expect(() => mgr.init()).toThrow(/allow-file-access-from-files/u);
    });
  });
});

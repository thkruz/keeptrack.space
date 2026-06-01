import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { registerServiceWorker } from '@app/pwa/service-worker-registration';
import { vi } from 'vitest';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns early when serviceWorker is unsupported', () => {
    vi.stubGlobal('navigator', {}); // no serviceWorker key -> 'serviceWorker' in navigator === false

    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('returns early on non-https protocols', () => {
    const register = vi.fn();

    vi.stubGlobal('navigator', { serviceWorker: { register } });
    // jsdom's URL is https and window.location is non-configurable; stub the whole window.
    vi.stubGlobal('window', { location: { protocol: 'http:' } });

    registerServiceWorker();

    expect(register).not.toHaveBeenCalled();
  });

  it('registers the worker and wires update detection on https', async () => {
    const statechangeHandlers: Array<() => void> = [];
    const newWorker = {
      state: 'installed',
      addEventListener: vi.fn((_e: string, cb: () => void) => statechangeHandlers.push(cb)),
    };
    const waiting = { postMessage: vi.fn() };
    const updatefoundHandlers: Array<() => void> = [];
    const registration = {
      installing: newWorker,
      waiting,
      // reject so the silent .catch handler in the periodic interval is exercised
      update: vi.fn(() => Promise.reject(new Error('offline'))),
      addEventListener: vi.fn((_e: string, cb: () => void) => updatefoundHandlers.push(cb)),
    };
    const register = vi.fn(() => Promise.resolve(registration));

    vi.stubGlobal('navigator', { serviceWorker: { register, controller: {} } });
    vi.stubGlobal('location', { protocol: 'https:' });

    registerServiceWorker();
    await flush();

    expect(register).toHaveBeenCalledWith('./serviceWorker.js');

    updatefoundHandlers.forEach((cb) => cb());
    expect(newWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));

    statechangeHandlers.forEach((cb) => cb());
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(registration.update).toHaveBeenCalled();
    await flush(); // let the update().catch handler run
  });

  it('warns when registration fails', async () => {
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn(() => Promise.reject(new Error('nope'))) } });

    registerServiceWorker();
    await flush();

    expect(warn).toHaveBeenCalledWith('Service worker registration failed:', expect.any(Error));
  });

  it('ignores updatefound when there is no installing worker', async () => {
    const updatefoundHandlers: Array<() => void> = [];
    const registration = {
      installing: null,
      update: vi.fn(() => Promise.resolve()),
      addEventListener: vi.fn((_e: string, cb: () => void) => updatefoundHandlers.push(cb)),
    };

    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn(() => Promise.resolve(registration)), controller: null } });
    vi.stubGlobal('location', { protocol: 'https:' });

    registerServiceWorker();
    await flush();

    expect(() => updatefoundHandlers.forEach((cb) => cb())).not.toThrow();
  });
});

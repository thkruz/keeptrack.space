import { LocalStorageProvider } from '@app/engine/persistence/providers/local-storage-provider';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { vi } from 'vitest';

/*
 * LocalStorageProvider wraps window.localStorage (provided by jsdom) behind the
 * async StorageProvider contract, scoping reads/clears to the StorageKey enum.
 */
describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    provider = new LocalStorageProvider();
    await provider.clear();
  });

  it('round-trips a written value', async () => {
    await provider.write(StorageKey.COLOR_SCHEME, 'CelestrakColorScheme');
    expect(await provider.read(StorageKey.COLOR_SCHEME)).toBe('CelestrakColorScheme');
  });

  it('reads null for an unset key', async () => {
    expect(await provider.read(StorageKey.COLOR_SCHEME)).toBeNull();
  });

  it('removes a value', async () => {
    await provider.write(StorageKey.COLOR_SCHEME, 'x');
    await provider.remove(StorageKey.COLOR_SCHEME);
    expect(await provider.read(StorageKey.COLOR_SCHEME)).toBeNull();
  });

  it('writes a batch and reads them back', async () => {
    await provider.writeBatch(
      new Map([
        [StorageKey.COLOR_SCHEME, 'a'],
        [StorageKey.IS_ADVICE_ENABLED, 'true'],
      ])
    );

    expect(await provider.read(StorageKey.COLOR_SCHEME)).toBe('a');
    expect(await provider.read(StorageKey.IS_ADVICE_ENABLED)).toBe('true');
  });

  it('readAll returns only the StorageKey-scoped entries that are set', async () => {
    await provider.write(StorageKey.COLOR_SCHEME, 'a');
    // A key outside the enum must be ignored by readAll.
    localStorage.setItem('some-unrelated-key', 'b');

    const all = await provider.readAll();

    expect(all.get(StorageKey.COLOR_SCHEME)).toBe('a');
    expect(all.has('some-unrelated-key')).toBe(false);
  });

  it('clear wipes the scoped keys', async () => {
    await provider.write(StorageKey.COLOR_SCHEME, 'a');
    await provider.clear();
    expect(await provider.read(StorageKey.COLOR_SCHEME)).toBeNull();
  });

  it('reports a working connection in jsdom', () => {
    expect(provider.isConnected()).toBe(true);
  });

  it('subscribe returns a callable unsubscribe', () => {
    const unsub = provider.subscribe(() => {
      /* noop */
    });

    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});

describe('LocalStorageProvider lifecycle and error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initialize wires a storage listener that notifies subscribers for known keys only', async () => {
    const provider = new LocalStorageProvider();

    await provider.initialize();

    const received: [string, string | null][] = [];

    provider.subscribe((k, v) => received.push([k, v]));

    // A known StorageKey is forwarded to subscribers. The provider registers on globalThis.
    globalThis.dispatchEvent(new StorageEvent('storage', { key: StorageKey.COLOR_SCHEME, newValue: 'X' }));
    expect(received).toContainEqual([StorageKey.COLOR_SCHEME, 'X']);

    // A key outside the StorageKey enum is ignored.
    globalThis.dispatchEvent(new StorageEvent('storage', { key: 'some-unrelated-key', newValue: 'Y' }));
    expect(received).toHaveLength(1);

    await provider.dispose();
  });

  it('dispose removes the storage listener and clears subscribers', async () => {
    const provider = new LocalStorageProvider();

    await provider.initialize();
    const cb = vi.fn();

    provider.subscribe(cb);
    await provider.dispose();

    // After dispose, a storage event should no longer reach subscribers.
    globalThis.dispatchEvent(new StorageEvent('storage', { key: StorageKey.COLOR_SCHEME, newValue: 'X' }));
    expect(cb).not.toHaveBeenCalled();
  });

  it('notifySubscribers_ swallows errors thrown by a subscriber', async () => {
    const provider = new LocalStorageProvider();

    await provider.initialize();
    provider.subscribe(() => {
      throw new Error('subscriber boom');
    });

    expect(() => globalThis.dispatchEvent(new StorageEvent('storage', { key: StorageKey.COLOR_SCHEME, newValue: 'X' }))).not.toThrow();

    await provider.dispose();
  });

  it('routes read/write/remove/clear/readAll errors through handleError_ and onError', async () => {
    const onError = vi.fn();
    const provider = new LocalStorageProvider({ onError });
    const boom = () => {
      throw new Error('boom');
    };

    // jsdom's localStorage doesn't delegate to Storage.prototype, so stub the global outright.
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom });

    expect(await provider.read('k')).toBeNull();
    await provider.write('k', 'v');
    await provider.writeBatch(new Map([['k', 'v']]));
    await provider.remove('k');
    await provider.clear();
    await provider.readAll();

    expect(onError).toHaveBeenCalled();
  });

  it('isConnected returns false when localStorage writes throw', () => {
    const provider = new LocalStorageProvider();

    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('no storage');
      },
      removeItem: () => undefined,
    });

    expect(provider.isConnected()).toBe(false);
  });
});

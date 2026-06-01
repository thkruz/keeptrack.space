import { NullStorageProvider } from '@app/engine/persistence/providers/null-storage-provider';

/*
 * NullStorageProvider is the no-op backend used in kiosk/demo mode: every read
 * yields nothing, every write is silently dropped, and it never reports a
 * connection.
 */
describe('NullStorageProvider', () => {
  let provider: NullStorageProvider;

  beforeEach(() => {
    provider = new NullStorageProvider();
  });

  it('readAll returns an empty map', async () => {
    expect(await provider.readAll()).toStrictEqual(new Map());
  });

  it('read returns null', async () => {
    expect(await provider.read()).toBeNull();
  });

  it('write / writeBatch / remove / clear are no-ops that resolve', async () => {
    await expect(provider.write()).resolves.toBeUndefined();
    await expect(provider.writeBatch()).resolves.toBeUndefined();
    await expect(provider.remove()).resolves.toBeUndefined();
    await expect(provider.clear()).resolves.toBeUndefined();
  });

  it('subscribe returns a callable unsubscribe', () => {
    const unsub = provider.subscribe();

    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('reports not connected', () => {
    expect(provider.isConnected()).toBe(false);
  });

  it('initialize and dispose resolve without error', async () => {
    await expect(provider.initialize()).resolves.toBeUndefined();
    await expect(provider.dispose()).resolves.toBeUndefined();
  });
});

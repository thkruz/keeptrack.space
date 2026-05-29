import { LocalStorageProvider } from '@app/engine/persistence/providers/local-storage-provider';
import { StorageKey } from '@app/engine/persistence/storage-key';

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
    await provider.writeBatch(new Map([
      [StorageKey.COLOR_SCHEME, 'a'],
      [StorageKey.IS_ADVICE_ENABLED, 'true'],
    ]));

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
    const unsub = provider.subscribe(() => { /* noop */ });

    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});

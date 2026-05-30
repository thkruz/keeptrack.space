import { StorageProviderFactory, StorageProviderType } from '@app/engine/persistence/storage-provider-factory';
import { LocalStorageProvider } from '@app/engine/persistence/providers/local-storage-provider';
import { NullStorageProvider } from '@app/engine/persistence/providers/null-storage-provider';

/*
 * StorageProviderFactory is a small registry: it ships with the local-storage
 * and null providers and lets pro plugins register additional backends.
 */
describe('StorageProviderFactory', () => {
  let factory: StorageProviderFactory;

  beforeEach(() => {
    factory = new StorageProviderFactory();
  });

  it('creates the built-in local-storage provider', () => {
    expect(factory.create(StorageProviderType.LOCAL_STORAGE)).toBeInstanceOf(LocalStorageProvider);
  });

  it('creates the built-in null provider', () => {
    expect(factory.create(StorageProviderType.NULL)).toBeInstanceOf(NullStorageProvider);
  });

  it('reports which provider types are registered', () => {
    expect(factory.has(StorageProviderType.LOCAL_STORAGE)).toBe(true);
    expect(factory.has('does-not-exist')).toBe(false);
  });

  it('throws when asked for an unknown provider type', () => {
    expect(() => factory.create('does-not-exist')).toThrow('Unknown storage provider type');
  });

  it('lets a custom provider type be registered and created', () => {
    const custom = new NullStorageProvider();

    factory.register('custom', () => custom);

    expect(factory.has('custom')).toBe(true);
    expect(factory.create('custom')).toBe(custom);
  });
});

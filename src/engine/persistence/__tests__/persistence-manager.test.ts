import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';

/*
 * PersistenceManager is the cache-backed front door to storage. It validates
 * keys against the StorageKey enum, honours isBlockPersistence, and exposes a
 * boolean convenience getter. Tests reset the singleton and clear localStorage
 * for isolation.
 */
describe('PersistenceManager', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pm: any;

  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
    pm = PersistenceManager.getInstance();
  });

  describe('key validation', () => {
    it('throws when saving an unknown key', () => {
      expect(() => pm.saveItem('not-a-real-key', 'x')).toThrow('Invalid key');
    });

    it('throws when reading an unknown key', () => {
      expect(() => pm.getItem('not-a-real-key')).toThrow('Invalid key');
    });
  });

  describe('get/save/remove', () => {
    it('round-trips a value through the cache', () => {
      pm.saveItem(StorageKey.COLOR_SCHEME, 'CelestrakColorScheme');
      expect(pm.getItem(StorageKey.COLOR_SCHEME)).toBe('CelestrakColorScheme');
    });

    it('returns null for an unset (but valid) key', () => {
      expect(pm.getItem(StorageKey.COLOR_SCHEME)).toBeNull();
    });

    it('removes a value', () => {
      pm.saveItem(StorageKey.COLOR_SCHEME, 'x');
      pm.removeItem(StorageKey.COLOR_SCHEME);
      expect(pm.getItem(StorageKey.COLOR_SCHEME)).toBeNull();
    });
  });

  describe('checkIfEnabled', () => {
    it('returns true/false for the stored boolean string', () => {
      pm.saveItem(StorageKey.IS_ADVICE_ENABLED, 'true');
      expect(pm.checkIfEnabled(StorageKey.IS_ADVICE_ENABLED, false)).toBe(true);

      pm.saveItem(StorageKey.IS_ADVICE_ENABLED, 'false');
      expect(pm.checkIfEnabled(StorageKey.IS_ADVICE_ENABLED, true)).toBe(false);
    });

    it('returns the fallback when the key is unset', () => {
      expect(pm.checkIfEnabled(StorageKey.IS_ADVICE_ENABLED, true)).toBe(true);
      expect(pm.checkIfEnabled(StorageKey.IS_ADVICE_ENABLED, false)).toBe(false);
    });
  });

  describe('isBlockPersistence', () => {
    let original: boolean;

    beforeEach(() => {
      original = settingsManager.isBlockPersistence;
    });

    afterEach(() => {
      settingsManager.isBlockPersistence = original;
    });

    it('makes reads return null and writes no-op', () => {
      pm.saveItem(StorageKey.COLOR_SCHEME, 'before');
      settingsManager.isBlockPersistence = true;

      pm.saveItem(StorageKey.COLOR_SCHEME, 'after');
      expect(pm.getItem(StorageKey.COLOR_SCHEME)).toBeNull();
    });
  });

  describe('clear', () => {
    it('wipes all cached keys', () => {
      pm.saveItem(StorageKey.COLOR_SCHEME, 'x');
      pm.clear();
      expect(pm.getItem(StorageKey.COLOR_SCHEME)).toBeNull();
    });
  });

  describe('validateStorage version wipe', () => {
    let originalVersion: string;

    beforeEach(() => {
      originalVersion = settingsManager.versionNumber;
    });

    afterEach(() => {
      settingsManager.versionNumber = originalVersion;
    });

    it('clears storage on version bump but preserves ONBOARDING_STATE', () => {
      localStorage.setItem(StorageKey.VERSION, '0.0.1');
      localStorage.setItem(StorageKey.COLOR_SCHEME, 'wiped');
      localStorage.setItem(StorageKey.ONBOARDING_STATE, '{"status":"done"}');
      settingsManager.versionNumber = '99.0.0';

      PersistenceManager.resetInstance();
      pm = PersistenceManager.getInstance();

      expect(pm.getItem(StorageKey.COLOR_SCHEME)).toBeNull();
      expect(pm.getItem(StorageKey.ONBOARDING_STATE)).toBe('{"status":"done"}');
      expect(pm.getItem(StorageKey.VERSION)).toBe('99.0.0');
    });

    it('does not wipe when the version is unchanged', () => {
      localStorage.setItem(StorageKey.VERSION, '99.0.0');
      localStorage.setItem(StorageKey.COLOR_SCHEME, 'kept');
      settingsManager.versionNumber = '99.0.0';

      PersistenceManager.resetInstance();
      pm = PersistenceManager.getInstance();

      expect(pm.getItem(StorageKey.COLOR_SCHEME)).toBe('kept');
    });
  });

  describe('compareSemver_', () => {
    it.each([
      ['1.0.0', '1.0.1', -1],
      ['2.0.0', '1.9.9', 1],
      ['1.2.3', '1.2.3', 0],
      ['1.2', '1.2.0', 0],
    ])('compares %s vs %s', (a, b, expected) => {
      expect(Math.sign(pm.compareSemver_(a, b))).toBe(expected);
    });
  });
});

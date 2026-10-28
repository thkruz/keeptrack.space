import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';

/**
 * Per-plugin key/value storage returned by {@link createPluginStorage}.
 *
 * Values are strings (like `localStorage`); use {@link PluginStorage.getJson} /
 * {@link PluginStorage.setJson} for structured data. Keys are scoped to the
 * plugin's configKey, so two plugins can both use a key named `"filters"`
 * without colliding.
 */
export interface PluginStorage {
  /** The configKey this storage is namespaced under. */
  readonly namespace: string;
  /** Read a stored string, or `null` when the key was never written (or persistence is blocked). */
  getItem(key: string): string | null;
  /** Store a string value. Passing `null` or `undefined` removes the key. */
  setItem(key: string, value: string | null | undefined): void;
  /** Remove one key. No-op when it does not exist. */
  removeItem(key: string): void;
  /** Read and JSON-parse a stored value; returns `fallback` when missing or unparseable. */
  getJson<T>(key: string, fallback: T): T;
  /** JSON-stringify and store a value. */
  setJson(key: string, value: unknown): void;
  /** Every key this plugin has stored. */
  keys(): string[];
  /** Remove every key this plugin has stored. */
  clear(): void;
}

type PluginStorageBlob = Record<string, Record<string, string>>;

const readBlob_ = (): PluginStorageBlob => {
  const raw = PersistenceManager.getInstance().getItem(StorageKey.PLUGIN_STORAGE);

  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as PluginStorageBlob) : {};
  } catch {
    return {};
  }
};

const writeBlob_ = (blob: PluginStorageBlob): void => {
  const persistence = PersistenceManager.getInstance();

  if (Object.keys(blob).length === 0) {
    persistence.removeItem(StorageKey.PLUGIN_STORAGE);

    return;
  }

  persistence.saveItem(StorageKey.PLUGIN_STORAGE, JSON.stringify(blob));
};

/**
 * Create a storage handle namespaced to one plugin.
 *
 * Backed by the app's PersistenceManager under a single storage key, so it
 * honours the same rules as built-in plugin state: it is device-local (it does
 * not sync to the user's account), it returns nothing while persistence is
 * blocked (`settingsManager.isBlockPersistence`), and it is cleared with the rest
 * of the app's saved state when a new KeepTrack version wipes storage.
 *
 * @param configKey - The plugin's configKey (its `readonly id`). Used as the namespace.
 * @returns A {@link PluginStorage} bound to that namespace.
 *
 * @example
 * ```ts
 * const storage = createPluginStorage('AuroraOverlayPlugin');
 * storage.setJson('lastRange', { min: 0, max: 10 });
 * const range = storage.getJson('lastRange', { min: 0, max: 5 });
 * ```
 */
export function createPluginStorage(configKey: string): PluginStorage {
  if (typeof configKey !== 'string' || configKey.length === 0) {
    throw new Error('createPluginStorage requires a non-empty configKey');
  }

  const getItem = (key: string): string | null => readBlob_()[configKey]?.[key] ?? null;

  const removeItem = (key: string): void => {
    const blob = readBlob_();
    const bucket = blob[configKey];

    if (!bucket || !(key in bucket)) {
      return;
    }

    delete bucket[key];
    if (Object.keys(bucket).length === 0) {
      delete blob[configKey];
    }
    writeBlob_(blob);
  };

  const setItem = (key: string, value: string | null | undefined): void => {
    if (value === null || typeof value === 'undefined') {
      removeItem(key);

      return;
    }

    const blob = readBlob_();

    blob[configKey] = { ...blob[configKey], [key]: String(value) };
    writeBlob_(blob);
  };

  return {
    namespace: configKey,
    getItem,
    setItem,
    removeItem,
    getJson<T>(key: string, fallback: T): T {
      const raw = getItem(key);

      if (raw === null) {
        return fallback;
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    setJson(key: string, value: unknown): void {
      setItem(key, JSON.stringify(value));
    },
    keys(): string[] {
      return Object.keys(readBlob_()[configKey] ?? {});
    },
    clear(): void {
      const blob = readBlob_();

      if (!blob[configKey]) {
        return;
      }

      delete blob[configKey];
      writeBlob_(blob);
    },
  };
}

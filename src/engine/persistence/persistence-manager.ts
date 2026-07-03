import { errorManagerInstance } from '../utils/errorManager';
import { LocalStorageProvider } from './providers/local-storage-provider';
import { NullStorageProvider } from './providers/null-storage-provider';
import { StorageKey } from './storage-key';
import type { StorageProvider, StorageProviderConfig } from './storage-provider';
import { StorageProviderFactory } from './storage-provider-factory';

// Access settingsManager via global to avoid circular dependency with settings.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally untyped to break the settings.ts circular import
const getSettingsManager_ = (): any => (globalThis as any).settingsManager;

interface SyncProviderEntry_ {
  type: string;
  provider: StorageProvider;
  unsubscribe: (() => void) | null;
}

export class PersistenceManager {
  private static instance_: PersistenceManager;

  private cache_: Map<StorageKey, string> = new Map();
  private primary_: StorageProvider;
  private factory_: StorageProviderFactory;
  private syncProviders_: Map<string, SyncProviderEntry_> = new Map();
  private pendingWrites_: Map<StorageKey, string | null> = new Map();
  private flushTimeout_: ReturnType<typeof setTimeout> | null = null;
  private isInitialized_: boolean = false;

  private static readonly FLUSH_DEBOUNCE_MS_ = 500;

  /**
   * Constructor synchronously hydrates the cache from localStorage.
   * This preserves the original behavior where getInstance() returns a
   * fully-populated manager that settingsManager.init() can read from immediately.
   */
  private constructor() {
    this.factory_ = new StorageProviderFactory();
    this.primary_ = new LocalStorageProvider();

    // Synchronous hydration from localStorage (fast path — preserves original boot order)
    for (const key of Object.values(StorageKey)) {
      try {
        const val = localStorage.getItem(key);

        if (val !== null) {
          this.cache_.set(key, val);
        }
      } catch {
        // localStorage may not be available (e.g., in Node tests)
      }
    }

    // Version validation and stray key cleanup (same as original constructor)
    this.validateStorage();
    this.verifyStorage();
  }

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance_) {
      PersistenceManager.instance_ = new PersistenceManager();
    }

    return PersistenceManager.instance_;
  }

  /** For testing — resets the singleton. */
  static resetInstance(): void {
    PersistenceManager.instance_ = undefined as unknown as PersistenceManager;
  }

  /**
   * Async initialization for enhanced features (cross-tab sync, provider subscriptions).
   * Optional — the manager works without this via the synchronous constructor hydration.
   * Call this after the app boot to enable cross-tab synchronization.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized_) {
      return;
    }

    const sm = getSettingsManager_();

    if (sm?.isBlockPersistence) {
      this.primary_ = new NullStorageProvider();
      await this.primary_.initialize();
      this.cache_.clear();
      this.isInitialized_ = true;

      return;
    }

    await this.primary_.initialize();

    // Subscribe to cross-tab changes from primary (lives for app lifetime, no unsubscribe needed)
    this.primary_.subscribe((key, value) => {
      if (!Object.values(StorageKey).includes(key as StorageKey)) {
        return;
      }
      if (value === null) {
        this.cache_.delete(key as StorageKey);
      } else {
        this.cache_.set(key as StorageKey, value);
      }
    });

    this.isInitialized_ = true;
  }

  // ---------------------------------------------------------------------------
  // Public API — preserved for 26 consumer files
  // ---------------------------------------------------------------------------

  getItem(key: string): string | null {
    const sm = getSettingsManager_();

    if (sm?.isBlockPersistence) {
      return null;
    }
    PersistenceManager.verifyKey_(key);

    return this.cache_.get(key as StorageKey) ?? null;
  }

  checkIfEnabled(key: string, fallback: boolean | undefined): boolean | undefined {
    PersistenceManager.verifyKey_(key);

    const value = this.cache_.get(key as StorageKey);

    if (typeof value === 'undefined') {
      return fallback;
    }

    return value === 'true';
  }

  saveItem(key: string, value: string): void {
    const sm = getSettingsManager_();

    if (sm?.isBlockPersistence) {
      return;
    }

    if (value === null || typeof value === 'undefined') {
      this.removeItem(key);

      return;
    }

    PersistenceManager.verifyKey_(key);

    // Update cache immediately
    this.cache_.set(key as StorageKey, value);

    // Write-through to primary (localStorage) immediately
    this.primary_.write(key, value).catch((e) => {
      errorManagerInstance.debug(`Failed to write to primary storage: ${key}=${value}, error: ${e}`);
    });

    // Schedule debounced flush to sync providers
    this.scheduleSyncFlush_(key as StorageKey, value);
  }

  removeItem(key: string): void {
    PersistenceManager.verifyKey_(key);

    this.cache_.delete(key as StorageKey);
    this.primary_.remove(key);
    this.scheduleSyncFlush_(key as StorageKey, null);
  }

  clear(): void {
    for (const key of Object.values(StorageKey)) {
      this.cache_.delete(key);
    }
    this.primary_.clear();

    // Flush clear to all sync providers
    for (const entry of this.syncProviders_.values()) {
      entry.provider.clear().catch((e) => {
        errorManagerInstance.debug(`Failed to clear sync provider ${entry.type}: ${e}`);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Version validation — preserved from original
  // ---------------------------------------------------------------------------

  /**
   * Keys that survive the version-bump wipe. Onboarding progress must not reset
   * on every release, or the tour would replay for every existing user.
   */
  private static readonly PRESERVED_KEYS_: readonly StorageKey[] = [StorageKey.ONBOARDING_STATE];

  validateStorage(): void {
    const sm = getSettingsManager_();
    const currentVersion = this.cache_.get(StorageKey.VERSION) ?? null;

    if (
      typeof currentVersion === 'string' &&
      typeof sm?.versionNumber === 'string' &&
      this.compareSemver_(currentVersion, sm.versionNumber) < 0
    ) {
      errorManagerInstance.warn(`Version mismatch: ${currentVersion} < ${sm.versionNumber}`);
      errorManagerInstance.warn('Clearing local storage...');

      const preserved = new Map<StorageKey, string>();

      for (const key of PersistenceManager.PRESERVED_KEYS_) {
        const value = this.cache_.get(key);

        if (typeof value === 'string') {
          preserved.set(key, value);
        }
      }

      this.cache_.clear();
      this.primary_.clear();

      for (const [key, value] of preserved) {
        this.cache_.set(key, value);
        this.primary_.write(key, value);
      }
    }

    if (typeof sm?.versionNumber === 'string') {
      this.cache_.set(StorageKey.VERSION, sm.versionNumber);
      this.primary_.write(StorageKey.VERSION, sm.versionNumber);
    }
  }

  verifyStorage(): void {
    const validKeys = new Set(Object.values(StorageKey));

    for (const key of this.cache_.keys()) {
      if (!validKeys.has(key)) {
        this.cache_.delete(key);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sync provider management — new API for Pro plugins
  // ---------------------------------------------------------------------------

  /** Register a new provider type. Pro plugins use this to add D1, WebSocket, etc. */
  registerProviderType(type: string, factory: (config?: StorageProviderConfig) => StorageProvider): void {
    this.factory_.register(type, factory);
  }

  /**
   * Add a sync provider that mirrors persistence to a remote backend.
   * On connect, remote data is merged in (cloud wins), then local-only keys are pushed.
   */
  async addSyncProvider(type: string, config?: StorageProviderConfig): Promise<void> {
    if (this.syncProviders_.has(type)) {
      await this.removeSyncProvider(type);
    }

    const provider = this.factory_.create(type, config);

    await provider.initialize();

    // Pull remote data — cloud wins on conflicts
    const remoteData = await provider.readAll();

    for (const [key, value] of remoteData) {
      if (Object.values(StorageKey).includes(key as StorageKey)) {
        this.cache_.set(key as StorageKey, value);
        // Write merged value back to primary so local reflects cloud
        this.primary_.write(key, value);
      }
    }

    // Push local-only keys to the sync provider
    const localOnly = new Map<string, string>();

    for (const [key, value] of this.cache_) {
      if (!remoteData.has(key)) {
        localOnly.set(key, value);
      }
    }

    if (localOnly.size > 0) {
      await provider.writeBatch(localOnly);
    }

    // Subscribe to remote changes — cloud wins
    const unsubscribe = provider.subscribe((key, value) => {
      if (!Object.values(StorageKey).includes(key as StorageKey)) {
        return;
      }
      if (value === null) {
        this.cache_.delete(key as StorageKey);
        this.primary_.remove(key);
      } else {
        this.cache_.set(key as StorageKey, value);
        this.primary_.write(key, value);
      }
    });

    this.syncProviders_.set(type, { type, provider, unsubscribe });
  }

  /** Remove a sync provider (e.g., on logout). Local data remains intact. */
  async removeSyncProvider(type: string): Promise<void> {
    const entry = this.syncProviders_.get(type);

    if (!entry) {
      return;
    }

    // Flush any pending writes
    await this.flushPendingWrites_();

    if (entry.unsubscribe) {
      entry.unsubscribe();
    }
    await entry.provider.dispose();

    this.syncProviders_.delete(type);
  }

  /** Check if a specific sync provider is currently active. */
  hasSyncProvider(type: string): boolean {
    return this.syncProviders_.has(type);
  }

  /** Get the factory for provider type registration. */
  get factory(): StorageProviderFactory {
    return this.factory_;
  }

  // ---------------------------------------------------------------------------
  // Backward-compatible accessor
  // ---------------------------------------------------------------------------

  get storage(): Storage {
    return localStorage;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private scheduleSyncFlush_(key: StorageKey, value: string | null): void {
    if (this.syncProviders_.size === 0) {
      return;
    }

    this.pendingWrites_.set(key, value);

    if (this.flushTimeout_) {
      clearTimeout(this.flushTimeout_);
    }
    this.flushTimeout_ = setTimeout(() => this.flushPendingWrites_(), PersistenceManager.FLUSH_DEBOUNCE_MS_);
  }

  private async flushPendingWrites_(): Promise<void> {
    if (this.pendingWrites_.size === 0) {
      return;
    }

    const batch = new Map(this.pendingWrites_);

    this.pendingWrites_.clear();
    this.flushTimeout_ = null;

    for (const entry of this.syncProviders_.values()) {
      try {
        // Separate writes and removes
        const writes = new Map<string, string>();

        for (const [key, value] of batch) {
          if (value === null) {
            // eslint-disable-next-line no-await-in-loop
            await entry.provider.remove(key);
          } else {
            writes.set(key, value);
          }
        }

        if (writes.size > 0) {
          // eslint-disable-next-line no-await-in-loop
          await entry.provider.writeBatch(writes);
        }
      } catch (e) {
        errorManagerInstance.debug(`Failed to flush writes to sync provider ${entry.type}: ${e}`);
        // Re-queue failed writes for retry
        for (const [k, v] of batch) {
          if (!this.pendingWrites_.has(k)) {
            this.pendingWrites_.set(k, v);
          }
        }
      }
    }
  }

  private compareSemver_(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;

      if (na < nb) {
        return -1;
      }
      if (na > nb) {
        return 1;
      }
    }

    return 0;
  }

  private static verifyKey_(key: string) {
    if (!Object.values(StorageKey).includes(key as StorageKey)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }
}

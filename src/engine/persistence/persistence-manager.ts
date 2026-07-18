import { errorManagerInstance } from '../utils/errorManager';
import type { AccountKvEntry, AccountSyncProvider } from './account-sync-provider';
import { LocalStorageProvider } from './providers/local-storage-provider';
import { NullStorageProvider } from './providers/null-storage-provider';
import { StorageKey } from './storage-key';
import type { StorageProvider } from './storage-provider';
import { ACCOUNT_STORAGE_KEYS, getAccountMergeHook, isAccountKey } from './storage-scope';

// Access settingsManager via global to avoid circular dependency with settings.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally untyped to break the settings.ts circular import
const getSettingsManager_ = (): any => (globalThis as any).settingsManager;

export class PersistenceManager {
  private static instance_: PersistenceManager;

  private cache_: Map<StorageKey, string> = new Map();
  /** Per-key last-modified stamps (epoch ms) for account-scoped keys, persisted as SYNC_META. */
  private syncMeta_: Record<string, number> = {};
  private primary_: StorageProvider;
  private accountProvider_: AccountSyncProvider | null = null;
  private pendingAccountWrites_: Set<StorageKey> = new Set();
  private accountFlushTimeout_: ReturnType<typeof setTimeout> | null = null;
  private isInitialized_: boolean = false;

  /**
   * Outbound cloud pushes debounce longer than local writes: settings churn in
   * bursts (sliders, rapid toggles) and each push is a network PUT.
   */
  private static readonly ACCOUNT_FLUSH_DEBOUNCE_MS_ = 3000;

  /**
   * Constructor synchronously hydrates the cache from localStorage.
   * This preserves the original behavior where getInstance() returns a
   * fully-populated manager that settingsManager.init() can read from immediately.
   */
  private constructor() {
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
    this.loadSyncMeta_();
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

    /*
     * Equality short-circuit: identical writes must not stamp SYNC_META or
     * re-trigger cloud pushes. This is also the echo-suppression that keeps a
     * remotely-applied value from bouncing back to the cloud when a plugin
     * listener re-saves the same value.
     */
    if (this.cache_.get(key as StorageKey) === value) {
      return;
    }

    // Update cache immediately
    this.cache_.set(key as StorageKey, value);
    this.stampSyncMeta_(key as StorageKey);

    // Write-through to primary (localStorage) immediately
    this.primary_.write(key, value).catch((e) => {
      errorManagerInstance.debug(`Failed to write to primary storage: ${key}=${value}, error: ${e}`);
    });

    // Schedule debounced cloud push when an account provider is attached
    this.scheduleAccountFlush_(key as StorageKey);
  }

  removeItem(key: string): void {
    PersistenceManager.verifyKey_(key);

    if (!this.cache_.has(key as StorageKey)) {
      return;
    }

    this.cache_.delete(key as StorageKey);
    // Removals keep a stamp: they act as local tombstones so a deletion on this
    // device can win LWW against an older value on another device.
    this.stampSyncMeta_(key as StorageKey);
    this.primary_.remove(key);
    this.scheduleAccountFlush_(key as StorageKey);
  }

  clear(): void {
    for (const key of Object.values(StorageKey)) {
      this.cache_.delete(key);
    }
    this.syncMeta_ = {};
    this.primary_.clear();
  }

  // ---------------------------------------------------------------------------
  // Version validation — preserved from original
  // ---------------------------------------------------------------------------

  /**
   * Keys that survive the version-bump wipe. Onboarding progress must not reset
   * on every release, or the tour would replay for every existing user.
   */
  private static readonly PRESERVED_KEYS_: readonly StorageKey[] = [StorageKey.ONBOARDING_STATE, StorageKey.PLUGIN_ENABLE_OVERRIDES];

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

    // Prune SYNC_META entries whose key left the enum or is no longer account-scoped
    let metaChanged = false;

    for (const key of Object.keys(this.syncMeta_)) {
      if (!validKeys.has(key as StorageKey) || !isAccountKey(key as StorageKey)) {
        delete this.syncMeta_[key];
        metaChanged = true;
      }
    }

    if (metaChanged) {
      this.persistSyncMeta_();
    }
  }

  // ---------------------------------------------------------------------------
  // Per-key sync timestamps (SYNC_META)
  // ---------------------------------------------------------------------------

  /** Epoch-ms stamp of the last local change to an account-scoped key (0 = never stamped). */
  getSyncTimestamp(key: StorageKey): number {
    return this.syncMeta_[key] ?? 0;
  }

  private loadSyncMeta_(): void {
    this.syncMeta_ = {};

    const raw = this.cache_.get(StorageKey.SYNC_META);

    if (!raw) {
      return;
    }

    let parsed: unknown = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt meta must never break boot; stamps rebuild as keys are touched
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        this.syncMeta_[key] = value;
      }
    }
  }

  private stampSyncMeta_(key: StorageKey): void {
    if (key === StorageKey.SYNC_META || !isAccountKey(key)) {
      return;
    }

    this.syncMeta_[key] = Date.now();
    this.persistSyncMeta_();
  }

  private persistSyncMeta_(): void {
    const raw = JSON.stringify(this.syncMeta_);

    // Written directly (not via saveItem) to avoid recursive stamping/flushing
    this.cache_.set(StorageKey.SYNC_META, raw);
    this.primary_.write(StorageKey.SYNC_META, raw).catch((e) => {
      errorManagerInstance.debug(`Failed to persist sync meta: ${e}`);
    });
  }

  // ---------------------------------------------------------------------------
  // Account sync (per-key last-write-wins against a cloud kv store)
  // ---------------------------------------------------------------------------

  /**
   * Attach the logged-in user's cloud transport and run a full merge cycle.
   *
   * Per account-scoped key, the side with the newer timestamp wins: cloud-newer
   * values (including tombstones) are applied locally, local-newer values are
   * pushed in a single batch. Keys with a registered merge hook (e.g. monotonic
   * achievement counters) merge by value instead of by timestamp.
   *
   * Returns the keys whose LOCAL value changed, so the caller can notify
   * plugins (e.g. emit remoteSettingsApplied). Local data is never wiped.
   */
  async attachAccountSyncProvider(provider: AccountSyncProvider): Promise<StorageKey[]> {
    const sm = getSettingsManager_();

    if (sm?.isBlockPersistence) {
      return [];
    }

    if (this.accountProvider_) {
      await this.detachAccountSyncProvider({ flushPending: true });
    }

    this.accountProvider_ = provider;
    this.seedLocalStamps_();

    return this.mergeRemote_();
  }

  /**
   * Detach the cloud transport (logout). Local data remains intact; pending
   * outbound writes are flushed first unless flushPending is false.
   */
  async detachAccountSyncProvider(options?: { flushPending?: boolean }): Promise<void> {
    const provider = this.accountProvider_;

    if (!provider) {
      return;
    }

    if (options?.flushPending === false) {
      this.cancelAccountFlush_();
      this.pendingAccountWrites_.clear();
    } else {
      await this.flushAccountWrites_();
    }

    this.accountProvider_ = null;
    await provider.dispose?.();
  }

  /** Whether a cloud transport is currently attached. */
  hasAccountSyncProvider(): boolean {
    return this.accountProvider_ !== null;
  }

  /**
   * Run a full pull-merge-push cycle immediately ("Sync now"). Returns the
   * locally-changed keys, or null when no provider is attached.
   */
  syncAccountNow(): Promise<StorageKey[] | null> {
    if (!this.accountProvider_) {
      return Promise.resolve(null);
    }

    // The full merge covers every account key, superseding any pending batch
    this.cancelAccountFlush_();
    this.pendingAccountWrites_.clear();

    return this.mergeRemote_();
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

  /**
   * Full pull-merge-push cycle against the attached provider. Returns the keys
   * whose local value changed (for plugin notification).
   */
  private async mergeRemote_(): Promise<StorageKey[]> {
    const provider = this.accountProvider_;

    if (!provider) {
      return [];
    }

    const remote = await provider.pull();
    const changed: StorageKey[] = [];
    const toPush = new Map<StorageKey, AccountKvEntry>();
    let metaDirty = false;

    for (const key of ACCOUNT_STORAGE_KEYS) {
      const localT = this.getSyncTimestamp(key);
      const localV = this.cache_.get(key) ?? null;
      const remoteEntry = remote.get(key);
      const remoteT = remoteEntry?.t ?? 0;
      const remoteV = remoteEntry?.v ?? null;
      const mergeHook = getAccountMergeHook(key);

      if (mergeHook) {
        metaDirty = this.mergeKeyWithHook_(mergeHook, key, { localV, localT, remoteV, remoteT }, changed, toPush) || metaDirty;
        continue;
      }

      if (remoteT > localT) {
        // Cloud newer: apply value or tombstone locally
        this.applyRemote_(key, remoteV);
        this.syncMeta_[key] = remoteT;
        metaDirty = true;
        if (remoteV !== localV) {
          changed.push(key);
        }
      } else if (localT > remoteT && localV !== remoteV) {
        // Local newer: push value or tombstone
        toPush.set(key, { v: localV, t: localT });
      }
      // Equal timestamps (including 0/0): deterministic no-op
    }

    if (metaDirty) {
      this.persistSyncMeta_();
    }

    if (toPush.size > 0) {
      await provider.push(toPush);
    }

    return changed;
  }

  /**
   * Value-based merge for keys with a registered hook (commutative +
   * idempotent, e.g. counter union): timestamps only seed the merged stamp,
   * they never discard a side. Returns true when SYNC_META changed.
   */
  private mergeKeyWithHook_(
    mergeHook: (localV: string | null, remoteV: string | null) => string | null,
    key: StorageKey,
    state: { localV: string | null; localT: number; remoteV: string | null; remoteT: number },
    changed: StorageKey[],
    toPush: Map<StorageKey, AccountKvEntry>,
  ): boolean {
    const mergedV = mergeHook(state.localV, state.remoteV);
    const mergedT = Math.max(state.localT, state.remoteT, 1);
    let metaDirty = false;

    if (mergedV !== state.localV) {
      this.applyRemote_(key, mergedV);
      this.syncMeta_[key] = mergedT;
      metaDirty = true;
      changed.push(key);
    }
    if (mergedV !== state.remoteV) {
      toPush.set(key, { v: mergedV, t: mergedT });
    }

    return metaDirty;
  }

  /**
   * Apply a remotely-won value to cache + localStorage WITHOUT stamping or
   * scheduling a push: remote applies must never echo back to the cloud.
   */
  private applyRemote_(key: StorageKey, value: string | null): void {
    if (value === null) {
      this.cache_.delete(key);
      this.primary_.remove(key);
    } else {
      this.cache_.set(key, value);
      this.primary_.write(key, value).catch((e) => {
        errorManagerInstance.debug(`Failed to write remote value to primary storage: ${key}, error: ${e}`);
      });
    }
  }

  /**
   * One-time upgrade seeding: an account key that already has a local value but
   * no stamp predates per-key timestamps. Stamp it with t=1 ("exists, but old")
   * so a first login pushes it to an empty cloud yet loses to any real cloud
   * write, and fresh-install defaults (no value, no stamp) never stomp cloud.
   */
  private seedLocalStamps_(): void {
    let metaDirty = false;

    for (const key of ACCOUNT_STORAGE_KEYS) {
      if (this.cache_.has(key) && !(key in this.syncMeta_)) {
        this.syncMeta_[key] = 1;
        metaDirty = true;
      }
    }

    if (metaDirty) {
      this.persistSyncMeta_();
    }
  }

  private scheduleAccountFlush_(key: StorageKey): void {
    if (!this.accountProvider_ || !isAccountKey(key)) {
      return;
    }

    this.pendingAccountWrites_.add(key);
    this.cancelAccountFlush_();
    this.accountFlushTimeout_ = setTimeout(() => this.flushAccountWrites_(), PersistenceManager.ACCOUNT_FLUSH_DEBOUNCE_MS_);
  }

  private cancelAccountFlush_(): void {
    if (this.accountFlushTimeout_) {
      clearTimeout(this.accountFlushTimeout_);
      this.accountFlushTimeout_ = null;
    }
  }

  private async flushAccountWrites_(): Promise<void> {
    this.cancelAccountFlush_();

    const provider = this.accountProvider_;

    if (!provider || this.pendingAccountWrites_.size === 0) {
      return;
    }

    const batch = new Map<StorageKey, AccountKvEntry>();

    for (const key of this.pendingAccountWrites_) {
      batch.set(key, { v: this.cache_.get(key) ?? null, t: this.getSyncTimestamp(key) });
    }
    this.pendingAccountWrites_.clear();

    try {
      await provider.push(batch);
    } catch (e) {
      errorManagerInstance.debug(`Failed to push account settings batch: ${e}`);
      // Re-queue failed keys for the next flush
      for (const key of batch.keys()) {
        this.pendingAccountWrites_.add(key);
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

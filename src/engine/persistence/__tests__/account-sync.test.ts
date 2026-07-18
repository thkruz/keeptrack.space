import type { AccountKvEntry, AccountSyncProvider } from '@app/engine/persistence/account-sync-provider';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { registerAccountMergeHook, resetAccountMergeHooks } from '@app/engine/persistence/storage-scope';
import { vi } from 'vitest';

class FakeProvider implements AccountSyncProvider {
  remote = new Map<StorageKey, AccountKvEntry>();
  pushed: Map<StorageKey, AccountKvEntry>[] = [];
  failNextPush = false;

  pull(): Promise<Map<StorageKey, AccountKvEntry>> {
    return Promise.resolve(new Map(this.remote));
  }

  push(entries: Map<StorageKey, AccountKvEntry>): Promise<void> {
    if (this.failNextPush) {
      this.failNextPush = false;

      return Promise.reject(new Error('network down'));
    }
    this.pushed.push(new Map(entries));
    for (const [key, entry] of entries) {
      this.remote.set(key, entry);
    }

    return Promise.resolve();
  }
}

describe('PersistenceManager account sync (per-key LWW)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pm: any;
  let provider: FakeProvider;

  const seedLocal = (key: StorageKey, value: string, t: number) => {
    localStorage.setItem(key, value);
    const meta = JSON.parse(localStorage.getItem(StorageKey.SYNC_META) ?? '{}');

    meta[key] = t;
    localStorage.setItem(StorageKey.SYNC_META, JSON.stringify(meta));
  };

  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
    provider = new FakeProvider();
  });

  afterEach(async () => {
    await PersistenceManager.getInstance().detachAccountSyncProvider({ flushPending: false });
    resetAccountMergeHooks();
    vi.useRealTimers();
  });

  it('applies cloud-newer values locally and reports them as changed', async () => {
    seedLocal(StorageKey.WATCHLIST_LIST, '["1"]', 100);
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: '["2"]', t: 200 });

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([StorageKey.WATCHLIST_LIST]);
    expect(pm.getItem(StorageKey.WATCHLIST_LIST)).toBe('["2"]');
    expect(pm.getSyncTimestamp(StorageKey.WATCHLIST_LIST)).toBe(200);
    expect(provider.pushed).toHaveLength(0);
  });

  it('applies a cloud tombstone by deleting the local value', async () => {
    seedLocal(StorageKey.WATCHLIST_LIST, '["1"]', 100);
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: null, t: 200 });

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([StorageKey.WATCHLIST_LIST]);
    expect(pm.getItem(StorageKey.WATCHLIST_LIST)).toBeNull();
  });

  it('pushes local-newer values in one batch without touching local', async () => {
    seedLocal(StorageKey.WATCHLIST_LIST, '["1"]', 300);
    seedLocal(StorageKey.FAVORITES_LIST, '["9"]', 300);
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: '["old"]', t: 200 });

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([]);
    expect(provider.pushed).toHaveLength(1);
    expect(provider.pushed[0].get(StorageKey.WATCHLIST_LIST)).toEqual({ v: '["1"]', t: 300 });
    expect(provider.pushed[0].get(StorageKey.FAVORITES_LIST)).toEqual({ v: '["9"]', t: 300 });
  });

  it('pushes a local tombstone when a stamped key has no value', async () => {
    // A removal leaves a stamp with no value
    pm = PersistenceManager.getInstance();
    pm.saveItem(StorageKey.WATCHLIST_LIST, '["1"]');
    pm.removeItem(StorageKey.WATCHLIST_LIST);
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: '["cloud"]', t: 1 });

    await pm.attachAccountSyncProvider(provider);

    expect(provider.pushed).toHaveLength(1);
    const entry = provider.pushed[0].get(StorageKey.WATCHLIST_LIST);

    expect(entry?.v).toBeNull();
    expect(entry?.t).toBeGreaterThan(1);
  });

  it('treats equal timestamps as a deterministic no-op', async () => {
    seedLocal(StorageKey.WATCHLIST_LIST, '["local"]', 500);
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: '["cloud"]', t: 500 });

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([]);
    expect(pm.getItem(StorageKey.WATCHLIST_LIST)).toBe('["local"]');
    expect(provider.pushed).toHaveLength(0);
  });

  it('updates the stamp but does not report change when cloud-newer value is identical', async () => {
    seedLocal(StorageKey.WATCHLIST_LIST, '["same"]', 100);
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: '["same"]', t: 900 });

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([]);
    expect(pm.getSyncTimestamp(StorageKey.WATCHLIST_LIST)).toBe(900);
  });

  it('seeds unstamped local values with t=1 so a first login merges them up', async () => {
    // Pre-timestamp upgrade state: value exists, no SYNC_META entry
    localStorage.setItem(StorageKey.WATCHLIST_LIST, '["legacy"]');
    pm = PersistenceManager.getInstance();

    await pm.attachAccountSyncProvider(provider);

    expect(pm.getSyncTimestamp(StorageKey.WATCHLIST_LIST)).toBe(1);
    expect(provider.pushed).toHaveLength(1);
    expect(provider.pushed[0].get(StorageKey.WATCHLIST_LIST)).toEqual({ v: '["legacy"]', t: 1 });
  });

  it('never pushes defaults: keys with no value and no stamp stay untouched', async () => {
    pm = PersistenceManager.getInstance();

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([]);
    expect(provider.pushed).toHaveLength(0);
  });

  it('a seeded t=1 value loses to any real cloud write', async () => {
    localStorage.setItem(StorageKey.WATCHLIST_LIST, '["legacy"]');
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: '["cloud"]', t: 50 });

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([StorageKey.WATCHLIST_LIST]);
    expect(pm.getItem(StorageKey.WATCHLIST_LIST)).toBe('["cloud"]');
  });

  it('uses a registered merge hook instead of LWW', async () => {
    registerAccountMergeHook(StorageKey.ACHIEVEMENT_COUNTERS, (local, remote) => {
      const a = local ? JSON.parse(local) : { n: 0 };
      const b = remote ? JSON.parse(remote) : { n: 0 };

      return JSON.stringify({ n: Math.max(a.n, b.n) });
    });

    seedLocal(StorageKey.ACHIEVEMENT_COUNTERS, '{"n":3}', 900);
    pm = PersistenceManager.getInstance();
    // Remote is OLDER but has higher progress: plain LWW would discard it
    provider.remote.set(StorageKey.ACHIEVEMENT_COUNTERS, { v: '{"n":7}', t: 100 });

    const changed = await pm.attachAccountSyncProvider(provider);

    expect(changed).toEqual([StorageKey.ACHIEVEMENT_COUNTERS]);
    expect(pm.getItem(StorageKey.ACHIEVEMENT_COUNTERS)).toBe('{"n":7}');
    // Merged result equals the remote value, so nothing pushes back
    expect(provider.pushed).toHaveLength(0);
  });

  it('pushes the merge-hook result back when it differs from remote', async () => {
    registerAccountMergeHook(StorageKey.ACHIEVEMENT_COUNTERS, (local, remote) => {
      const a = local ? JSON.parse(local) : { n: 0 };
      const b = remote ? JSON.parse(remote) : { n: 0 };

      return JSON.stringify({ n: Math.max(a.n, b.n) });
    });

    seedLocal(StorageKey.ACHIEVEMENT_COUNTERS, '{"n":9}', 100);
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.ACHIEVEMENT_COUNTERS, { v: '{"n":7}', t: 900 });

    const changed = await pm.attachAccountSyncProvider(provider);

    // Local already holds the merged value: nothing applied locally
    expect(changed).toEqual([]);
    expect(provider.pushed).toHaveLength(1);
    expect(provider.pushed[0].get(StorageKey.ACHIEVEMENT_COUNTERS)?.v).toBe('{"n":9}');
  });

  it('debounces steady-state saves into one batched push with stamps', async () => {
    vi.useFakeTimers();
    pm = PersistenceManager.getInstance();
    await pm.attachAccountSyncProvider(provider);

    pm.saveItem(StorageKey.WATCHLIST_LIST, '["a"]');
    pm.saveItem(StorageKey.FAVORITES_LIST, '["b"]');
    // Device-scoped saves must not join the batch
    pm.saveItem(StorageKey.CALCULATOR_SETTINGS, '{}');

    await vi.advanceTimersByTimeAsync(3100);

    expect(provider.pushed).toHaveLength(1);
    const batch = provider.pushed[0];

    // The env's settings machinery may add its own account-key writes (e.g.
    // dot colors), so assert membership rather than the exact set.
    expect(batch.has(StorageKey.WATCHLIST_LIST)).toBe(true);
    expect(batch.has(StorageKey.FAVORITES_LIST)).toBe(true);
    expect(batch.get(StorageKey.WATCHLIST_LIST)?.v).toBe('["a"]');
    expect(batch.get(StorageKey.WATCHLIST_LIST)?.t).toBeGreaterThan(0);
    expect(batch.has(StorageKey.CALCULATOR_SETTINGS)).toBe(false);
  });

  it('flushes pending writes on detach', async () => {
    vi.useFakeTimers();
    pm = PersistenceManager.getInstance();
    await pm.attachAccountSyncProvider(provider);

    pm.saveItem(StorageKey.WATCHLIST_LIST, '["a"]');
    await pm.detachAccountSyncProvider();

    expect(provider.pushed).toHaveLength(1);
    expect(pm.hasAccountSyncProvider()).toBe(false);

    // No further pushes after detach
    pm.saveItem(StorageKey.WATCHLIST_LIST, '["c"]');
    await vi.advanceTimersByTimeAsync(5000);
    expect(provider.pushed).toHaveLength(1);
  });

  it('re-queues failed pushes for the next flush', async () => {
    vi.useFakeTimers();
    pm = PersistenceManager.getInstance();
    await pm.attachAccountSyncProvider(provider);

    // eslint-disable-next-line require-atomic-updates -- test setup, not a race
    provider.failNextPush = true;
    pm.saveItem(StorageKey.WATCHLIST_LIST, '["a"]');
    await vi.advanceTimersByTimeAsync(3100);
    expect(provider.pushed).toHaveLength(0);

    // Next save re-triggers the flush including the failed key
    pm.saveItem(StorageKey.FAVORITES_LIST, '["b"]');
    await vi.advanceTimersByTimeAsync(3100);

    expect(provider.pushed).toHaveLength(1);
    expect(provider.pushed[0].has(StorageKey.WATCHLIST_LIST)).toBe(true);
    expect(provider.pushed[0].has(StorageKey.FAVORITES_LIST)).toBe(true);
  });

  it('syncAccountNow runs a full cycle immediately', async () => {
    seedLocal(StorageKey.WATCHLIST_LIST, '["local"]', 100);
    pm = PersistenceManager.getInstance();
    await pm.attachAccountSyncProvider(provider);
    expect(provider.pushed).toHaveLength(1);

    provider.remote.set(StorageKey.FAVORITES_LIST, { v: '["cloud"]', t: 999 });
    const changed = await pm.syncAccountNow();

    expect(changed).toEqual([StorageKey.FAVORITES_LIST]);
    expect(pm.getItem(StorageKey.FAVORITES_LIST)).toBe('["cloud"]');
  });

  it('returns null from syncAccountNow when no provider is attached', async () => {
    pm = PersistenceManager.getInstance();
    expect(await pm.syncAccountNow()).toBeNull();
  });

  it('no-ops attach when persistence is blocked', async () => {
    pm = PersistenceManager.getInstance();
    const original = settingsManager.isBlockPersistence;

    settingsManager.isBlockPersistence = true;
    try {
      const changed = await pm.attachAccountSyncProvider(provider);

      expect(changed).toEqual([]);
      expect(pm.hasAccountSyncProvider()).toBe(false);
    } finally {
      // eslint-disable-next-line require-atomic-updates -- test cleanup, not a race
      settingsManager.isBlockPersistence = original;
    }
  });

  it('remote applies do not echo back to the cloud', async () => {
    pm = PersistenceManager.getInstance();
    provider.remote.set(StorageKey.WATCHLIST_LIST, { v: '["cloud"]', t: 100 });

    await pm.attachAccountSyncProvider(provider);
    expect(provider.pushed).toHaveLength(0);

    // A listener re-saving the identical applied value must not schedule a push
    vi.useFakeTimers();
    pm.saveItem(StorageKey.WATCHLIST_LIST, '["cloud"]');
    await vi.advanceTimersByTimeAsync(5000);
    expect(provider.pushed).toHaveLength(0);
  });
});

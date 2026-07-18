import type { StorageKey } from './storage-key';

/**
 * One synced key's cloud state: the raw persisted string (null = tombstone,
 * i.e. the key was deleted) and the epoch-ms timestamp of that write.
 */
export interface AccountKvEntry {
  v: string | null;
  t: number;
}

/**
 * Transport for account-scoped settings sync. Implementations own auth and
 * wire format (e.g. the Pro user-account plugin's REST client against
 * app_preferences); PersistenceManager owns the per-key last-write-wins merge,
 * timestamps, and the debounced outbound flush.
 */
export interface AccountSyncProvider {
  /** Fetch the full remote kv map for this user. */
  pull(): Promise<Map<StorageKey, AccountKvEntry>>;
  /** Persist the given entries remotely (partial update: only these keys change). */
  push(entries: Map<StorageKey, AccountKvEntry>): Promise<void>;
  /** Optional cleanup on detach (logout). */
  dispose?(): Promise<void>;
}

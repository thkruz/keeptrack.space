// Core
export { PersistenceManager } from './persistence-manager';
export { StorageKey } from './storage-key';
export { StorageScope, STORAGE_KEY_SCOPES, ACCOUNT_STORAGE_KEYS, isAccountKey, registerAccountMergeHook, getAccountMergeHook, resetAccountMergeHooks } from './storage-scope';
export type { AccountMergeFn } from './storage-scope';

// Provider interface and config
export type { StorageProvider, StorageProviderConfig } from './storage-provider';

// Account sync (cloud transport contract for the Pro user-account plugin)
export type { AccountSyncProvider, AccountKvEntry } from './account-sync-provider';

// Built-in providers
export { LocalStorageProvider } from './providers/local-storage-provider';
export { NullStorageProvider } from './providers/null-storage-provider';

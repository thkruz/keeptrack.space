// Core

// Account sync (cloud transport contract for the Pro user-account plugin)
export type { AccountKvEntry, AccountSyncProvider } from './account-sync-provider';
export { PersistenceManager } from './persistence-manager';
// Built-in providers
export { LocalStorageProvider } from './providers/local-storage-provider';
export { NullStorageProvider } from './providers/null-storage-provider';
export { StorageKey } from './storage-key';
// Provider interface and config
export type { StorageProvider, StorageProviderConfig } from './storage-provider';
export type { AccountMergeFn } from './storage-scope';
export { ACCOUNT_STORAGE_KEYS, getAccountMergeHook, isAccountKey, registerAccountMergeHook, resetAccountMergeHooks, STORAGE_KEY_SCOPES, StorageScope } from './storage-scope';

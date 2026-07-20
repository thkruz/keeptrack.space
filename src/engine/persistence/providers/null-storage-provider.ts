import type { StorageProvider } from '../storage-provider';

/**
 * Null/no-op implementation of StorageProvider.
 *
 * Returns empty/null for all reads and silently ignores all writes.
 * Used when isBlockPersistence is true (demo/kiosk/mobile mode).
 */
export class NullStorageProvider implements StorageProvider {
  async initialize(): Promise<void> {
    // No-op
  }

  // eslint-disable-next-line require-await
  async readAll(): Promise<Map<string, string>> {
    return new Map();
  }

  // eslint-disable-next-line require-await
  async read(): Promise<string | null> {
    return null;
  }

  async write(): Promise<void> {
    // No-op
  }

  async writeBatch(): Promise<void> {
    // No-op
  }

  async remove(): Promise<void> {
    // No-op
  }

  async clear(): Promise<void> {
    // No-op
  }

  subscribe(): () => void {
    return () => {
      /* No-op */
    };
  }

  isConnected(): boolean {
    return false;
  }

  async dispose(): Promise<void> {
    // No-op
  }
}

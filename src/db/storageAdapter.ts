/**
 * src/db/storageAdapter.ts
 *
 * Universal storage adapter interface for Apollonography.
 * Decouples the UI and hooks from the underlying storage engine,
 * enabling seamless switching between native SQLite and the atomic JSON fallback.
 */

export interface StorageAdapter {
  /**
   * Initializes the storage engine, creates directories, applies schema/tables if missing.
   */
  init(): Promise<void>;

  /**
   * Executes a query with optional parameters.
   * For SELECT statements, returns an array of row objects.
   * For mutations, returns { rowsAffected, insertId }.
   */
  executeSql<T = any>(sql: string, params?: (string | number | boolean | null)[]): Promise<T>;

  /**
   * Executes an atomic batch of operations within a single transaction.
   */
  executeBatch(statements: Array<{ sql: string; params?: (string | number | boolean | null)[] }>): Promise<void>;

  /**
   * Closes the active storage engine handle.
   */
  close(): Promise<void>;

  /**
   * Returns the active storage engine type.
   */
  getStorageType(): 'sqlite' | 'json';
}

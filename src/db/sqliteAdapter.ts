/**
 * src/db/sqliteAdapter.ts
 *
 * Native SQLite implementation of StorageAdapter using SQLiteModule.
 */

import { StorageAdapter } from './storageAdapter';
import * as SQLite from '../native/SQLiteModule';

export class SqliteStorageAdapter implements StorageAdapter {
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!SQLite.isSQLiteAvailable()) {
      throw new Error('[SqliteStorageAdapter] Native SQLite module is not registered.');
    }
    await SQLite.openDatabase();
    this.initialized = true;
  }

  async executeSql<T = any>(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<T> {
    if (!this.initialized) {
      await this.init();
    }
    return SQLite.executeSql<T>(sql, params);
  }

  async executeBatch(
    statements: Array<{ sql: string; params?: (string | number | boolean | null)[] }>
  ): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    await SQLite.executeBatch(statements);
  }

  async close(): Promise<void> {
    if (this.initialized) {
      await SQLite.closeDatabase();
      this.initialized = false;
    }
  }

  getStorageType(): 'sqlite' | 'json' {
    return 'sqlite';
  }
}

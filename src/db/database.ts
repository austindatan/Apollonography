/**
 * src/db/database.ts
 *
 * Primary database controller and factory for Apollonography.
 * Dynamically provisions SqliteStorageAdapter with graceful fallback to JsonStorageAdapter.
 */

import { StorageAdapter } from './storageAdapter';
import { SqliteStorageAdapter } from './sqliteAdapter';
import { JsonStorageAdapter } from './jsonAdapter';
import { isSQLiteAvailable } from '../native/SQLiteModule';

import { applySchema } from './schema';
import { seedDatabaseIfEmpty } from './seed';

let activeAdapter: StorageAdapter | null = null;

export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (activeAdapter) return activeAdapter;

  if (isSQLiteAvailable()) {
    try {
      const sqlite = new SqliteStorageAdapter();
      await sqlite.init();
      await applySchema(sqlite);
      await seedDatabaseIfEmpty(sqlite);
      activeAdapter = sqlite;
      console.log('[Database] Native SQLite adapter successfully initialized.');
      return activeAdapter;
    } catch (err) {
      console.warn('[Database] Failed to initialize native SQLite adapter, switching to JSON fallback:', err);
    }
  } else {
    console.warn('[Database] Native SQLiteModule is not registered in runtime. Using JSON storage fallback.');
  }

  const jsonAdapter = new JsonStorageAdapter();
  await jsonAdapter.init();
  await applySchema(jsonAdapter);
  await seedDatabaseIfEmpty(jsonAdapter);
  activeAdapter = jsonAdapter;
  return activeAdapter;
}

/**
 * Resets the active adapter (used for testing or switching engines).
 */
export async function resetStorageAdapter(): Promise<void> {
  if (activeAdapter) {
    await activeAdapter.close();
    activeAdapter = null;
  }
}

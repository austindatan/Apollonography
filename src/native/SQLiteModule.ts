/**
 * src/native/SQLiteModule.ts
 *
 * TypeScript bridge for Apollonography native SQLite TurboModule on React Native Windows.
 * Executes queries asynchronously on native background worker threads.
 */

import { NativeModules } from 'react-native';

const { SQLiteModule: NativeSQLite } = NativeModules;

export interface SqlMutationResult {
  rowsAffected: number;
  insertId: number;
}

export interface SqlBatchStatement {
  sql: string;
  params?: (string | number | boolean | null)[];
}

export interface SqlBatchResult {
  status: string;
  executedCount: number;
}

export interface OpenDatabaseResult {
  status: string;
  path: string;
}

/**
 * Decodes native JSON output from SQLiteModule.
 * If the native binary serialized UTF-8 bytes directly into wchar_t (each byte in 0x00..0xFF),
 * this decodes the raw byte sequence back into a proper UTF-8 string.
 */
function decodeNativeJson(raw: string): string {
  if (!raw) return raw;
  let hasHighByte = false;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code > 255) {
      // Already contains wide Unicode code points
      return raw;
    }
    if (code >= 0x80) {
      hasHighByte = true;
    }
  }

  if (!hasHighByte) {
    return raw;
  }

  try {
    const DecoderClass = (globalThis as any).TextDecoder;
    if (typeof DecoderClass !== 'undefined') {
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i) & 0xff;
      }
      return new DecoderClass('utf-8', { fatal: false }).decode(bytes);
    }
    return decodeURIComponent(escape(raw));
  } catch {
    return raw;
  }
}

/**
 * Checks if the native C++ SQLiteModule is registered and available in the current runtime.
 */
export function isSQLiteAvailable(): boolean {
  return Boolean(
    NativeSQLite &&
    typeof NativeSQLite.executeSql === 'function' &&
    typeof NativeSQLite.openDatabase === 'function'
  );
}

/**
 * Explicitly opens or initializes the SQLite database.
 * If dbPath is omitted, defaults to %LOCALAPPDATA%\Apollonography\Data\apollonography.db.
 */
export async function openDatabase(dbPath: string = ''): Promise<OpenDatabaseResult> {
  if (!isSQLiteAvailable()) {
    throw new Error('[SQLiteModule] Native module is not available in NativeModules.');
  }
  const raw: string = await NativeSQLite.openDatabase(dbPath);
  return JSON.parse(decodeNativeJson(raw));
}

/**
 * Executes a single SQL statement with optional parameter binding.
 * - SELECT / PRAGMA queries resolve to an array of row objects: T[]
 * - INSERT / UPDATE / DELETE / DDL queries resolve to SqlMutationResult: { rowsAffected, insertId }
 */
export async function executeSql<T = any>(
  sql: string,
  params: (string | number | boolean | null | undefined)[] = []
): Promise<T> {
  if (!isSQLiteAvailable()) {
    throw new Error('[SQLiteModule] Native module is not available in NativeModules.');
  }
  const cleanParams = (params || []).map(p => (p === undefined ? null : p));
  const raw: string = await NativeSQLite.executeSql(sql, cleanParams);
  return JSON.parse(decodeNativeJson(raw));
}

/**
 * Executes an atomic batch of SQL statements within a single BEGIN TRANSACTION / COMMIT block.
 * If any statement fails, automatically rolls back and rejects with the SQLite error.
 */
export async function executeBatch(
  statements: SqlBatchStatement[]
): Promise<SqlBatchResult> {
  if (!isSQLiteAvailable()) {
    throw new Error('[SQLiteModule] Native module is not available in NativeModules.');
  }
  const raw: string = await NativeSQLite.executeBatch(statements);
  return JSON.parse(raw);
}

/**
 * Closes the active database connection.
 */
export async function closeDatabase(): Promise<{ status: string }> {
  if (!isSQLiteAvailable()) {
    return { status: 'unavailable' };
  }
  const raw: string = await NativeSQLite.closeDatabase();
  return JSON.parse(raw);
}

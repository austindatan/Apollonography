/**
 * src/services/backupService.ts
 *
 * Automatic daily database snapshots with rolling 5-backup retention.
 * Backups are stored in %LOCALAPPDATA%\Apollonography\Backups\.
 */

import { getStorageAdapter } from '../db/database';
import { getFs, joinPaths } from '../utils/nodeFs';

export const MAX_BACKUPS_RETAINED = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getBackupDir(): string {
  try {
    const proc = (globalThis as any).process;
    const baseDir = proc?.env?.LOCALAPPDATA ? proc.env.LOCALAPPDATA : '.';
    return joinPaths(baseDir, 'Apollonography', 'Backups');
  } catch {
    return './backups';
  }
}

function getStoreFilePath(): string {
  try {
    const proc = (globalThis as any).process;
    const baseDir = proc?.env?.LOCALAPPDATA ? proc.env.LOCALAPPDATA : '.';
    return joinPaths(baseDir, 'Apollonography', 'Data', 'apollonography_store.json');
  } catch {
    return './apollonography_store.json';
  }
}

export interface BackupFileInfo {
  filename: string;
  filepath: string;
  sizeBytes: number;
  createdAt: number;
}

/**
 * Creates a timestamped backup copy and prunes old backups to maintain the 5-file cap.
 */
export async function createBackup(): Promise<string | null> {
  try {
    const fs = getFs();
    const backupDir = getBackupDir();
    const sourcePath = getStoreFilePath();

    if (fs) {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      if (!fs.existsSync(sourcePath)) {
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `apollonography_backup_${timestamp}.json`;
      const targetPath = joinPaths(backupDir, backupName);

      fs.copyFileSync(sourcePath, targetPath);

      // Prune older backups
      await pruneOldBackups();

      // Update last backup timestamp in app settings
      const adapter = await getStorageAdapter();
      await adapter.executeSql(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);',
        ['last_auto_backup', String(Date.now()), Date.now()]
      );

      return targetPath;
    }

    return null;
  } catch (err) {
    console.warn('[BackupService] Failed to create backup:', err);
    return null;
  }
}

/**
 * Prunes backups keeping only the most recent MAX_BACKUPS_RETAINED.
 */
export async function pruneOldBackups(): Promise<number> {
  try {
    const fs = getFs();
    const backupDir = getBackupDir();

    if (!fs || !fs.existsSync(backupDir)) return 0;

    const files = fs.readdirSync(backupDir)
      .filter((f: string) => f.startsWith('apollonography_backup_') && f.endsWith('.json'))
      .map((f: string) => {
        const fullPath = joinPaths(backupDir, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          filepath: fullPath,
          createdAt: stat.mtimeMs,
        };
      })
      .sort((a: any, b: any) => b.createdAt - a.createdAt); // newest first

    let deletedCount = 0;
    if (files.length > MAX_BACKUPS_RETAINED) {
      const toDelete = files.slice(MAX_BACKUPS_RETAINED);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(item.filepath);
          deletedCount++;
        } catch {}
      }
    }

    return deletedCount;
  } catch {
    return 0;
  }
}

/**
 * Lists all available backup files.
 */
export async function listBackups(): Promise<BackupFileInfo[]> {
  try {
    const fs = getFs();
    const backupDir = getBackupDir();

    if (!fs || !fs.existsSync(backupDir)) return [];

    return fs.readdirSync(backupDir)
      .filter((f: string) => f.startsWith('apollonography_backup_') && f.endsWith('.json'))
      .map((f: string) => {
        const fullPath = joinPaths(backupDir, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          filepath: fullPath,
          sizeBytes: stat.size,
          createdAt: stat.mtimeMs,
        };
      })
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Checks if 24 hours have passed since last backup; if so, executes automatic backup.
 */
export async function runAutoBackupIfNeeded(): Promise<boolean> {
  try {
    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>(
      "SELECT value FROM app_settings WHERE key = 'last_auto_backup' LIMIT 1;"
    );

    const lastBackup = rows && rows.length > 0 ? Number(rows[0].value) : 0;
    const now = Date.now();

    if (now - lastBackup >= ONE_DAY_MS) {
      console.log('[BackupService] Triggering automatic daily backup...');
      const result = await createBackup();
      return Boolean(result);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * src/db/__tests__/exportBackup.test.ts
 *
 * Phase 8 Verification Test:
 * Verifies rolling backup snapshots and full workspace archive export/import.
 */

import { getStorageAdapter } from '../database';
import { createBackup, listBackups } from '../../services/backupService';
import { exportWorkspaceArchive, importWorkspaceArchive } from '../../services/exportService';

describe('Phase 8: Archive Export/Import & Automatic Backups', () => {
  beforeAll(async () => {
    await getStorageAdapter();
  });

  it('1. creates daily backup snapshot and registers in list', async () => {
    const backupPath = await createBackup();
    expect(backupPath).toBeDefined();

    const backups = await listBackups();
    expect(backups.length).toBeGreaterThanOrEqual(1);
    expect(backups[0].filepath).toBeDefined();
  });

  it('2. exports full workspace archive JSON', async () => {
    const archiveJson = await exportWorkspaceArchive();
    expect(archiveJson).toBeDefined();

    const parsed = JSON.parse(archiveJson);
    expect(parsed.apollonography_archive_version).toBe(2);
    expect(parsed.data).toBeDefined();
    expect(Array.isArray(parsed.data.projects)).toBe(true);
    expect(Array.isArray(parsed.data.entries)).toBe(true);
  });

  it('3. imports workspace archive and restores entities', async () => {
    const archiveJson = await exportWorkspaceArchive();
    const success = await importWorkspaceArchive(archiveJson);
    expect(success).toBe(true);
  });
});

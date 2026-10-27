/**
 * src/db/acceptanceGate.ts
 *
 * Mandatory Phase 2 Acceptance Gate:
 * Verifies persistent write -> read -> close -> reopen cycle before any later phase starts.
 */

import { getStorageAdapter, resetStorageAdapter } from './database';

export async function runAcceptanceGate(): Promise<{
  success: boolean;
  engine: 'sqlite' | 'json';
  error?: string;
}> {
  console.log('[AcceptanceGate] Starting Phase 2 Verification...');

  try {
    const adapter = await getStorageAdapter();
    const engine = adapter.getStorageType();
    console.log(`[AcceptanceGate] Testing active storage engine: ${engine.toUpperCase()}`);

    // 1. Setup test table
    await adapter.executeSql(`
      CREATE TABLE IF NOT EXISTS _gate_test (
        id TEXT PRIMARY KEY,
        val TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    // 2. Generate 5,000-character test payload
    const testId = `gate-${Date.now()}`;
    const testPayload = 'Apollonography_Storage_Verification_' + 'A'.repeat(5000);
    const now = Date.now();

    // 3. Write test record
    console.log('[AcceptanceGate] Step 1: Writing 5,000-char payload...');
    await adapter.executeSql(
      'INSERT OR REPLACE INTO _gate_test (id, val, timestamp) VALUES (?, ?, ?);',
      [testId, testPayload, now]
    );

    // 4. Read back immediately
    console.log('[AcceptanceGate] Step 2: Reading back immediately...');
    const read1 = await adapter.executeSql<Array<{ id: string; val: string; timestamp: number }>>(
      'SELECT id, val, timestamp FROM _gate_test WHERE id = ?;',
      [testId]
    );

    if (!read1 || read1.length === 0 || read1[0].val !== testPayload) {
      throw new Error(`Immediate read verification failed! Expected payload length ${testPayload.length}, received ${read1?.[0]?.val?.length ?? 0}`);
    }

    // 5. Close and Reopen connection
    console.log('[AcceptanceGate] Step 3: Closing adapter connection...');
    await resetStorageAdapter();

    console.log('[AcceptanceGate] Step 4: Re-opening fresh adapter connection...');
    const freshAdapter = await getStorageAdapter();

    // 6. Read back from reopened connection
    console.log('[AcceptanceGate] Step 5: Reading back after connection reopen...');
    const read2 = await freshAdapter.executeSql<Array<{ id: string; val: string; timestamp: number }>>(
      'SELECT id, val, timestamp FROM _gate_test WHERE id = ?;',
      [testId]
    );

    if (!read2 || read2.length === 0 || read2[0].val !== testPayload) {
      throw new Error('Post-reopen read verification failed! Data was not persisted across connection reopen.');
    }

    // 7. Clean up test row
    await freshAdapter.executeSql('DELETE FROM _gate_test WHERE id = ?;', [testId]);

    console.log('[AcceptanceGate] ✅ PASS: Phase 2 Acceptance Gate passed with exact 5,000-char parity!');
    return { success: true, engine };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[AcceptanceGate] ❌ FAIL: Phase 2 Acceptance Gate encountered an error:', errorMsg);
    return { success: false, engine: 'sqlite', error: errorMsg };
  }
}

/**
 * src/db/__tests__/uploadQueue.test.ts
 *
 * Phase 5 Verification Test:
 * Verifies upload queue staging, background worker processing, Cloudinary integration,
 * and database image linking.
 */

import { getStorageAdapter } from '../database';
import { enqueueUpload, processUploadQueue, getPendingUploadsCount } from '../../services/uploadQueue';
import { createEntry, deleteEntry } from '../../hooks/useEntries';
import type { Entry } from '../../types/models';

jest.mock('../../services/cloudinaryService', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    publicId: 'apollonography/tests/mock_upload_id',
    version: 1,
    width: 800,
    height: 800,
    format: 'png',
    bytes: 120000,
    folder: 'apollonography/tests',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  }),
}));

describe('Phase 5: Cloudinary Upload Pipeline & Staging Queue', () => {
  const testEntryId = 'test-upload-entry';
  const testProjectId = 'test-upload-proj';

  beforeAll(async () => {
    const adapter = await getStorageAdapter();
    await adapter.executeSql('DELETE FROM pending_uploads WHERE entry_id = ?;', [testEntryId]);

    // Create a mock entry to associate with the upload
    const entry: Entry = {
      id: testEntryId,
      projectId: testProjectId,
      categoryId: 'cat-test',
      title: 'Upload Test Champion',
      summary: 'Testing background uploads.',
      thumbnail: null,
      portrait: null,
      tags: [],
      infoFields: [],
      sections: [],
    };
    await createEntry(entry);
  });

  afterAll(async () => {
    try {
      await deleteEntry(testEntryId);
    } catch {}
  });

  it('1. enqueues an image upload into pending_uploads', async () => {
    const queueId = await enqueueUpload({
      entryId: testEntryId,
      slot: 'thumbnail',
      localTempPath: 'file:///data/local_char_01.png',
      folder: 'apollonography/tests',
      autoProcess: false,
    });

    expect(queueId).toBeDefined();

    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>(
      'SELECT * FROM pending_uploads WHERE id = ?;',
      [queueId]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('queued');
    expect(rows[0].entry_id).toBe(testEntryId);
    expect(rows[0].slot).toBe('thumbnail');
  });

  it('2. tracks pending upload count', async () => {
    const count = await getPendingUploadsCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('3. processes queue, records image metadata, updates entry, and removes from queue', async () => {
    await processUploadQueue();

    const adapter = await getStorageAdapter();

    // Verify queue is now empty for this entry
    const pendingRows = await adapter.executeSql<any[]>(
      'SELECT * FROM pending_uploads WHERE entry_id = ?;',
      [testEntryId]
    );
    expect(pendingRows.length).toBe(0);

    // Verify entry was updated with thumbnail_image_id
    const entryRows = await adapter.executeSql<any[]>(
      'SELECT thumbnail_image_id FROM entries WHERE id = ?;',
      [testEntryId]
    );
    expect(entryRows.length).toBe(1);
    expect(entryRows[0].thumbnail_image_id).toBeDefined();
    expect(entryRows[0].thumbnail_image_id).not.toBeNull();

    // Verify image was registered in images table
    const imageId = entryRows[0].thumbnail_image_id;
    const imageRows = await adapter.executeSql<any[]>(
      'SELECT * FROM images WHERE id = ?;',
      [imageId]
    );
    expect(imageRows.length).toBe(1);
    expect(imageRows[0].public_id).toBe(imageId);
  });
});

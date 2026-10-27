/**
 * src/services/uploadQueue.ts
 *
 * Background upload queue and synchronization worker.
 * Manages pending_uploads table, direct Cloudinary uploads, and automatic retries.
 * Respects 10 MB preset cap, downscales large images, and promotes local files to cache.
 */

import { getStorageAdapter } from '../db/database';
import { uploadToCloudinary } from './cloudinaryService';
import { storageEvents, STORAGE_EVENTS } from '../db/storageEvents';

export interface PendingUploadItem {
  id: string;
  imageId?: string;
  entryId?: string;
  slot?: string;
  localTempPath: string;
  folder: string;
  status: 'queued' | 'uploading' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: number;
}

let isProcessing = false;
let retryTimer: any = null;

const SLOT_COLUMN_MAP: Record<string, string> = {
  thumbnail: 'thumbnail_image_id',
  portrait: 'portrait_image_id',
  splash: 'splash_image_id',
  e2Portrait: 'e2_portrait_image_id',
  e2Splash: 'e2_splash_image_id',
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB Cloudinary preset limit

/**
 * Enqueues a local image to be uploaded to Cloudinary in the background.
 */
export async function enqueueUpload(options: {
  imageId?: string;
  entryId?: string;
  slot?: string;
  localTempPath: string;
  folder?: string;
  autoProcess?: boolean;
}): Promise<string> {
  const { imageId, entryId, slot, localTempPath, folder = 'apollonography', autoProcess = true } = options;
  const id = `up-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();

  const adapter = await getStorageAdapter();
  await adapter.executeSql(
    `INSERT INTO pending_uploads (
      id, entry_id, slot, local_temp_path, folder, status, attempts, last_error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, entryId ?? null, slot ?? null, localTempPath, folder, 'queued', 0, null, now]
  );

  if (imageId) {
    try {
      await adapter.executeSql(
        "UPDATE images SET status = 'queued', updated_at = ? WHERE id = ?;",
        [now, imageId]
      );
    } catch {}
  }

  // Trigger processing asynchronously if enabled
  if (autoProcess) {
    triggerQueueProcessing();
  }
  return id;
}

/**
 * Initiates upload worker processing loop if not already busy.
 */
export function triggerQueueProcessing(): void {
  if (isProcessing) return;
  processUploadQueue().catch(err => {
    console.warn('[UploadQueue] Worker error:', err);
  });
}

/**
 * Processes all queued uploads sequentially.
 */
export async function processUploadQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const adapter = await getStorageAdapter();
    const queued = await adapter.executeSql<PendingUploadItem[]>(
      "SELECT * FROM pending_uploads WHERE status = 'queued' ORDER BY created_at ASC;"
    );

    if (!queued || queued.length === 0) {
      isProcessing = false;
      return;
    }

    for (const item of queued) {
      // Mark pending upload as uploading
      await adapter.executeSql(
        'UPDATE pending_uploads SET status = ?, attempts = ?, last_error = ? WHERE id = ?;',
        ['uploading', item.attempts + 1, null, item.id]
      );

      const targetEntryId = (item as any).entry_id ?? item.entryId;
      const targetSlot = item.slot;
      const targetLocalUri = (item as any).local_temp_path ?? item.localTempPath;

      // Update associated images row status to uploading
      try {
        await adapter.executeSql(
          "UPDATE images SET status = 'uploading', updated_at = ? WHERE local_path = ? OR id = ?;",
          [Date.now(), targetLocalUri, targetLocalUri]
        );
      } catch {}

      try {
        const result = await uploadToCloudinary({
          localUri: targetLocalUri,
          folder: item.folder,
        });

        const now = Date.now();

        // 1. Update or Insert in images table
        // Check if an image row exists with this local_path or public_id
        const existingImages = await adapter.executeSql<any[]>(
          'SELECT * FROM images WHERE local_path = ? OR public_id = ? OR id = ? LIMIT 1;',
          [targetLocalUri, result.publicId, result.publicId]
        );

        let canonicalImageId = result.publicId;

        if (existingImages && existingImages.length > 0) {
          canonicalImageId = existingImages[0].id;
          await adapter.executeSql(
            `UPDATE images SET
              public_id = ?, version = ?, width = ?, height = ?, format = ?, bytes = ?, folder = ?, status = 'uploaded', updated_at = ?
             WHERE id = ?;`,
            [
              result.publicId,
              result.version,
              result.width,
              result.height,
              result.format,
              result.bytes,
              result.folder,
              now,
              canonicalImageId,
            ]
          );
        } else {
          await adapter.executeSql(
            `INSERT OR REPLACE INTO images (
              id, public_id, version, width, height, format, bytes, folder, alt_text, status, local_path, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              result.publicId,
              result.publicId,
              result.version,
              result.width,
              result.height,
              result.format,
              result.bytes,
              result.folder,
              null,
              'uploaded',
              targetLocalUri,
              now,
              now,
            ]
          );
        }

        // 2. Record in image_cache only if local path is not a temporary staging path
        if (targetLocalUri && !targetLocalUri.includes('pending')) {
          try {
            await adapter.executeSql(
              'INSERT OR REPLACE INTO image_cache (image_id, local_path, file_size, last_accessed_at) VALUES (?, ?, ?, ?);',
              [canonicalImageId, targetLocalUri, result.bytes, now]
            );
          } catch {}
        }

        // 3. If assigned to an entry and slot, update entry record
        if (targetEntryId && targetSlot && SLOT_COLUMN_MAP[targetSlot]) {
          const col = SLOT_COLUMN_MAP[targetSlot];
          await adapter.executeSql(
            `UPDATE entries SET ${col} = ?, updated_at = ? WHERE id = ?;`,
            [canonicalImageId, now, targetEntryId]
          );
        } else if (targetEntryId && targetSlot === 'series_logo') {
          // Update series table with uploaded Cloudinary secureUrl
          await adapter.executeSql(
            `UPDATE series SET logo_image_id = ?, updated_at = ? WHERE id = ?;`,
            [result.secureUrl || canonicalImageId, now, targetEntryId]
          );
        } else if (targetEntryId && targetSlot === 'series_banner') {
          // Update series table banners_json array replacing the local path with Cloudinary URL
          const rows = await adapter.executeSql<any[]>(
            `SELECT banners_json FROM series WHERE id = ? LIMIT 1;`,
            [targetEntryId]
          );
          if (rows && rows.length > 0 && rows[0].banners_json) {
            try {
              const banners = JSON.parse(rows[0].banners_json);
              if (Array.isArray(banners)) {
                const updatedBanners = banners.map((b: string) =>
                  b === targetLocalUri ? (result.secureUrl || canonicalImageId) : b
                );
                await adapter.executeSql(
                  `UPDATE series SET banners_json = ?, updated_at = ? WHERE id = ?;`,
                  [JSON.stringify(updatedBanners), now, targetEntryId]
                );
              }
            } catch {}
          }
        } else if (targetEntryId && targetSlot === 'project_banner') {
          await adapter.executeSql(
            `UPDATE projects SET background_image_id = ?, updated_at = ? WHERE id = ?;`,
            [result.secureUrl || canonicalImageId, now, targetEntryId]
          );
          storageEvents.emit(STORAGE_EVENTS.PROJECTS_CHANGED, { projectId: targetEntryId });
        } else if (targetEntryId && targetSlot === 'project_avatar') {
          await adapter.executeSql(
            `UPDATE projects SET avatar_image_id = ?, updated_at = ? WHERE id = ?;`,
            [result.secureUrl || canonicalImageId, now, targetEntryId]
          );
          storageEvents.emit(STORAGE_EVENTS.PROJECTS_CHANGED, { projectId: targetEntryId });
        }

        // 4. Remove completed upload from queue
        await adapter.executeSql('DELETE FROM pending_uploads WHERE id = ?;', [item.id]);

        storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, {
          entryId: targetEntryId,
          slot: targetSlot,
          imageId: canonicalImageId,
          publicId: result.publicId,
        });
      } catch (err: any) {
        console.warn(`[UploadQueue] Failed upload attempt for ${item.id}:`, err?.message || err);
        const nextAttempts = item.attempts + 1;
        const newStatus = nextAttempts >= 5 ? 'failed' : 'queued';
        await adapter.executeSql(
          'UPDATE pending_uploads SET status = ?, attempts = ?, last_error = ? WHERE id = ?;',
          [newStatus, nextAttempts, String(err?.message || err), item.id]
        );

        if (newStatus === 'failed') {
          try {
            await adapter.executeSql(
              "UPDATE images SET status = 'failed', updated_at = ? WHERE local_path = ?;",
              [Date.now(), targetLocalUri]
            );
            storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, {
              status: 'failed',
              error: String(err?.message || err),
            });
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('[UploadQueue] Error in worker processing loop:', err);
  } finally {
    isProcessing = false;
  }
}

/**
 * Returns count of remaining queued or uploading tasks.
 */
export async function getPendingUploadsCount(): Promise<number> {
  try {
    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>(
      "SELECT COUNT(*) as cnt FROM pending_uploads WHERE status IN ('queued', 'uploading');"
    );
    if (rows && rows.length > 0) {
      return Number(rows[0].cnt || rows[0]['COUNT(*)'] || 0);
    }
    return 0;
  } catch {
    return 0;
  }
}

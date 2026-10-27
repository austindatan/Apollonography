/**
 * src/services/imageCacheService.ts
 *
 * Local 200 MB LRU Image Cache Service.
 * Caches downloaded remote/Cloudinary images locally with automatic LRU eviction down to 160 MB.
 */

import { getStorageAdapter } from '../db/database';
import { getFs, joinPaths } from '../utils/nodeFs';

export const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200 MB cap
export const TARGET_PRUNE_BYTES = 160 * 1024 * 1024; // 160 MB prune target

export interface ImageCacheRow {
  image_id: string;
  local_path: string;
  file_size: number;
  last_accessed_at: number;
}

export interface CacheStats {
  count: number;
  totalBytes: number;
  maxBytes: number;
  targetBytes: number;
}

function getCacheDir(): string {
  try {
    const proc = (globalThis as any).process;
    const baseDir = proc?.env?.LOCALAPPDATA ? proc.env.LOCALAPPDATA : '.';
    return joinPaths(baseDir, 'Apollonography', 'Images', 'Cache');
  } catch {
    return './images/cache';
  }
}

/**
 * Checks if an image is already cached locally.
 * If found and the file exists on disk, updates last_accessed_at and returns local path.
 */
export async function getCachedImagePath(imageId: string): Promise<string | null> {
  try {
    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<ImageCacheRow[]>(
      'SELECT * FROM image_cache WHERE image_id = ?;',
      [imageId]
    );

    if (!rows || rows.length === 0) return null;

    const cached = rows[0];
    const fs = getFs();
    if (fs && fs.existsSync(cached.local_path)) {
      // Update access time for LRU tracking
      await adapter.executeSql(
        'UPDATE image_cache SET last_accessed_at = ? WHERE image_id = ?;',
        [Date.now(), imageId]
      );
      return cached.local_path;
    } else if (fs) {
      // Stale database record; delete it
      await adapter.executeSql('DELETE FROM image_cache WHERE image_id = ?;', [imageId]);
      return null;
    } else {
      // In runtime environments without direct fs access (React Native Windows),
      // never return temporary /pending/ paths which may have been removed.
      if (cached.local_path && !cached.local_path.includes('pending')) {
        return cached.local_path;
      }
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Caches a remote image to local disk and indexes it in image_cache.
 * Automatically triggers LRU pruning if total cache exceeds 200 MB.
 */
export async function cacheImage(
  imageId: string,
  dataBufferOrBase64: any,
  extension: string = 'png'
): Promise<string> {
  const fs = getFs();
  const cacheDir = getCacheDir();

  if (fs && !fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cleanId = imageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanId}.${extension}`;
  const localPath = joinPaths(cacheDir, filename);

  let fileSize = 0;
  if (fs) {
    const nodeBuf = (globalThis as any).Buffer;
    if (nodeBuf && nodeBuf.isBuffer(dataBufferOrBase64)) {
      fs.writeFileSync(localPath, dataBufferOrBase64);
      fileSize = dataBufferOrBase64.length;
    } else if (typeof dataBufferOrBase64 === 'string') {
      const buffer = nodeBuf ? nodeBuf.from(dataBufferOrBase64, 'base64') : dataBufferOrBase64;
      fs.writeFileSync(localPath, buffer);
      fileSize = buffer.length;
    }
  }

  const now = Date.now();
  const adapter = await getStorageAdapter();

  await adapter.executeSql(
    `INSERT OR REPLACE INTO image_cache (
      image_id, local_path, file_size, last_accessed_at
    ) VALUES (?, ?, ?, ?);`,
    [imageId, localPath, fileSize, now]
  );

  // Check if cache exceeds max cap
  await checkAndPruneCache();

  return localPath;
}

/**
 * Checks current cache size and prunes oldest accessed files if > 200 MB.
 */
export async function checkAndPruneCache(): Promise<number> {
  const stats = await getCacheStats();
  if (stats.totalBytes > MAX_CACHE_BYTES) {
    return pruneCache(TARGET_PRUNE_BYTES);
  }
  return 0;
}

/**
 * Prunes the cache down to targetBytes using LRU order (oldest last_accessed_at first).
 */
export async function pruneCache(targetBytes: number = TARGET_PRUNE_BYTES): Promise<number> {
  try {
    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<ImageCacheRow[]>(
      'SELECT * FROM image_cache ORDER BY last_accessed_at ASC;'
    );

    if (!rows || rows.length === 0) return 0;

    let currentTotal = rows.reduce((sum, r) => sum + (r.file_size || 0), 0);
    let bytesFreed = 0;

    const fs = getFs();
    for (const row of rows) {
      if (currentTotal <= targetBytes) break;

      try {
        if (fs && fs.existsSync(row.local_path)) {
          fs.unlinkSync(row.local_path);
        }
      } catch {}

      await adapter.executeSql('DELETE FROM image_cache WHERE image_id = ?;', [row.image_id]);
      currentTotal -= row.file_size;
      bytesFreed += row.file_size;
    }

    return bytesFreed;
  } catch (err) {
    console.warn('[ImageCache] Error during prune:', err);
    return 0;
  }
}

/**
 * Returns current cache statistics.
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>(
      'SELECT SUM(file_size) as total, COUNT(*) as cnt FROM image_cache;'
    );

    const totalBytes = Number(rows?.[0]?.total || rows?.[0]?.total_bytes || 0);
    const count = Number(rows?.[0]?.cnt || rows?.[0]?.count || 0);

    return {
      count,
      totalBytes,
      maxBytes: MAX_CACHE_BYTES,
      targetBytes: TARGET_PRUNE_BYTES,
    };
  } catch {
    return {
      count: 0,
      totalBytes: 0,
      maxBytes: MAX_CACHE_BYTES,
      targetBytes: TARGET_PRUNE_BYTES,
    };
  }
}

/**
 * Wipes all files from cache directory and clears database index.
 */
export async function clearCache(): Promise<void> {
  try {
    const fs = getFs();
    const cacheDir = getCacheDir();
    if (fs && fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        try {
          fs.unlinkSync(joinPaths(cacheDir, file));
        } catch {}
      }
    }

    const adapter = await getStorageAdapter();
    await adapter.executeSql('DELETE FROM image_cache;');
  } catch (err) {
    console.warn('[ImageCache] Failed to clear cache:', err);
  }
}

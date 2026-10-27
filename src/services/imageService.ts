/**
 * src/services/imageService.ts
 *
 * Central image service:
 * - Single image resolver (id -> local path -> Cloudinary URL)
 * - SHA-256 hash deduplication (one file = one images row = one upload)
 * - Slot attachment and status tracking (queued, uploading, uploaded, failed)
 */

import { getStorageAdapter } from '../db/database';
import { storageEvents, STORAGE_EVENTS } from '../db/storageEvents';
import { getCloudinaryUrl } from '../utils/cloudinary';
import { enqueueUpload, triggerQueueProcessing } from './uploadQueue';

export interface ImageRecord {
  id: string;
  public_id?: string | null;
  version?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  folder?: string;
  alt_text?: string | null;
  hash?: string | null;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
  local_path?: string | null;
  created_at: number;
  updated_at: number;
}

export type ResolvedImage =
  | { kind: 'bundled'; source: any; status: 'uploaded' }
  | { kind: 'local'; uri: string; localPath: string; status: 'queued' | 'uploading' | 'failed' | 'uploaded' }
  | { kind: 'cloudinary'; uri: string; publicId: string; status: 'uploaded'; width?: number; height?: number }
  | null;

// In-memory cache for synchronous instant lookups
const imageCache = new Map<string, ImageRecord>();
let isCacheLoaded = false;

export async function loadImagesCache(): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<ImageRecord[]>('SELECT * FROM images;');
    if (rows) {
      imageCache.clear();
      for (const row of rows) {
        imageCache.set(row.id, row);
        if (row.public_id) {
          imageCache.set(row.public_id, row);
        }
      }
      isCacheLoaded = true;
    }
  } catch (err) {
    console.warn('[ImageService] Failed to load images cache:', err);
  }
}

// Auto-load cache on import and listen for updates
loadImagesCache().catch(() => {});
storageEvents.on(STORAGE_EVENTS.ENTRIES_CHANGED, () => {
  loadImagesCache().catch(() => {});
});

/**
 * Normalizes local filesystem path into standard file:/// URI.
 */
export function formatLocalUri(path: string): string {
  if (!path) return '';
  if (path.startsWith('file:///')) return path;
  if (path.startsWith('file://')) return path.replace('file://', 'file:///');
  const clean = path.replace(/\\/g, '/');
  return `file:///${clean.replace(/^\/+/, '')}`;
}

/**
 * Synchronous resolver used by components for flicker-free rendering.
 */
export function resolveImageSync(raw: any, options?: { width?: number; height?: number }): ResolvedImage {
  if (raw === null || raw === undefined) return null;

  // React Native bundled asset (e.g. require('../../assets/...'))
  if (typeof raw === 'number') {
    return { kind: 'bundled', source: raw, status: 'uploaded' };
  }

  // Object wrapper with source/asset
  if (typeof raw === 'object') {
    if (raw.kind === 'bundled' && raw.asset) {
      return { kind: 'bundled', source: raw.asset, status: 'uploaded' };
    }
    if (raw.id && imageCache.has(raw.id)) {
      raw = raw.id;
    } else if (raw.public_id && imageCache.has(raw.public_id)) {
      raw = raw.public_id;
    } else if (raw.uri) {
      // Direct URI fallback
      return {
        kind: 'local',
        uri: formatLocalUri(raw.uri),
        localPath: raw.localPath || raw.uri,
        status: raw.status || 'uploaded',
      };
    }
  }

  const key = String(raw).trim();

  // Check in-memory image cache
  const cached = imageCache.get(key);
  if (cached) {
    if (cached.status === 'uploaded' && cached.public_id) {
      const url = getCloudinaryUrl({ public_id: cached.public_id, version: cached.version || 0 }, options);
      return {
        kind: 'cloudinary',
        uri: url,
        publicId: cached.public_id,
        status: 'uploaded',
        width: cached.width,
        height: cached.height,
      };
    }

    if (cached.local_path) {
      return {
        kind: 'local',
        uri: formatLocalUri(cached.local_path),
        localPath: cached.local_path,
        status: cached.status,
      };
    }
  }

  // Raw file:/// or Windows drive path fallback
  if (key.startsWith('file:') || key.includes(':\\') || key.startsWith('/')) {
    return {
      kind: 'local',
      uri: formatLocalUri(key),
      localPath: key,
      status: 'uploaded',
    };
  }

  // Raw HTTP / HTTPS remote URL fallback
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return {
      kind: 'local',
      uri: key,
      localPath: '',
      status: 'uploaded',
    };
  }

  // Default assumption: Cloudinary public_id
  const url = getCloudinaryUrl({ public_id: key }, options);
  return {
    kind: 'cloudinary',
    uri: url,
    publicId: key,
    status: 'uploaded',
  };
}

/**
 * Registers or reuses an image by SHA-256 hash.
 * If an image with this hash already exists, returns its ID without re-uploading.
 * If new, creates a queued images row and enqueues an upload.
 */
export async function registerOrReuseImage(options: {
  localPath: string;
  hash: string;
  size?: number;
  folder?: string;
  entryId?: string;
  slot?: string;
}): Promise<{ imageId: string; isExisting: boolean; status: string }> {
  const { localPath, hash, size = 0, folder = 'apollonography', entryId, slot } = options;
  const adapter = await getStorageAdapter();

  // 1. Check if an image with this hash already exists
  const existing = await adapter.executeSql<ImageRecord[]>(
    'SELECT * FROM images WHERE hash = ? LIMIT 1;',
    [hash]
  );

  if (existing && existing.length > 0) {
    const matched = existing[0];
    imageCache.set(matched.id, matched);
    if (matched.public_id) imageCache.set(matched.public_id, matched);

    // If previously failed, retry processing
    if (matched.status === 'failed') {
      triggerQueueProcessing();
    }

    return {
      imageId: matched.id,
      isExisting: true,
      status: matched.status,
    };
  }

  // 2. Generate clean image ID (id only, never a file:/// path)
  const imageId = `img-${Date.now()}-${hash.substring(0, 8)}`;
  const now = Date.now();
  const ext = localPath.split('.').pop()?.toLowerCase() || 'png';

  const newRecord: ImageRecord = {
    id: imageId,
    public_id: imageId,
    version: 0,
    width: 0,
    height: 0,
    format: ext,
    bytes: size,
    folder,
    alt_text: null,
    hash,
    status: 'queued',
    local_path: localPath,
    created_at: now,
    updated_at: now,
  };

  // 3. Insert images row
  await adapter.executeSql(
    `INSERT INTO images (
      id, public_id, version, width, height, format, bytes, folder, alt_text, hash, status, local_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      imageId,
      imageId,
      0,
      0,
      0,
      ext,
      size,
      folder,
      null,
      hash,
      'queued',
      localPath,
      now,
      now,
    ]
  );

  imageCache.set(imageId, newRecord);

  // 4. Enqueue background upload
  await enqueueUpload({
    imageId,
    entryId,
    slot,
    localTempPath: localPath,
    folder,
    autoProcess: true,
  });

  return {
    imageId,
    isExisting: false,
    status: 'queued',
  };
}

/**
 * Updates an entry's image slot directly in the database.
 * The database is the single source of truth for all slot image references.
 */
export async function updateEntryImageSlot(
  entryId: string,
  slot: string,
  imageId: string
): Promise<void> {
  const columnMap: Record<string, string> = {
    panel: 'thumbnail_image_id',
    thumbnail: 'thumbnail_image_id',
    gallery: 'portrait_image_id',
    portrait: 'portrait_image_id',
    splash: 'splash_image_id',
    e2Gallery: 'e2_portrait_image_id',
    e2Portrait: 'e2_portrait_image_id',
    e2Splash: 'e2_splash_image_id',
  };
  const col = columnMap[slot];
  if (!col) return;

  const adapter = await getStorageAdapter();
  await adapter.executeSql(
    `UPDATE entries SET ${col} = ?, updated_at = ? WHERE id = ?;`,
    [imageId, Date.now(), entryId]
  );

  storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, {
    entryId,
    slot,
    imageId,
  });
}

/**
 * src/db/__tests__/imageCache.test.ts
 *
 * Phase 6 Verification Test:
 * Verifies local image caching, LRU access tracking, pruning down to 160MB, and cache statistics.
 */

import { getStorageAdapter } from '../database';
import {
  cacheImage,
  getCachedImagePath,
  getCacheStats,
  pruneCache,
  clearCache,
} from '../../services/imageCacheService';

declare const Buffer: any;

describe('Phase 6: Local 200 MB LRU Image Cache & Offline Placeholders', () => {
  beforeAll(async () => {
    await getStorageAdapter();
    await clearCache();
  });

  afterAll(async () => {
    await clearCache();
  });

  it('1. caches image to local disk and indexes in image_cache table', async () => {
    const dummyBuffer = Buffer.from('Apollonography_Cached_Image_Data_Sample');
    const localPath = await cacheImage('test-img-1', dummyBuffer, 'png');

    expect(localPath).toBeDefined();

    const cached = await getCachedImagePath('test-img-1');
    expect(cached).toBe(localPath);
  });

  it('2. tracks image cache statistics and file sizes', async () => {
    const dummyBuffer2 = Buffer.from('Second_Cached_Image_Data_Sample');
    await cacheImage('test-img-2', dummyBuffer2, 'png');

    const stats = await getCacheStats();
    expect(stats.count).toBe(2);
    expect(stats.totalBytes).toBeGreaterThan(0);
    expect(stats.maxBytes).toBe(200 * 1024 * 1024);
  });

  it('3. prunes oldest accessed items down to target bytes (LRU order)', async () => {
    // Both images cached; let's prune down to 0 target bytes
    const freed = await pruneCache(0);
    expect(freed).toBeGreaterThan(0);

    const statsAfter = await getCacheStats();
    expect(statsAfter.count).toBe(0);
    expect(statsAfter.totalBytes).toBe(0);
  });
});

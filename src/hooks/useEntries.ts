/**
 * src/hooks/useEntries.ts
 *
 * Data-access hooks for project entries.
 * Connects to SQLite / StorageAdapter.
 * Exposes distinct loading, empty, and error states.
 * Free of any hardcoded mock data.
 */

import { useEffect, useState } from 'react';
import type { Entry, Tag } from '../types/models';
import { getStorageAdapter } from '../db/database';
import { storageEvents, STORAGE_EVENTS } from '../db/storageEvents';
import { resolveImageSync, loadImagesCache } from '../services/imageService';

export type EntriesList = Entry[] & {
  entries: Entry[];
  loading: boolean;
  error: Error | null;
  empty: boolean;
};

function createEntriesList(
  items: Entry[],
  loading: boolean,
  error: Error | null = null,
  empty: boolean = false
): EntriesList {
  const arr = [...items] as any;
  arr.entries = arr;
  arr.loading = loading;
  arr.error = error;
  arr.empty = empty;
  return arr as EntriesList;
}

function getImageId(img: any): string | null {
  if (!img) return null;
  if (typeof img === 'string') {
    if (
      img.startsWith('file:') ||
      img.startsWith('C:') ||
      img.includes(':\\') ||
      img.startsWith('/')
    ) {
      return null;
    }
    return img;
  }
  if (typeof img === 'object') {
    const rawId = img.id || img.imageId || img.publicId || img.public_id || img.asset?.id || img.asset?.public_id;
    if (rawId && typeof rawId === 'string') {
      if (
        rawId.startsWith('file:') ||
        rawId.startsWith('C:') ||
        rawId.includes(':\\') ||
        rawId.startsWith('/')
      ) {
        return null;
      }
      return rawId;
    }
  }
  return null;
}

function mapSlotImage(imageId: string | null | undefined, fallback: any = null): any {
  if (!imageId) return fallback;
  const resolved = resolveImageSync(imageId);
  if (resolved) {
    if (resolved.kind === 'cloudinary') {
      return {
        id: imageId,
        publicId: resolved.publicId,
        uri: resolved.uri,
        status: resolved.status,
        kind: 'cloudinary',
        asset: {
          public_id: resolved.publicId,
          version: (resolved as any).version || 0,
          format: (resolved as any).format || 'png',
          width: resolved.width || 0,
          height: resolved.height || 0,
          bytes: 0,
        },
      };
    }
    if (resolved.kind === 'local') {
      return {
        id: imageId,
        uri: resolved.uri,
        localPath: resolved.localPath,
        status: resolved.status,
        kind: 'local',
      };
    }
    if (resolved.kind === 'bundled') {
      return resolved.source;
    }
  }
  return fallback;
}

export function cleanMojibake(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/\u00c3\u00a2\u00c2\u0098\u00c2\u0085/g, '★')
    .replace(/Ã¢ËœÂ/g, '★')
    .replace(/Ã¢\x98\x85/g, '★')
    .replace(/â˜…/g, '★')
    .replace(/â\x98\x85/g, '★')
    .replace(/\u00e2\u0098\u0085/g, '★')
    .replace(/\u00c3\u00a2\u00c2\u0080\u00c2\u0094/g, '—')
    .replace(/Ã¢â‚¬â€/g, '—')
    .replace(/â€”/g, '—')
    .replace(/\u00e2\u0080\u0094/g, '—');
}

/**
 * Persists an entry (create or update) to the database.
 */
export async function saveEntry(entry: Entry): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    const now = Date.now();

    const infoFieldsJson = entry.infoFields ? JSON.stringify(entry.infoFields) : null;
    const sectionsJson = entry.sections ? JSON.stringify(entry.sections) : null;
    const abilitiesJson = entry.abilities ? JSON.stringify(entry.abilities) : null;
    const evolutionsJson = entry.evolutions ? JSON.stringify(entry.evolutions) : null;
    const wardrobesJson = entry.wardrobes ? JSON.stringify(entry.wardrobes) : null;

    const thumbId = getImageId(entry.thumbnail);
    const portraitId = getImageId(entry.portrait);
    const splashId = getImageId(entry.splash);
    const e2PortId = getImageId(entry.e2Portrait);
    const e2SplashId = getImageId(entry.e2Splash);

    await adapter.executeSql(
      `INSERT INTO entries (
        id, project_id, category_id, title, summary,
        thumbnail_image_id, portrait_image_id, splash_image_id,
        e2_portrait_image_id, e2_splash_image_id,
        info_fields_json, sections_json, abilities_json, evolutions_json, wardrobes_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        category_id = excluded.category_id,
        title = excluded.title,
        summary = excluded.summary,
        thumbnail_image_id = excluded.thumbnail_image_id,
        portrait_image_id = excluded.portrait_image_id,
        splash_image_id = excluded.splash_image_id,
        e2_portrait_image_id = excluded.e2_portrait_image_id,
        e2_splash_image_id = excluded.e2_splash_image_id,
        info_fields_json = excluded.info_fields_json,
        sections_json = excluded.sections_json,
        abilities_json = excluded.abilities_json,
        evolutions_json = excluded.evolutions_json,
        wardrobes_json = excluded.wardrobes_json,
        updated_at = excluded.updated_at;`,
      [
        entry.id,
        entry.projectId,
        entry.categoryId,
        entry.title,
        entry.summary ?? '',
        thumbId,
        portraitId,
        splashId,
        e2PortId,
        e2SplashId,
        infoFieldsJson,
        sectionsJson,
        abilitiesJson,
        evolutionsJson,
        wardrobesJson,
        now,
        now,
      ]
    );

    // Sync tags for this entry
    if (entry.tags && Array.isArray(entry.tags)) {
      await adapter.executeSql('DELETE FROM entry_tags WHERE entry_id = ?;', [entry.id]);
      for (const tag of entry.tags) {
        await adapter.executeSql(
          'INSERT OR IGNORE INTO tags (id, project_id, name, color) VALUES (?, ?, ?, ?);',
          [tag.id, entry.projectId, tag.name, tag.color]
        );
        await adapter.executeSql(
          'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?);',
          [entry.id, tag.id]
        );
      }
    }

    // Checkpoint WAL so external tools immediately see changes
    try { await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);'); } catch {}

    storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, { entryId: entry.id, projectId: entry.projectId });
  } catch (err) {
    console.warn('[useEntries] Failed to save entry to database:', err);
    throw err;
  }
}

export async function createEntry(entry: Entry): Promise<void> {
  return saveEntry(entry);
}

/**
 * Deletes an entry and associated join records from the database.
 */
export async function deleteEntry(entryId: string): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    await adapter.executeSql('DELETE FROM entries WHERE id = ?;', [entryId]);
    await adapter.executeSql('DELETE FROM entry_tags WHERE entry_id = ?;', [entryId]);
    try { await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);'); } catch {}
    storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, { entryId });
  } catch (err) {
    console.warn('[useEntries] Failed to delete entry from database:', err);
    throw err;
  }
}

export function useEntries(projectId: string, categoryId?: string): EntriesList {
  const [result, setResult] = useState<EntriesList>(() =>
    createEntriesList([], true, null, false)
  );

  useEffect(() => {
    let isMounted = true;

    if (!projectId) {
      setResult(createEntriesList([], false, null, true));
      return;
    }

    const loadEntriesFromDb = async (isSilent: boolean = false) => {
      try {
        if (!isSilent) {
          setResult(prev => createEntriesList(prev, true, null, false));
        }
        try { await loadImagesCache(); } catch {}
        const adapter = await getStorageAdapter();
        let sql = 'SELECT * FROM entries WHERE project_id = ?';
        const params: (string | number)[] = [projectId];
        if (categoryId && categoryId !== 'all') {
          sql += ' AND category_id = ?';
          params.push(categoryId);
        }
        sql += ' ORDER BY COALESCE(updated_at, created_at) DESC;';

        const rows = await adapter.executeSql<any[]>(sql, params);
        if (!rows || rows.length === 0) {
          if (isMounted) {
            setResult(createEntriesList([], false, null, true));
          }
          return;
        }

        // Fetch tags for these entries
        const tagsMap: Record<string, Tag[]> = {};
        try {
          const tagRows = await adapter.executeSql<any[]>(
            `SELECT et.entry_id, t.id, t.name, t.color 
             FROM entry_tags et 
             JOIN tags t ON et.tag_id = t.id 
             WHERE t.project_id = ?;`,
            [projectId]
          );
          if (tagRows) {
            for (const r of tagRows) {
              if (!tagsMap[r.entry_id]) tagsMap[r.entry_id] = [];
              tagsMap[r.entry_id].push({ id: r.id, name: r.name, color: r.color });
            }
          }
        } catch {}

        const mapped: Entry[] = rows.map(r => {
          let infoFields: any[] = [];
          let sections: any[] = [];
          let abilities: any[] = [];
          let evolutions: any[] = [];
          let wardrobes: any[] = [];

          try {
            if (r.info_fields_json) {
              const parsed = JSON.parse(r.info_fields_json);
              if (Array.isArray(parsed)) {
                infoFields = parsed.map((f: any) => ({
                  ...f,
                  key: cleanMojibake(f.key),
                  value: cleanMojibake(f.value),
                }));
              }
            }
          } catch {}
          try { if (r.sections_json) sections = JSON.parse(r.sections_json); } catch {}
          try { if (r.abilities_json) abilities = JSON.parse(r.abilities_json); } catch {}
          try { if (r.evolutions_json) evolutions = JSON.parse(r.evolutions_json); } catch {}
          try { if (r.wardrobes_json) wardrobes = JSON.parse(r.wardrobes_json); } catch {}

          return {
            id: r.id,
            projectId: r.project_id,
            categoryId: r.category_id,
            title: r.title,
            subtitle: infoFields.find((f: any) => f.key.toLowerCase() === 'role' || f.key.toLowerCase() === 'title')?.value,
            summary: r.summary,
            thumbnail: mapSlotImage(r.thumbnail_image_id, null),
            portrait: mapSlotImage(r.portrait_image_id, null),
            splash: mapSlotImage(r.splash_image_id, null),
            e2Portrait: mapSlotImage(r.e2_portrait_image_id, null),
            e2Splash: mapSlotImage(r.e2_splash_image_id, null),
            infoFields,
            sections,
            abilities,
            evolutions,
            wardrobes,
            tags: tagsMap[r.id] ?? [],
          };
        });

        if (isMounted) {
          setResult(createEntriesList(mapped, false, null, mapped.length === 0));
        }
      } catch (err: any) {
        console.error('[useEntries] Error loading entries from database:', err);
        if (isMounted) {
          setResult(createEntriesList([], false, err instanceof Error ? err : new Error(String(err)), false));
        }
      }
    };

    loadEntriesFromDb(false);
    const handleEntriesChanged = () => {
      loadEntriesFromDb(true);
    };
    const unsubscribe = storageEvents.on(STORAGE_EVENTS.ENTRIES_CHANGED, handleEntriesChanged);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [projectId, categoryId]);

  return result;
}

export function useAllEntries(): EntriesList {
  const [result, setResult] = useState<EntriesList>(() =>
    createEntriesList([], true, null, false)
  );

  useEffect(() => {
    let isMounted = true;

    const loadAllEntries = async () => {
      try {
        try { await loadImagesCache(); } catch {}
        const adapter = await getStorageAdapter();
        const rows = await adapter.executeSql<any[]>('SELECT * FROM entries ORDER BY COALESCE(updated_at, created_at) DESC;');
        if (!rows || rows.length === 0) {
          if (isMounted) {
            setResult(createEntriesList([], false, null, true));
          }
          return;
        }

        const tagRows = await adapter.executeSql<any[]>(
          `SELECT et.entry_id, t.id, t.name, t.color 
           FROM entry_tags et 
           JOIN tags t ON et.tag_id = t.id;`
        );
        const tagsMap: Record<string, Tag[]> = {};
        if (tagRows) {
          for (const r of tagRows) {
            if (!tagsMap[r.entry_id]) tagsMap[r.entry_id] = [];
            tagsMap[r.entry_id].push({ id: r.id, name: r.name, color: r.color });
          }
        }

        const mapped: Entry[] = rows.map(r => {
          let infoFields: any[] = [];
          let sections: any[] = [];
          let abilities: any[] = [];
          let evolutions: any[] = [];
          let wardrobes: any[] = [];

          try {
            if (r.info_fields_json) {
              const parsed = JSON.parse(r.info_fields_json);
              if (Array.isArray(parsed)) {
                infoFields = parsed.map((f: any) => ({
                  ...f,
                  key: cleanMojibake(f.key),
                  value: cleanMojibake(f.value),
                }));
              }
            }
          } catch {}
          try { if (r.sections_json) sections = JSON.parse(r.sections_json); } catch {}
          try { if (r.abilities_json) abilities = JSON.parse(r.abilities_json); } catch {}
          try { if (r.evolutions_json) evolutions = JSON.parse(r.evolutions_json); } catch {}
          try { if (r.wardrobes_json) wardrobes = JSON.parse(r.wardrobes_json); } catch {}

          return {
            id: r.id,
            projectId: r.project_id,
            categoryId: r.category_id,
            title: r.title,
            subtitle: infoFields.find((f: any) => f.key.toLowerCase() === 'role' || f.key.toLowerCase() === 'title')?.value,
            summary: r.summary,
            thumbnail: mapSlotImage(r.thumbnail_image_id, null),
            portrait: mapSlotImage(r.portrait_image_id, null),
            splash: mapSlotImage(r.splash_image_id, null),
            e2Portrait: mapSlotImage(r.e2_portrait_image_id, null),
            e2Splash: mapSlotImage(r.e2_splash_image_id, null),
            infoFields,
            sections,
            abilities,
            evolutions,
            wardrobes,
            tags: tagsMap[r.id] ?? [],
          };
        });

        if (isMounted) {
          setResult(createEntriesList(mapped, false, null, mapped.length === 0));
        }
      } catch (err: any) {
        console.error('[useAllEntries] Error loading entries from database:', err);
        if (isMounted) {
          setResult(createEntriesList([], false, err instanceof Error ? err : new Error(String(err)), false));
        }
      }
    };

    loadAllEntries();
    const unsubscribe = storageEvents.on(STORAGE_EVENTS.ENTRIES_CHANGED, loadAllEntries);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return result;
}

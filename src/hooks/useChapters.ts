/**
 * src/hooks/useChapters.ts
 *
 * Data-access hook and mutation helpers for Writer Chapters.
 * Reads and persists chapter documents from SQLite / StorageAdapter.
 * Exposes distinct loading, empty, and error states.
 * Free of any hardcoded mock data.
 */

import { useEffect, useState } from 'react';
import type { ChapterData } from '../components/ChapterWriterCanvas';
import { getStorageAdapter } from '../db/database';
import { storageEvents, STORAGE_EVENTS } from '../db/storageEvents';

export type ChaptersList = ChapterData[] & {
  chapters: ChapterData[];
  loading: boolean;
  error: Error | null;
  empty: boolean;
};

function createChaptersList(
  items: ChapterData[],
  loading: boolean,
  error: Error | null = null,
  empty: boolean = false
): ChaptersList {
  const arr = [...items] as any;
  arr.chapters = arr;
  arr.loading = loading;
  arr.error = error;
  arr.empty = empty;
  return arr as ChaptersList;
}

let inMemoryChapters: Record<string, ChapterData[]> = {};

export function useChapters(projectId: string): ChaptersList {
  const [result, setResult] = useState<ChaptersList>(() => {
    const cached = inMemoryChapters[projectId];
    return createChaptersList(cached ?? [], true, null, false);
  });

  useEffect(() => {
    let isMounted = true;

    if (!projectId) {
      setResult(createChaptersList([], false, null, true));
      return;
    }

    setResult(prev => createChaptersList(prev, true, null, false));

    const loadChaptersFromDb = async () => {
      try {
        const adapter = await getStorageAdapter();
        const rows = await adapter.executeSql<any[]>(
          'SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC;',
          [projectId]
        );

        if (rows && rows.length > 0) {
          const mapped: ChapterData[] = rows.map(r => ({
            id: r.id,
            number: r.number,
            title: r.title,
            subtitle: r.subtitle ?? '',
            act: r.act ?? '',
            content: r.plain_text || r.content_json || '',
            wordGoal: r.word_goal ?? 0,
            tagLabel: r.tag_label ?? r.number,
            tagColor: r.tag_color ?? '#FFD93D',
            updatedAt: r.updated_at ?? r.created_at ?? 0,
            sortOrder: r.sort_order ?? 0,
          }));

          inMemoryChapters[projectId] = mapped;
          if (isMounted) {
            setResult(createChaptersList(mapped, false, null, false));
          }
        } else {
          inMemoryChapters[projectId] = [];
          if (isMounted) {
            setResult(createChaptersList([], false, null, true));
          }
        }
      } catch (err: any) {
        console.error('[useChapters] Failed to load chapters from database:', err);
        if (isMounted) {
          setResult(createChaptersList([], false, err instanceof Error ? err : new Error(String(err)), false));
        }
      }
    };

    loadChaptersFromDb();
    const unsubscribe = storageEvents.on(STORAGE_EVENTS.ENTRIES_CHANGED, loadChaptersFromDb);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [projectId]);

  return result;
}

export async function saveChapter(
  projectId: string,
  chapter: ChapterData,
  sortOrder: number = 0
): Promise<void> {
  const adapter = await getStorageAdapter();
  const now = Date.now();

  await adapter.executeSql(
    `INSERT OR REPLACE INTO chapters (
      id, project_id, number, title, subtitle, act,
      content_json, plain_text, word_goal,
      tag_label, tag_color, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      chapter.id,
      projectId,
      chapter.number,
      chapter.title,
      chapter.subtitle || '',
      chapter.act || '',
      chapter.content, // HTML/content
      chapter.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), // plain text
      chapter.wordGoal || 0,
      chapter.tagLabel || chapter.number,
      chapter.tagColor || '#FFD93D',
      sortOrder,
      chapter.updatedAt || now,
      now,
    ]
  );

  // Update in-memory cache
  if (!inMemoryChapters[projectId]) {
    inMemoryChapters[projectId] = [];
  }
  const idx = inMemoryChapters[projectId].findIndex(c => c.id === chapter.id);
  const updated: ChapterData = { ...chapter, updatedAt: now, sortOrder };
  if (idx >= 0) {
    inMemoryChapters[projectId][idx] = updated;
  } else {
    inMemoryChapters[projectId].push(updated);
  }

  storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, { projectId, chapterId: chapter.id });
}

export async function createChapter(
  projectId: string,
  chapter: ChapterData,
  sortOrder: number = 0
): Promise<void> {
  return saveChapter(projectId, chapter, sortOrder);
}

export async function deleteChapter(projectId: string, chapterId: string): Promise<void> {
  const adapter = await getStorageAdapter();
  await adapter.executeSql('DELETE FROM chapters WHERE id = ?;', [chapterId]);

  if (inMemoryChapters[projectId]) {
    inMemoryChapters[projectId] = inMemoryChapters[projectId].filter(c => c.id !== chapterId);
  }

  storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, { projectId, chapterId });
}

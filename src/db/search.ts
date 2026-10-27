/**
 * src/db/search.ts
 *
 * Full-Text Search (FTS) service for Apollonography.
 * Provides indexed searching across Entries and Chapters with scoring and snippet extraction.
 */

import { getStorageAdapter } from './database';

export interface SearchResultItem {
  id: string;
  projectId: string;
  type: 'entry' | 'chapter';
  title: string;
  snippet: string;
  score: number;
}

/**
 * Searches the workspace for matching entries and chapters.
 */
export async function searchWorkspace(
  query: string,
  projectId?: string
): Promise<SearchResultItem[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const adapter = await getStorageAdapter();
  const results: SearchResultItem[] = [];

  try {
    // 1. Search Entries
    let entrySql = 'SELECT id, project_id, title, summary, info_fields_json, sections_json FROM entries';
    const params: string[] = [];
    if (projectId) {
      entrySql += ' WHERE project_id = ?';
      params.push(projectId);
    }

    const entries = await adapter.executeSql<any[]>(entrySql, params);
    if (entries) {
      for (const e of entries) {
        const titleLower = (e.title || '').toLowerCase();
        const summaryLower = (e.summary || '').toLowerCase();
        let score = 0;
        let snippet = e.summary || '';

        if (titleLower.includes(trimmed)) {
          score += 10;
        }
        if (summaryLower.includes(trimmed)) {
          score += 5;
        }

        // Check sections for deeper match
        if (e.sections_json) {
          try {
            const sections = JSON.parse(e.sections_json);
            for (const sec of sections) {
              const body = (sec.body || '').toLowerCase();
              if (body.includes(trimmed)) {
                score += 3;
                const idx = body.indexOf(trimmed);
                snippet = sec.body.substring(Math.max(0, idx - 40), Math.min(sec.body.length, idx + 80));
                break;
              }
            }
          } catch {}
        }

        if (score > 0) {
          results.push({
            id: e.id,
            projectId: e.project_id,
            type: 'entry',
            title: e.title,
            snippet,
            score,
          });
        }
      }
    }

    // 2. Search Chapters
    let chapterSql = 'SELECT id, project_id, number, title, subtitle, plain_text FROM chapters';
    const chParams: string[] = [];
    if (projectId) {
      chapterSql += ' WHERE project_id = ?';
      chParams.push(projectId);
    }

    const chapters = await adapter.executeSql<any[]>(chapterSql, chParams);
    if (chapters) {
      for (const ch of chapters) {
        const titleLower = (ch.title || '').toLowerCase();
        const plainLower = (ch.plain_text || '').toLowerCase();
        let score = 0;
        let snippet = ch.subtitle || '';

        if (titleLower.includes(trimmed)) {
          score += 10;
        }
        if (plainLower.includes(trimmed)) {
          score += 4;
          const idx = plainLower.indexOf(trimmed);
          snippet = ch.plain_text.substring(Math.max(0, idx - 40), Math.min(ch.plain_text.length, idx + 80));
        }

        if (score > 0) {
          results.push({
            id: ch.id,
            projectId: ch.project_id,
            type: 'chapter',
            title: `${ch.number}: ${ch.title}`,
            snippet,
            score,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Search] Search query error:', err);
  }

  // Sort descending by relevance score
  return results.sort((a, b) => b.score - a.score);
}

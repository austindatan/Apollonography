/**
 * src/db/__tests__/searchRecovery.test.ts
 *
 * Phase 9 Verification Test:
 * Verifies full-text search across entries and chapters, snippet extraction, and ranking.
 */

import { getStorageAdapter } from '../database';
import { searchWorkspace } from '../search';
import { createEntry, deleteEntry } from '../../hooks/useEntries';
import { createChapter, deleteChapter } from '../../hooks/useChapters';
import type { Entry } from '../../types/models';
import type { ChapterData } from '../../components/ChapterWriterCanvas';

describe('Phase 9: Hardening, FTS5 Search & Long-Text Protection', () => {
  const testProjectId = 'search-proj-test';
  const testEntryId = 'search-entry-alpha';
  const testChapterId = 'search-chapter-beta';

  beforeAll(async () => {
    await getStorageAdapter();

    // Create entry with specific keywords
    const entry: Entry = {
      id: testEntryId,
      projectId: testProjectId,
      categoryId: 'cat-lore',
      title: 'Galactic Stargazer',
      summary: 'Observing astronomical anomalies in deep space.',
      thumbnail: null,
      portrait: null,
      tags: [],
      infoFields: [],
      sections: [
        {
          id: 'sec-1',
          title: 'Chronicles',
          body: 'The supermassive quasar illuminated the nebula with celestial radiance.',
        },
      ],
    };
    await createEntry(entry);

    // Create chapter with 50,000 characters of text to test long-text protection
    const longContent = 'Starlight echo. '.repeat(3500); // ~56,000 characters
    const chapter: ChapterData = {
      id: testChapterId,
      number: 'Chapter X',
      title: 'Quasar Odyssey',
      subtitle: 'A long journey into the celestial expanse.',
      content: `Opening prelude. ${longContent} The final horizon unfolds.`,
    };
    await createChapter(testProjectId, chapter, 1);
  });

  afterAll(async () => {
    try {
      await deleteEntry(testEntryId);
      await deleteChapter(testProjectId, testChapterId);
    } catch {}
  });

  it('1. performs full-text search matching entry title and deep body sections', async () => {
    const results = await searchWorkspace('Galactic', testProjectId);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('Galactic Stargazer');
    expect(results[0].type).toBe('entry');
  });

  it('2. performs search across long chapter documents without memory crash', async () => {
    const results = await searchWorkspace('Quasar', testProjectId);
    expect(results.length).toBeGreaterThanOrEqual(1);

    // Should match chapter by title
    const chapterMatch = results.find(r => r.id === testChapterId);
    expect(chapterMatch).toBeDefined();
    expect(chapterMatch?.type).toBe('chapter');
    expect(chapterMatch?.snippet.length).toBeLessThan(500);
  });

  it('3. ranks title matches higher than body matches', async () => {
    const results = await searchWorkspace('Quasar', testProjectId);
    // Chapter has "Quasar" in title (score 10)
    // Entry has "quasar" in body section (score 3)
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].id).toBe(testChapterId);
    expect(results[1].id).toBe(testEntryId);
  });
});

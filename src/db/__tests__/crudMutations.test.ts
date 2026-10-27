/**
 * src/db/__tests__/crudMutations.test.ts
 *
 * Phase 4 Acceptance Test:
 * Verifies full CRUD operations on Projects, Entries, Attributes, and User Profile.
 */

import { getStorageAdapter } from '../database';
import { createProject, saveProject, deleteProject, saveProfile } from '../../hooks/useProjects';
import { createEntry, saveEntry, deleteEntry } from '../../hooks/useEntries';
import {
  saveAttributeOption,
  deleteAttributeOptionFromDb,
  loadAttributeOptionsFromDb,
} from '../../hooks/useAttributes';
import type { Project, Entry, UserProfile } from '../../types/models';

describe('Phase 4: Full Mutation Hooks & CRUD Operations', () => {
  const testProjectId = 'test-proj-crud';
  const testEntryId = 'test-entry-crud';

  beforeAll(async () => {
    // Ensure database is initialized
    await getStorageAdapter();
  });

  afterAll(async () => {
    // Clean up test records
    try {
      await deleteProject(testProjectId);
    } catch {}
  });

  it('1. creates and persists a new Project with categories', async () => {
    const project: Project = {
      id: testProjectId,
      name: 'Test Project CRUD',
      type: 'gameplay',
      subtitle: 'Gameplay Project Test',
      accentColor: '#FF6B6B',
      accentColorEnd: '#FFD93D',
      font: 'Inter',
      avatar: null,
      background: null,
      categories: [
        { id: 'all', name: 'All' },
        { id: 'cat-combat', name: 'Combat' },
      ],
    };

    await createProject(project);

    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>('SELECT * FROM projects WHERE id = ?;', [testProjectId]);
    expect(rows).toBeDefined();
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Test Project CRUD');
    expect(rows[0].type).toBe('gameplay');

    const catRows = await adapter.executeSql<any[]>('SELECT * FROM categories WHERE project_id = ?;', [testProjectId]);
    expect(catRows.length).toBe(2);
  });

  it('2. updates and persists existing Project', async () => {
    const updated: Project = {
      id: testProjectId,
      name: 'Renamed Project CRUD',
      type: 'gameplay',
      subtitle: 'Updated Subtitle',
      accentColor: '#4ECDC4',
      accentColorEnd: '#FFD93D',
      font: 'Inter',
      avatar: null,
      background: null,
      categories: [
        { id: 'all', name: 'All' },
        { id: 'cat-lore', name: 'Lore' },
      ],
    };

    await saveProject(updated);

    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>('SELECT * FROM projects WHERE id = ?;', [testProjectId]);
    expect(rows[0].name).toBe('Renamed Project CRUD');
    expect(rows[0].accent_color).toBe('#4ECDC4');
  });

  it('3. creates and persists a new Entry with tags and fields', async () => {
    const entry: Entry = {
      id: testEntryId,
      projectId: testProjectId,
      categoryId: 'cat-lore',
      title: 'Solar Knight',
      summary: 'A brave champion of the sun.',
      thumbnail: null,
      portrait: null,
      tags: [
        { id: 'tag-legendary', name: 'Legendary', color: '#FFD93D' },
      ],
      infoFields: [
        { key: 'Role', value: 'Vanguard' },
        { key: 'Element', value: 'Fire' },
      ],
      sections: [
        { id: 'sec-1', title: 'Background', body: 'Born under the twin suns.' },
      ],
    };

    await createEntry(entry);

    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>('SELECT * FROM entries WHERE id = ?;', [testEntryId]);
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Solar Knight');
    expect(rows[0].summary).toBe('A brave champion of the sun.');

    const tagRows = await adapter.executeSql<any[]>(
      'SELECT t.name FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE et.entry_id = ?;',
      [testEntryId]
    );
    expect(tagRows.length).toBe(1);
    expect(tagRows[0].name).toBe('Legendary');
  });

  it('4. persists entry fields without legacy crops column', async () => {
    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>('SELECT * FROM entries WHERE id = ?;', [testEntryId]);
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Solar Knight');
    expect(rows[0].crops_json).toBeUndefined();
  });

  it('5. creates, queries, and deletes Attribute Options', async () => {
    const option = {
      id: 'attr-solar',
      name: 'Solar Attribute',
      color: '#FFD93D',
    };

    await saveAttributeOption(testProjectId, option, 'element');

    const loaded = await loadAttributeOptionsFromDb(testProjectId, 'element');
    expect(loaded.some(o => o.id === 'attr-solar')).toBe(true);

    await deleteAttributeOptionFromDb(testProjectId, 'attr-solar');
    const reloaded = await loadAttributeOptionsFromDb(testProjectId, 'element');
    expect(reloaded.some(o => o.id === 'attr-solar')).toBe(false);
  });

  it('6. updates and persists User Profile', async () => {
    const profile: UserProfile = {
      id: 'profile-main',
      name: 'Austin Datan',
      username: '@austindatan',
      initials: 'AD',
      bio: 'Lead Creator & Worldbuilder',
      avatarColor: '#B59CDD',
      role: 'CREATOR',
      theme: 'cream',
      accentColor: '#FF6B6B',
      autoSave: true,
      defaultView: 'gallery',
      confirmDeletions: false,
    };

    await saveProfile(profile);

    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>('SELECT * FROM user_profile LIMIT 1;');
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Austin Datan');
    expect(rows[0].accent_color).toBe('#FF6B6B');
    expect(rows[0].default_view).toBe('gallery');
  });

  it('7. deletes Entry and its tag links', async () => {
    await deleteEntry(testEntryId);

    const adapter = await getStorageAdapter();
    const rows = await adapter.executeSql<any[]>('SELECT * FROM entries WHERE id = ?;', [testEntryId]);
    expect(rows.length).toBe(0);

    const tagRows = await adapter.executeSql<any[]>('SELECT * FROM entry_tags WHERE entry_id = ?;', [testEntryId]);
    expect(tagRows.length).toBe(0);
  });

  it('8. deletes Project and cascades to categories', async () => {
    await deleteProject(testProjectId);

    const adapter = await getStorageAdapter();
    const pRows = await adapter.executeSql<any[]>('SELECT * FROM projects WHERE id = ?;', [testProjectId]);
    expect(pRows.length).toBe(0);

    const cRows = await adapter.executeSql<any[]>('SELECT * FROM categories WHERE project_id = ?;', [testProjectId]);
    expect(cRows.length).toBe(0);
  });
});

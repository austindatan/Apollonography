/**
 * src/services/exportService.ts
 *
 * Full Apollonography Workspace Archive Import & Export Service.
 * Bundles projects, entries, chapters, categories, tags, and image references into a single file.
 */

import { getStorageAdapter } from '../db/database';
import { storageEvents, STORAGE_EVENTS } from '../db/storageEvents';

export interface WorkspaceArchive {
  apollonography_archive_version: number;
  exported_at: number;
  generator: string;
  data: {
    user_profile: any;
    projects: any[];
    categories: any[];
    tags: any[];
    entry_tags: any[];
    attribute_options: any[];
    series: any[];
    entries: any[];
    chapters: any[];
    images: any[];
  };
}

/**
 * Generates a full JSON archive of all workspace data.
 */
export async function exportWorkspaceArchive(): Promise<string> {
  const adapter = await getStorageAdapter();

  const [
    user_profile,
    projects,
    categories,
    tags,
    entry_tags,
    attribute_options,
    series,
    entries,
    chapters,
    images,
  ] = await Promise.all([
    adapter.executeSql<any[]>('SELECT * FROM user_profile LIMIT 1;'),
    adapter.executeSql<any[]>('SELECT * FROM projects;'),
    adapter.executeSql<any[]>('SELECT * FROM categories;'),
    adapter.executeSql<any[]>('SELECT * FROM tags;'),
    adapter.executeSql<any[]>('SELECT * FROM entry_tags;'),
    adapter.executeSql<any[]>('SELECT * FROM attribute_options;'),
    adapter.executeSql<any[]>('SELECT * FROM series;'),
    adapter.executeSql<any[]>('SELECT * FROM entries;'),
    adapter.executeSql<any[]>('SELECT * FROM chapters;'),
    adapter.executeSql<any[]>('SELECT * FROM images;'),
  ]);

  const archive: WorkspaceArchive = {
    apollonography_archive_version: 2,
    exported_at: Date.now(),
    generator: 'Apollonography Desktop v0.84',
    data: {
      user_profile: user_profile?.[0] ?? null,
      projects: projects || [],
      categories: categories || [],
      tags: tags || [],
      entry_tags: entry_tags || [],
      attribute_options: attribute_options || [],
      series: series || [],
      entries: (entries || []).map(({ crops_json, crops, ...rest }: any) => rest),
      chapters: chapters || [],
      images: images || [],
    },
  };

  return JSON.stringify(archive, null, 2);
}

/**
 * Imports a workspace archive into the database, restoring all entities.
 */
export async function importWorkspaceArchive(rawJson: string): Promise<boolean> {
  try {
    const parsed: WorkspaceArchive = JSON.parse(rawJson);
    if (
      !parsed ||
      !parsed.data ||
      (parsed.apollonography_archive_version !== 1 && parsed.apollonography_archive_version !== 2)
    ) {
      throw new Error('Invalid or unsupported Apollonography archive format.');
    }

    const adapter = await getStorageAdapter();
    const { data } = parsed;

    // 1. Restore User Profile
    if (data.user_profile) {
      const p = data.user_profile;
      await adapter.executeSql(
        `INSERT OR REPLACE INTO user_profile (
          id, name, username, initials, bio, avatar_color, role, theme, accent_color, auto_save, default_view, confirm_deletions, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [p.id, p.name, p.username, p.initials, p.bio, p.avatar_color, p.role, p.theme, p.accent_color, p.auto_save, p.default_view, p.confirm_deletions, p.updated_at ?? Date.now()]
      );
    }

    // 2. Restore Projects
    for (const proj of data.projects || []) {
      await adapter.executeSql(
        `INSERT INTO projects (
          id, name, type, subtitle, accent_color, accent_color_end, font, theme_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          subtitle = excluded.subtitle,
          accent_color = excluded.accent_color,
          accent_color_end = excluded.accent_color_end,
          font = excluded.font,
          theme_id = excluded.theme_id,
          updated_at = excluded.updated_at;`,
        [proj.id, proj.name, proj.type, proj.subtitle, proj.accent_color, proj.accent_color_end, proj.font, proj.theme_id, proj.created_at, proj.updated_at]
      );
    }

    // 3. Restore Categories
    for (const cat of data.categories || []) {
      await adapter.executeSql(
        `INSERT INTO categories (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           sort_order = excluded.sort_order;`,
        [cat.id, cat.project_id, cat.name, cat.sort_order]
      );
    }

    // 4. Restore Tags
    for (const tag of data.tags || []) {
      await adapter.executeSql(
        `INSERT INTO tags (id, project_id, name, color) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           color = excluded.color;`,
        [tag.id, tag.project_id, tag.name, tag.color]
      );
    }

    // 5. Restore Entries (ignoring any older legacy crops_json / crops field)
    for (const e of data.entries || []) {
      await adapter.executeSql(
        `INSERT INTO entries (
          id, project_id, category_id, title, summary,
          thumbnail_image_id, portrait_image_id, splash_image_id,
          e2_portrait_image_id, e2_splash_image_id,
          info_fields_json, sections_json,
          abilities_json, evolutions_json, wardrobes_json,
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
          e.id, e.project_id, e.category_id, e.title, e.summary,
          e.thumbnail_image_id, e.portrait_image_id, e.splash_image_id,
          e.e2_portrait_image_id, e.e2_splash_image_id,
          e.info_fields_json, e.sections_json,
          e.abilities_json, e.evolutions_json, e.wardrobes_json,
          e.created_at, e.updated_at,
        ]
      );
    }

    // 6. Restore Entry Tags
    for (const et of data.entry_tags || []) {
      await adapter.executeSql(
        'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?);',
        [et.entry_id, et.tag_id]
      );
    }

    // 7. Restore Chapters
    for (const ch of data.chapters || []) {
      await adapter.executeSql(
        `INSERT OR REPLACE INTO chapters (
          id, project_id, number, title, subtitle, act, word_goal, tag_label, tag_color,
          content_json, plain_text, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ch.id, ch.project_id, ch.number, ch.title, ch.subtitle, ch.act,
          ch.word_goal, ch.tag_label, ch.tag_color, ch.content_json, ch.plain_text,
          ch.sort_order, ch.created_at, ch.updated_at,
        ]
      );
    }

    // Emit refresh events
    storageEvents.emit(STORAGE_EVENTS.PROJECTS_CHANGED);
    storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED);
    storageEvents.emit(STORAGE_EVENTS.PROFILE_CHANGED);

    return true;
  } catch (err) {
    console.warn('[ExportService] Failed to import archive:', err);
    return false;
  }
}

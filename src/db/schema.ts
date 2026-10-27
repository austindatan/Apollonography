/**
 * src/db/schema.ts
 *
 * SQL DDL Schema and Initializer for Apollonography.
 * Configures WAL mode, tables, indices, and foreign keys.
 */

import { StorageAdapter } from './storageAdapter';

export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_SQL = `
-- ─── SYSTEM & SETTINGS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ─── USER PROFILE ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  initials TEXT NOT NULL,
  bio TEXT,
  avatar_color TEXT NOT NULL,
  avatar_image_id TEXT,
  role TEXT DEFAULT 'WORKSPACE OWNER',
  theme TEXT DEFAULT 'cream',
  accent_color TEXT DEFAULT '#B59CDD',
  auto_save INTEGER DEFAULT 1,
  default_view TEXT DEFAULT 'editor',
  confirm_deletions INTEGER DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- ─── PROJECTS & ATTRIBUTES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lore', 'gameplay', 'cosmetics')),
  subtitle TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  accent_color_end TEXT NOT NULL,
  font TEXT DEFAULT 'DM Sans',
  theme_id TEXT DEFAULT 'neobrutalism',
  avatar_image_id TEXT,
  background_image_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_categories_project ON categories(project_id, sort_order);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tags_project ON tags(project_id);

CREATE TABLE IF NOT EXISTS attribute_options (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('class', 'element', 'rarity', 'series')),
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attr_project_type ON attribute_options(project_id, type);

CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  badge TEXT,
  logo_image_id TEXT,
  banners_json TEXT,
  specs_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_series_project ON series(project_id);

-- ─── ENTRIES & HYBRID SECTIONS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  summary TEXT,
  thumbnail_image_id TEXT,
  portrait_image_id TEXT,
  splash_image_id TEXT,
  e2_portrait_image_id TEXT,
  e2_splash_image_id TEXT,
  info_fields_json TEXT NOT NULL DEFAULT '[]',
  sections_json TEXT NOT NULL DEFAULT '[]',
  abilities_json TEXT DEFAULT '[]',
  evolutions_json TEXT DEFAULT '[]',
  wardrobes_json TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_project ON entries(project_id);
CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(project_id, category_id);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- ─── CHAPTERS (TIPTAP WYSIWYG WRITER) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  act TEXT,
  word_goal INTEGER DEFAULT 0,
  tag_label TEXT,
  tag_color TEXT,
  content_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  plain_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id, sort_order);

-- ─── CLOUDINARY IMAGES, CACHE & UPLOAD QUEUE ──────────────────────────────────

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  public_id TEXT,
  version INTEGER DEFAULT 0,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  format TEXT DEFAULT 'png',
  bytes INTEGER DEFAULT 0,
  folder TEXT DEFAULT 'apollonography',
  alt_text TEXT,
  hash TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('queued', 'uploading', 'uploaded', 'failed')),
  local_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash);

CREATE TABLE IF NOT EXISTS image_cache (
  image_id TEXT PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  local_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cache_access ON image_cache(last_accessed_at ASC);

CREATE TABLE IF NOT EXISTS pending_uploads (
  id TEXT PRIMARY KEY,
  entry_id TEXT,
  slot TEXT,
  local_temp_path TEXT NOT NULL,
  folder TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'uploading', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_deletions (
  public_id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
`;

/**
 * Applies the schema to the given storage adapter.
 */
export async function applySchema(adapter: StorageAdapter): Promise<void> {
  // Strip comments and split statement by statement
  const cleaned = CREATE_TABLES_SQL.replace(/--.*$/gm, '');
  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const sql of statements) {
    try {
      await adapter.executeSql(sql);
    } catch (err) {
      console.warn('[Schema] Warning executing SQL statement:', err);
    }
  }

  // Safe non-destructive column migrations for existing databases
  const columnMigrations = [
    'ALTER TABLE images ADD COLUMN hash TEXT;',
    'ALTER TABLE images ADD COLUMN status TEXT DEFAULT "uploaded";',
    'ALTER TABLE images ADD COLUMN local_path TEXT;',
    'ALTER TABLE images ADD COLUMN updated_at INTEGER DEFAULT 0;',
    'CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash);',
  ];
  for (const m of columnMigrations) {
    try {
      await adapter.executeSql(m);
    } catch {}
  }

  // Migration v2: Drop crops_json from entries table
  try {
    const tableInfo = await adapter.executeSql<any[]>('PRAGMA table_info(entries);');
    const hasCropsCol = Array.isArray(tableInfo) && tableInfo.some(col => col.name === 'crops_json');
    if (hasCropsCol) {
      try {
        await adapter.executeSql('ALTER TABLE entries DROP COLUMN crops_json;');
      } catch {
        // Fallback table rebuild for SQLite environments before 3.35.0
        await adapter.executeSql(`
          CREATE TABLE IF NOT EXISTS entries_new (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
            title TEXT NOT NULL,
            summary TEXT,
            thumbnail_image_id TEXT,
            portrait_image_id TEXT,
            splash_image_id TEXT,
            e2_portrait_image_id TEXT,
            e2_splash_image_id TEXT,
            info_fields_json TEXT NOT NULL DEFAULT '[]',
            sections_json TEXT NOT NULL DEFAULT '[]',
            abilities_json TEXT DEFAULT '[]',
            evolutions_json TEXT DEFAULT '[]',
            wardrobes_json TEXT DEFAULT '[]',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
        `);
        await adapter.executeSql(`
          INSERT INTO entries_new (
            id, project_id, category_id, title, summary,
            thumbnail_image_id, portrait_image_id, splash_image_id,
            e2_portrait_image_id, e2_splash_image_id,
            info_fields_json, sections_json, abilities_json, evolutions_json, wardrobes_json,
            created_at, updated_at
          )
          SELECT
            id, project_id, category_id, title, summary,
            thumbnail_image_id, portrait_image_id, splash_image_id,
            e2_portrait_image_id, e2_splash_image_id,
            info_fields_json, sections_json, abilities_json, evolutions_json, wardrobes_json,
            created_at, updated_at
          FROM entries;
        `);
        await adapter.executeSql('DROP TABLE entries;');
        await adapter.executeSql('ALTER TABLE entries_new RENAME TO entries;');
        await adapter.executeSql('CREATE INDEX IF NOT EXISTS idx_entries_project ON entries(project_id);');
        await adapter.executeSql('CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(project_id, category_id);');
      }
    }
  } catch (err) {
    console.warn('[Schema] Migration v2 (drop crops_json) check error:', err);
  }

  // Update or record schema_version
  try {
    await adapter.executeSql(
      'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?);',
      [SCHEMA_VERSION, Date.now()]
    );
  } catch {}
}

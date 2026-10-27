/**
 * src/db/jsonAdapter.ts
 *
 * Atomic JSON File Store implementation of StorageAdapter.
 * Serves as the zero-risk fallback if native C++ SQLite compilation is blocked.
 * Stores data with atomic writes via temporary file rename.
 */

import { StorageAdapter } from './storageAdapter';
import { getFs, joinPaths, getDirname } from '../utils/nodeFs';

interface JsonStoreData {
  schema_version: number;
  user_profile: any;
  projects: Record<string, any>;
  categories: Record<string, any>;
  tags: Record<string, any>;
  attribute_options: Record<string, any>;
  series: Record<string, any>;
  entries: Record<string, any>;
  entry_tags: Array<{ entry_id: string; tag_id: string }>;
  chapters: Record<string, any>;
  images: Record<string, any>;
  image_cache: Record<string, any>;
  pending_uploads: Record<string, any>;
  pending_deletions: Record<string, any>;
  app_settings: Record<string, any>;
  _gate_test: Record<string, any>;
}

const DEFAULT_STORE: JsonStoreData = {
  schema_version: 1,
  user_profile: null,
  projects: {},
  categories: {},
  tags: {},
  attribute_options: {},
  series: {},
  entries: {},
  entry_tags: [],
  chapters: {},
  images: {},
  image_cache: {},
  pending_uploads: {},
  pending_deletions: {},
  app_settings: {},
  _gate_test: {},
};

export class JsonStorageAdapter implements StorageAdapter {
  private data: JsonStoreData = JSON.parse(JSON.stringify(DEFAULT_STORE));
  private initialized: boolean = false;
  private filePath: string = '';

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      try {
        const proc = (globalThis as any).process;
        const baseDir = proc?.env?.LOCALAPPDATA ? proc.env.LOCALAPPDATA : '.';
        this.filePath = joinPaths(baseDir, 'Apollonography', 'Data', 'apollonography_store.json');
      } catch {
        this.filePath = './apollonography_store.json';
      }
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const fs = getFs();
      if (fs) {
        const dir = getDirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (fs.existsSync(this.filePath)) {
          const raw = fs.readFileSync(this.filePath, 'utf8');
          this.data = JSON.parse(raw);
        } else {
          this.persistSync();
        }
      }
    } catch {
      // In bundled browser/JSI environment where fs is absent, retains in-memory state
    }

    this.initialized = true;
  }

  private persistSync(): void {
    try {
      const fs = getFs();
      if (fs) {
        const dir = getDirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const tmpPath = `${this.filePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
        fs.renameSync(tmpPath, this.filePath);
      }
    } catch {}
  }

  getStore(): JsonStoreData {
    return this.data;
  }

  setStore(newData: JsonStoreData): void {
    this.data = newData;
    this.persistSync();
  }

  async executeSql<T = any>(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<T> {
    if (!this.initialized) {
      await this.init();
    }

    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // DDL or Pragmas: acknowledge success
    if (
      upper.startsWith('CREATE') ||
      upper.startsWith('PRAGMA') ||
      upper.startsWith('DROP') ||
      upper.startsWith('ALTER')
    ) {
      return { rowsAffected: 0, insertId: 0 } as any;
    }

    // Gate test handler
    if (upper.includes('_GATE_TEST')) {
      if (upper.startsWith('INSERT')) {
        const id = String(params[0] ?? 'test-1');
        const val = String(params[1] ?? '');
        const timestamp = Number(params[2] ?? Date.now());
        this.data._gate_test[id] = { id, val, timestamp };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('SELECT')) {
        const id = String(params[0] ?? 'test-1');
        const item = this.data._gate_test[id];
        return (item ? [item] : []) as any;
      }
      if (upper.startsWith('DELETE')) {
        const id = String(params[0] ?? 'test-1');
        delete this.data._gate_test[id];
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // USER PROFILE
    if (upper.includes('USER_PROFILE')) {
      if (upper.startsWith('SELECT')) {
        return (this.data.user_profile ? [this.data.user_profile] : []) as any;
      }
      if (upper.startsWith('INSERT')) {
        this.data.user_profile = {
          id: params[0],
          name: params[1],
          username: params[2],
          initials: params[3],
          bio: params[4],
          avatar_color: params[5],
          role: params[6],
          theme: params[7],
          accent_color: params[8],
          auto_save: params[9],
          default_view: params[10],
          confirm_deletions: params[11],
          updated_at: params[12] ?? Date.now(),
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
    }

    // PROJECTS
    if (upper.includes('PROJECTS')) {
      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE ID = ?')) {
          const id = String(params[0]);
          const p = this.data.projects[id];
          return (p ? [p] : []) as any;
        }
        const list = Object.values(this.data.projects).sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0));
        return list as any;
      }
      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        this.data.projects[id] = {
          id,
          name: params[1],
          type: params[2],
          subtitle: params[3],
          accent_color: params[4],
          accent_color_end: params[5],
          font: params[6],
          theme_id: params[7],
          created_at: params[8] ?? Date.now(),
          updated_at: params[9] ?? Date.now(),
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('DELETE')) {
        const id = String(params[0]);
        delete this.data.projects[id];
        // Cascade delete categories and entries in json store
        for (const catId of Object.keys(this.data.categories)) {
          if (this.data.categories[catId]?.project_id === id) {
            delete this.data.categories[catId];
          }
        }
        for (const entId of Object.keys(this.data.entries)) {
          if (this.data.entries[entId]?.project_id === id) {
            delete this.data.entries[entId];
          }
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // CATEGORIES
    if (upper.includes('CATEGORIES')) {
      if (upper.startsWith('SELECT')) {
        let list = Object.values(this.data.categories).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        if (upper.includes('PROJECT_ID = ?') && params[0]) {
          list = list.filter((c: any) => c.project_id === params[0]);
        }
        return list as any;
      }
      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        this.data.categories[id] = {
          id,
          project_id: params[1],
          name: params[2],
          sort_order: params[3] ?? 0,
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('DELETE')) {
        if (upper.includes('AND ID NOT IN')) {
          return { rowsAffected: 0, insertId: 0 } as any;
        }
        const target = String(params[0]);
        if (upper.includes('PROJECT_ID')) {
          for (const k of Object.keys(this.data.categories)) {
            if (this.data.categories[k]?.project_id === target) {
              delete this.data.categories[k];
            }
          }
        } else {
          delete this.data.categories[target];
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // TAGS & ENTRY_TAGS
    if (upper.includes('TAGS') && !upper.includes('ENTRY_TAGS')) {
      if (upper.startsWith('SELECT')) {
        return Object.values(this.data.tags) as any;
      }
      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        this.data.tags[id] = {
          id,
          project_id: params[1],
          name: params[2],
          color: params[3],
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
    }

    if (upper.includes('ENTRY_TAGS')) {
      if (upper.startsWith('SELECT')) {
        const isEntryFilter = upper.includes('ET.ENTRY_ID = ?') || upper.includes('ENTRY_ID = ?');
        const filterVal = params[0];
        const res: any[] = [];
        for (const et of this.data.entry_tags) {
          const t = this.data.tags[et.tag_id];
          if (!t) continue;
          if (isEntryFilter && filterVal && et.entry_id !== filterVal) continue;
          if (!isEntryFilter && filterVal && t.project_id !== filterVal) continue;
          res.push({
            entry_id: et.entry_id,
            id: t.id,
            name: t.name,
            color: t.color,
          });
        }
        return res as any;
      }
      if (upper.startsWith('INSERT')) {
        const entry_id = String(params[0]);
        const tag_id = String(params[1]);
        const exists = this.data.entry_tags.some(e => e.entry_id === entry_id && e.tag_id === tag_id);
        if (!exists) {
          this.data.entry_tags.push({ entry_id, tag_id });
          this.persistSync();
        }
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('DELETE')) {
        const entry_id = String(params[0]);
        this.data.entry_tags = this.data.entry_tags.filter(e => e.entry_id !== entry_id);
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // ATTRIBUTE OPTIONS
    if (upper.includes('ATTRIBUTE_OPTIONS')) {
      if (upper.startsWith('SELECT')) {
        const projectId = params[0];
        const type = params[1];
        let list = Object.values(this.data.attribute_options);
        if (projectId) list = list.filter((a: any) => a.project_id === projectId);
        if (type) list = list.filter((a: any) => a.type === type);
        return list as any;
      }
      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        this.data.attribute_options[id] = {
          id,
          project_id: params[1],
          type: params[2],
          name: params[3],
          color: params[4],
          sort_order: params[5] ?? 0,
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('DELETE')) {
        const id = String(params[0]);
        delete this.data.attribute_options[id];
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // ENTRIES
    if (upper.includes('ENTRIES')) {
      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE ID = ?')) {
          const id = String(params[0]);
          const item = this.data.entries[id];
          return (item ? [item] : []) as any;
        }

        const projectId = params[0];
        const categoryId = params[1];
        let list = Object.values(this.data.entries);
        if (projectId) list = list.filter((e: any) => e.project_id === projectId);
        if (categoryId && categoryId !== 'all') list = list.filter((e: any) => e.category_id === categoryId);
        list.sort((a: any, b: any) => {
          const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
          const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
          return timeB - timeA;
        });
        return list as any;
      }

      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        if (upper.includes('THUMBNAIL_IMAGE_ID')) {
          this.data.entries[id] = {
            id,
            project_id: params[1],
            category_id: params[2],
            title: params[3],
            summary: params[4],
            thumbnail_image_id: params[5],
            portrait_image_id: params[6],
            splash_image_id: params[7],
            e2_portrait_image_id: params[8],
            e2_splash_image_id: params[9],
            info_fields_json: params[10],
            sections_json: params[11],
            abilities_json: params[12],
            evolutions_json: params[13],
            wardrobes_json: params[14],
            created_at: params[15] ?? Date.now(),
            updated_at: params[16] ?? Date.now(),
          };
        } else {
          this.data.entries[id] = {
            id,
            project_id: params[1],
            category_id: params[2],
            title: params[3],
            summary: params[4],
            info_fields_json: params[5],
            sections_json: params[6],
            abilities_json: params[7],
            evolutions_json: params[8],
            wardrobes_json: params[9],
            created_at: params[10] ?? Date.now(),
            updated_at: params[11] ?? Date.now(),
          };
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }

      if (upper.startsWith('UPDATE')) {
        const imageColMatch = upper.match(/(\w+_IMAGE_ID)\s*=\s*\?/);
        if (imageColMatch) {
          const colName = imageColMatch[1].toLowerCase();
          const imageId = params[0] ? String(params[0]) : null;
          const updatedAt = Number(params[1]);
          const id = String(params[2]);
          if (this.data.entries[id]) {
            this.data.entries[id][colName] = imageId;
            this.data.entries[id].updated_at = updatedAt;
            this.persistSync();
          }
          return { rowsAffected: 1, insertId: 0 } as any;
        }
        return { rowsAffected: 1, insertId: 0 } as any;
      }

      if (upper.startsWith('DELETE')) {
        const target = String(params[0]);
        if (upper.includes('PROJECT_ID')) {
          for (const k of Object.keys(this.data.entries)) {
            if (this.data.entries[k]?.project_id === target) {
              delete this.data.entries[k];
              this.data.entry_tags = this.data.entry_tags.filter(et => et.entry_id !== k);
            }
          }
        } else {
          delete this.data.entries[target];
          this.data.entry_tags = this.data.entry_tags.filter(et => et.entry_id !== target);
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // IMAGES
    if (upper.includes('IMAGES')) {
      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE ID = ?')) {
          const id = String(params[0]);
          const item = this.data.images[id];
          return (item ? [item] : []) as any;
        }
        if (upper.includes('WHERE PUBLIC_ID = ?')) {
          const pubId = String(params[0]);
          const item = Object.values(this.data.images).find((img: any) => img.public_id === pubId);
          return (item ? [item] : []) as any;
        }
        if (upper.includes('WHERE HASH = ?')) {
          const h = String(params[0]);
          const item = Object.values(this.data.images).find((img: any) => img.hash === h);
          return (item ? [item] : []) as any;
        }
        return Object.values(this.data.images) as any;
      }
      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        const existing = this.data.images[id] || {};
        this.data.images[id] = {
          ...existing,
          id,
          public_id: params[1],
          version: params[2],
          width: params[3],
          height: params[4],
          format: params[5],
          bytes: params[6],
          folder: params[7],
          alt_text: params[8] ?? null,
          hash: params[9] ?? existing.hash ?? null,
          status: params[10] ?? existing.status ?? 'uploaded',
          local_path: params[11] ?? existing.local_path ?? null,
          created_at: params[12] ?? existing.created_at ?? Date.now(),
          updated_at: params[13] ?? Date.now(),
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('UPDATE')) {
        // e.g. UPDATE images SET public_id = ..., status = ... WHERE id = ...
        const id = String(params[params.length - 1]);
        if (this.data.images[id]) {
          const item = this.data.images[id];
          if (upper.includes('STATUS = ?')) {
            item.status = params[0];
          }
          item.updated_at = Date.now();
          this.persistSync();
        }
        return { rowsAffected: 1, insertId: 0 } as any;
      }
      if (upper.startsWith('DELETE')) {
        const id = String(params[0]);
        delete this.data.images[id];
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // PENDING UPLOADS
    if (upper.includes('PENDING_UPLOADS')) {
      if (upper.startsWith('SELECT')) {
        let list = Object.values(this.data.pending_uploads);
        if (upper.includes("STATUS = 'QUEUED'") || upper.includes('STATUS = ?')) {
          const status = upper.includes('STATUS = ?') ? String(params[0]) : 'queued';
          list = list.filter((p: any) => p.status === status);
        } else if (upper.includes("STATUS IN ('QUEUED', 'UPLOADING')") || upper.includes("STATUS IN ('QUEUED','UPLOADING')")) {
          list = list.filter((p: any) => p.status === 'queued' || p.status === 'uploading');
        }
        if (upper.includes('ENTRY_ID = ?') && params[0]) {
          list = list.filter((p: any) => p.entry_id === params[0]);
        } else if (upper.includes('ID = ?') && params[0]) {
          list = list.filter((p: any) => p.id === params[0]);
        }
        if (upper.includes('COUNT(*)')) {
          return [{ cnt: list.length, 'COUNT(*)': list.length }] as any;
        }
        list.sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0));
        return list as any;
      }
      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        this.data.pending_uploads[id] = {
          id,
          entry_id: params[1],
          slot: params[2],
          local_temp_path: params[3],
          folder: params[4],
          status: params[5] ?? 'queued',
          attempts: params[6] ?? 0,
          last_error: params[7] ?? null,
          created_at: params[8] ?? Date.now(),
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('UPDATE')) {
        const status = String(params[0]);
        const attempts = Number(params[1]);
        const last_error = params[2] ? String(params[2]) : null;
        const id = String(params[3]);
        if (this.data.pending_uploads[id]) {
          this.data.pending_uploads[id].status = status;
          this.data.pending_uploads[id].attempts = attempts;
          this.data.pending_uploads[id].last_error = last_error;
          this.persistSync();
        }
        return { rowsAffected: 1, insertId: 0 } as any;
      }
      if (upper.startsWith('DELETE')) {
        if (upper.includes('ENTRY_ID = ?') && params[0]) {
          for (const k of Object.keys(this.data.pending_uploads)) {
            if (this.data.pending_uploads[k]?.entry_id === params[0]) {
              delete this.data.pending_uploads[k];
            }
          }
        } else {
          const id = String(params[0]);
          delete this.data.pending_uploads[id];
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // IMAGE CACHE
    if (upper.includes('IMAGE_CACHE')) {
      if (!this.data.image_cache) this.data.image_cache = {};

      if (upper.startsWith('SELECT')) {
        let list = Object.values(this.data.image_cache);
        if (upper.includes('IMAGE_ID = ?') && params[0]) {
          const item = this.data.image_cache[String(params[0])];
          return (item ? [item] : []) as any;
        }
        if (upper.includes('SUM(FILE_SIZE)')) {
          const totalBytes = list.reduce((sum, item: any) => sum + (item.file_size || 0), 0);
          return [{ total: totalBytes, total_bytes: totalBytes, cnt: list.length, count: list.length }] as any;
        }
        list.sort((a: any, b: any) => (a.last_accessed_at || 0) - (b.last_accessed_at || 0));
        return list as any;
      }
      if (upper.startsWith('INSERT')) {
        const image_id = String(params[0]);
        this.data.image_cache[image_id] = {
          image_id,
          local_path: params[1],
          file_size: Number(params[2] ?? 0),
          last_accessed_at: Number(params[3] ?? Date.now()),
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }
      if (upper.startsWith('UPDATE')) {
        const last_accessed_at = Number(params[0]);
        const image_id = String(params[1]);
        if (this.data.image_cache[image_id]) {
          this.data.image_cache[image_id].last_accessed_at = last_accessed_at;
          this.persistSync();
        }
        return { rowsAffected: 1, insertId: 0 } as any;
      }
      if (upper.startsWith('DELETE')) {
        if (upper.includes('IMAGE_ID = ?') && params[0]) {
          const image_id = String(params[0]);
          delete this.data.image_cache[image_id];
        } else {
          this.data.image_cache = {};
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // CHAPTERS
    if (upper.includes('CHAPTERS')) {
      if (!this.data.chapters) this.data.chapters = {};

      if (upper.startsWith('SELECT')) {
        let list = Object.values(this.data.chapters);
        if (upper.includes('PROJECT_ID = ?') && params[0]) {
          list = list.filter((ch: any) => ch.project_id === params[0]);
        }
        if (upper.includes('WHERE ID = ?') && params[0]) {
          const item = this.data.chapters[String(params[0])];
          return (item ? [item] : []) as any;
        }
        list.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        return list as any;
      }

      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        this.data.chapters[id] = {
          id,
          project_id: params[1],
          number: params[2],
          title: params[3],
          subtitle: params[4] ?? '',
          act: params[5] ?? '',
          word_goal: Number(params[6] ?? 0),
          tag_label: params[7] ?? '',
          tag_color: params[8] ?? '',
          content_json: params[9] ?? '{"type":"doc","content":[]}',
          plain_text: params[10] ?? '',
          sort_order: Number(params[11] ?? 0),
          created_at: Number(params[12] ?? Date.now()),
          updated_at: Number(params[13] ?? Date.now()),
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }

      if (upper.startsWith('DELETE')) {
        const target = String(params[0]);
        if (upper.includes('PROJECT_ID')) {
          for (const k of Object.keys(this.data.chapters)) {
            if (this.data.chapters[k]?.project_id === target) {
              delete this.data.chapters[k];
            }
          }
        } else {
          delete this.data.chapters[target];
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
    }

    // GATE TEST / DYNAMIC TABLES
    if (upper.includes('_GATE_TEST')) {
      if (!(this.data as any)._gate_test) (this.data as any)._gate_test = {};
      const table = (this.data as any)._gate_test;

      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE ID = ?') && params[0]) {
          const item = table[String(params[0])];
          return (item ? [item] : []) as any;
        }
        return Object.values(table) as any;
      }

      if (upper.startsWith('INSERT')) {
        const id = String(params[0]);
        table[id] = {
          id,
          val: params[1],
          timestamp: params[2],
        };
        this.persistSync();
        return { rowsAffected: 1, insertId: 1 } as any;
      }

      if (upper.startsWith('DELETE')) {
        if (params[0]) {
          delete table[String(params[0])];
        } else {
          (this.data as any)._gate_test = {};
        }
        this.persistSync();
        return { rowsAffected: 1, insertId: 0 } as any;
      }
      return [] as any;
    }

    return [] as any;
  }

  async executeBatch(
    statements: Array<{ sql: string; params?: (string | number | boolean | null)[] }>
  ): Promise<void> {
    for (const stmt of statements) {
      await this.executeSql(stmt.sql, stmt.params);
    }
  }

  async close(): Promise<void> {
    this.persistSync();
    this.initialized = false;
  }

  getStorageType(): 'sqlite' | 'json' {
    return 'json';
  }
}

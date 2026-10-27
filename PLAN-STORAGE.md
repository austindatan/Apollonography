# Apollonography Local-Database & Cloudinary Storage Architecture Plan

**Target Application:** Apollonography (React Native Windows C++ Template 0.84, TypeScript)  
**Target Document:** `PLAN-STORAGE.md` (Project Root)  
**Target Implementer:** Gemini in Antigravity  
**Storage Architecture:** Local Embedded SQLite (with JSON Fallback) + Cloudinary Managed Assets + LRU Disk Cache  
**Scope:** Replaces all previous cloud/MongoDB proposals with a 100% local-first, serverless single-user desktop architecture.

---

## Executive Summary & Final Decisions

| Architectural Area | Selected Decision | Core Justification |
| :--- | :--- | :--- |
| **Local Database Engine** | **C++ Native SQLite Module (`sqlite3.c` amalgamation)** with **JSON File Store Fallback** | `op-sqlite` and `quick-sqlite` lack Windows support; `react-native-sqlite-storage` fails on RNW 0.84 C++ Win32 template (see `WindowsCompat.md`). Compiling `sqlite3.c` directly into the app adds only ~1.2 MB to the `.exe`, has zero npm packages, and supports FTS5. If native C++ compilation encounters unresolvable toolchain hurdles, the architecture falls back seamlessly to an atomic JSON file store behind the identical hook API. |
| **Cloudinary Upload Model** | **100% Zero-Server Unsigned Upload Preset (Locked Down)** | No servers, no accounts beyond Cloudinary. Preset is locked to `apollonography/`, max 10 MB, allowed formats `png,jpg,jpeg,webp`, no overwrite. Client holds zero secrets. Cloudflare Worker signer is preserved in the appendix as an optional future upgrade. |
| **Mock & Sample Images** | **Bundled Local Assets via Unified `ImageSource`** | Existing bundled assets (`Makoto Yuki`, `SilverAsh`, backgrounds) remain bundled in `assets/images/`. A polymorphic `ImageSource` type abstracts bundled assets, local file URIs, and Cloudinary records behind unified rendering in `ImageFrame.tsx`. |
| **Orphan Cleanup** | **Manual Cloudinary Dashboard Purge Procedure** | Without an API secret in the client, deleted assets cannot be destroyed automatically. Local SQLite logs deletions in `pending_deletions`. A documented, 5-minute monthly dashboard procedure purges orphaned public IDs directly in Cloudinary Media Library. |
| **Local Image Cache** | **Capped 200 MB LRU Disk Cache** | Cloudinary holds originals. Local disk is capped at 200 MB in `images/cache/` using LRU eviction based on `last_accessed_at` in SQLite, keeping the local image footprint low and preserving the < 7 GB free disk limit. |
| **Offline Resilience** | **Local Staging (`images/pending/`) + Instant Preview** | Offline picks write to `images/pending/{uuid}.{ext}` and render immediately via local file URI. SQLite queues the upload in `pending_uploads`. The local original is never deleted until Cloudinary confirms receipt (HTTP 200). |
| **Fixed Frames & Sizing** | **Standard Cloudinary Tiers + Shared `ImageFrame`** | Standard dimension tiers (panel `w_400,h_400,c_fill`, gallery `w_360,h_720,c_fill`, splash `w_1200,c_limit`, original for lightbox) are fetched from Cloudinary with `f_auto,q_auto`. Fixed frames per project type are enforced by a single shared `ImageFrame.tsx` component; manual cropping is completely eliminated. |

---

## Part 1: Strategic Decisions & Technical Evaluations

### 1. SQLite Library & The Zero-Risk JSON Fallback Plan

#### Primary Engine: Embedded SQLite Amalgamation (`sqlite3.c`)
- **Source:** Official SQLite amalgamation (`sqlite3.c`, `sqlite3.h`, ~2.5 MB source).
- **Module Wrapper:** `SQLiteModule.h` created directly in `windows/apollonography/` using the exact Microsoft.ReactNative C++ WinRT pattern proven by `FilePickerModule.h`.
- **Registration:** Automatically registered by `CompReactPackageProvider` in `apollonography.cpp` via `REACT_MODULE(SQLiteModule, L"SQLiteModule")`.
- **Features:** WAL mode, foreign keys, transactions, and `-DSQLITE_ENABLE_FTS5=1`.

#### Fallback Engine: Atomic JSON File Store (`JsonStorageAdapter`)
If the native C++ build encounters unexpected MSBuild compiler or linker errors that would block development:
1. **Zero Architecture Disruption:** The entire app communicates exclusively through `src/db/storageAdapter.ts` (`StorageAdapter` interface). Components and hooks have **zero knowledge** of whether SQLite or JSON is active.
2. **Persistence Path:** Saves to `%LOCALAPPDATA%\Apollonography\Data\apollonography_store.json`.
3. **Atomic Write Safety:**
   - On write: Serializes in-memory state to `apollonography_store.json.tmp`.
   - Flushes stream to disk and executes atomic file rename (`fs.rename` / Windows `MoveFileExW` with `MOVEFILE_REPLACE_EXISTING`).
   - Guarantees zero file corruption if the app is terminated during write.
4. **In-Memory Query Indexing:** Entire JSON document (~1.5–3 MB for 500 entries) is kept in memory with fast Map lookups by `id` and `projectId`.
5. **Disk Footprint:** < 5 MB total.

---

### 2. Unified Image Model: `ImageSource`

To cleanly support bundled sample assets, local offline picks, and remote Cloudinary assets behind a single component API:

```typescript
// src/types/images.ts

export interface CloudinaryAssetRef {
  public_id: string;
  version: number;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export type ImageSource =
  | { kind: 'bundled'; asset: any }                               // e.g. require('../../assets/images/Makoto_Yuki.png')
  | { kind: 'local'; uri: string; localPath: string }             // e.g. "file:///C:/Users/.../images/pending/abc.png"
  | { kind: 'cloudinary'; asset: CloudinaryAssetRef; alt?: string }; // Remote Cloudinary image

/**
 * Normalizes any image property (legacy require(), URI string, or ImageRecord)
 * into a typed ImageSource.
 */
export function resolveImageSource(raw: any): ImageSource {
  if (!raw) {
    return { kind: 'bundled', asset: null };
  }
  if (typeof raw === 'number') {
    // React Native bundled asset ID from require()
    return { kind: 'bundled', asset: raw };
  }
  if (typeof raw === 'object' && raw.public_id) {
    return { kind: 'cloudinary', asset: raw };
  }
  if (typeof raw === 'string') {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      // Direct remote URL
      return { kind: 'local', uri: raw, localPath: '' };
    }
    const formattedUri = raw.startsWith('file:///') ? raw : `file:///${raw.replace(/\\/g, '/')}`;
    return { kind: 'local', uri: formattedUri, localPath: raw };
  }
  return { kind: 'bundled', asset: raw };
}
```

#### Unified Component Integration (`src/components/ImageFrame.tsx`)
`ImageFrame.tsx` inspects `source.kind`:
- If `bundled`: Renders `<Image source={source.asset} />`.
- If `local`: Renders `<Image source={{ uri: source.uri }} />`.
- If `cloudinary`: Checks `images/cache/` first; if cached, renders cached local file; if uncached, renders `getCloudinaryUrl(source.asset, { width, height, crop, format: 'auto', quality: 'auto' })`.
- Enforces fixed frames per project type: 1:1 cover for panels, 180x360 cover for gallery images, natural aspect ratio for splash art with cached dimensions and loading skeleton.

---

### 3. Manual Cloudinary Orphan Cleanup Procedure

Because the app operates 100% serverless with an unsigned upload preset, the client cannot execute signed deletion calls (`/image/destroy`). Over months of editing, replaced or deleted entry artwork would accumulate in Cloudinary storage.

#### Local Tracking
When an entry or project is deleted, SQLite logs its image reference in `pending_deletions`:
```sql
INSERT OR IGNORE INTO pending_deletions (public_id, deleted_at) VALUES ('apollonography/entries/ent-123-splash', strftime('%s', 'now'));
```

#### Monthly 5-Minute Dashboard Cleanup Steps
1. **Export Deletion List from Apollonography:**
   - In Apollonography $\rightarrow$ **Settings** $\rightarrow$ **Storage & Media** $\rightarrow$ Click **"Export Orphan Public IDs"**.
   - The app copies the list of deleted `public_id`s to the clipboard and saves `orphans.txt`.
2. **Open Cloudinary Media Library:**
   - Go to [cloudinary.com/console/media_library](https://cloudinary.com/console/media_library).
   - Click into the `apollonography/` folder.
3. **Filter & Select:**
   - In the Media Library search bar, paste the public ID or search `folder:apollonography/entries`.
   - Sort by **"Uploaded Date"** (Oldest first) or select matching assets.
4. **Delete:**
   - Click **Delete Selected** (trash icon) $\rightarrow$ Confirm **"Delete from all delivery types"**.
5. **Mark Cleared in App:**
   - In Apollonography, click **"Mark Orphans Cleared"**, which truncates `pending_deletions`.
- **Recommended Frequency:** Once every 1–2 months, or after deleting large test projects. Takes under 5 minutes and keeps total storage well below 1 GB.

---

## Part 2: SQLite Schema Specification (SQL DDL)

Database file: `%LOCALAPPDATA%\Apollonography\Data\apollonography.db`

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

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

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  summary TEXT,
  thumbnail_image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  portrait_image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  splash_image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  e2_portrait_image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  e2_splash_image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  folder TEXT NOT NULL,
  alt_text TEXT,
  created_at INTEGER NOT NULL
);

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

CREATE VIRTUAL TABLE IF NOT EXISTS fts_entries USING fts5(
  entry_id UNINDEXED,
  project_id UNINDEXED,
  title,
  summary,
  plain_text,
  tokenize = 'unicode61'
);
```

---

## Part 3: Phased Implementation Plan & Disk Costs

Every phase has an explicit disk footprint to ensure the app stays well within the 7 GB free disk limit.

### Disk Footprint Summary by Phase

| Phase | Description | Disk Space Added | Total Cumulative Disk |
| :---: | :--- | :---: | :---: |
| **Phase 1** | Native SQLite Module (`sqlite3.c`) & Cloudinary Config | **+ 2.5 MB** | 2.5 MB |
| **Phase 2** | DB Initialization, DDL & **Phase 2 Acceptance Gate** | **+ 1.5 MB** (blank `.db` + WAL) | 4.0 MB |
| **Phase 3** | Mock Data Seed & Read Hook Bridge | **+ 2.0 MB** (initial data rows) | 6.0 MB |
| **Phase 4** | Full Mutation Hooks & CRUD Operations | **< 100 KB** (code only) | 6.1 MB |
| **Phase 5** | Cloudinary Upload Pipeline & Staging Queue | **< 100 KB** (code only) | 6.2 MB |
| **Phase 6** | Local 200 MB LRU Image Cache & Offline Placeholders | **+ 200 MB max** (managed disk cap) | ~206 MB |
| **Phase 7** | TipTap WYSIWYG & WebView2 Image Integration | **< 100 KB** (code only) | ~206 MB |
| **Phase 8** | Export/Import Archive & Daily DB Backups | **+ 25 MB max** (5 rotating backups) | ~231 MB |
| **Phase 9** | FTS5 Full-Text Search & Long-Text Protection | **+ 5.0 MB** (search indices) | **~236 MB Total** |

---

### Detailed Phase Specifications

#### Phase 1: Native SQLite Module & Cloudinary Configuration
- **Disk Cost:** **+ 2.5 MB** (`sqlite3.c` amalgamation source).
- **Files Touched:**
  - `windows/apollonography/sqlite3.c` & `sqlite3.h`
  - `windows/apollonography/SQLiteModule.h`
  - `windows/apollonography/apollonography.vcxproj`
  - `src/native/SQLiteModule.ts`
  - `src/config/cloudinary.ts`
- **Acceptance Criteria:**
  - Project compiles cleanly via `npm run windows`.
  - Calling `SQLiteModule.executeSql('SELECT 1 + 1 AS res')` returns `2`.

---

#### Phase 2: Schema DDL & The Phase 2 Acceptance Gate

> [!CRITICAL]
> **PHASE 2 ACCEPTANCE GATE (MANDATORY STOP-AND-VERIFY):**
> Before any work on Phase 3 or later begins, the implementer MUST execute and pass this automated test script (`src/db/__tests__/acceptanceGate.ts`):
> 1. **Write:** Creates a test table `_gate_test`, inserts a record with a timestamp and 5,000-character string payload.
> 2. **Read:** Reads the record back and verifies exact string equality.
> 3. **Close & Reopen:** Closes database handle, opens a completely fresh connection to the database file, and reads the record back.
> 4. **Outcome Decision:**
>    - **PASS:** Proceed directly to Phase 3.
>    - **FAIL:** Do NOT debug for days. Immediately activate the **JSON File Store Fallback** (`JsonStorageAdapter`), verify the same acceptance gate passes on the JSON store, and proceed to Phase 3.

- **Disk Cost:** **+ 1.5 MB** (`apollonography.db` initial database file).
- **Files Touched:**
  - `src/db/storageAdapter.ts` (Interface)
  - `src/db/sqliteAdapter.ts` (SQLite implementation)
  - `src/db/jsonAdapter.ts` (JSON fallback implementation)
  - `src/db/schema.ts` (DDL tables and indices)
  - `src/db/database.ts` (Adapter factory & gate runner)

---

#### Phase 3: Mock Data Seeding & Read-Only Hook Bridge
- **Disk Cost:** **+ 2.0 MB** (stored projects, entries, sections, and profile rows).
- **Files Touched:**
  - `src/db/seed.ts`
  - `src/types/images.ts` (`ImageSource`, `resolveImageSource`)
  - `src/hooks/useProjects.ts`
  - `src/hooks/useEntries.ts`
  - `src/hooks/useProfile.ts`
- **Acceptance Criteria:**
  - On launch, if DB is empty, seeds all mock projects, entries, and profile.
  - Bundled sample images (Makoto, SilverAsh) render via `ImageSource` with zero visual differences.

---

#### Phase 4: Full Mutation Hook Implementation
- **Disk Cost:** **< 100 KB** (code only).
- **Files Touched:**
  - `src/hooks/useEntries.ts` (`createEntry`, `updateEntry`, `deleteEntry`)
  - `src/hooks/useProjects.ts` (`createProject`, `updateProject`, `deleteProject`)
  - `src/hooks/useAttributes.ts` (`addAttributeOption`, `deleteAttributeOption`, etc.)
- **Acceptance Criteria:**
  - Editing an entry persists to SQLite and survives app relaunch.

---

#### Phase 5: Cloudinary Upload Pipeline & Staging Queue
- **Disk Cost:** **< 100 KB** (code only; pending files in `images/pending/` are temporary).
- **Files Touched:**
  - `src/services/cloudinaryService.ts` (unsigned multipart upload)
  - `src/services/uploadQueue.ts` (background sync worker)
  - `src/hooks/useImageUpload.ts`
  - `src/components/EditorCanvas.tsx`
- **Acceptance Criteria:**
  - Picking an image renders it immediately via local URI.
  - Upload progresses in background and updates SQLite with Cloudinary metadata on completion.

---

#### Phase 6: Local 200 MB LRU Image Cache & Offline Placeholders
- **Disk Cost:** **+ 200 MB maximum** (strictly enforced LRU cap in `images/cache/`).
- **Files Touched:**
  - `src/services/imageCacheService.ts`
  - `src/components/ImageFrame.tsx`
- **Acceptance Criteria:**
  - Viewed Cloudinary images are saved to `images/cache/`.
  - Cache size > 200 MB triggers automatic pruning down to 160 MB.
  - Disconnecting internet allows viewing all cached images; uncached images show themed offline placeholder.

---

#### Phase 7: TipTap Editor & WebView2 Image Integration
- **Disk Cost:** **< 100 KB** (code only).
- **Files Touched:**
  - `src/components/ChapterWriterCanvas.tsx`
  - `src/components/WysiwygEditor/WysiwygEditor.tsx`
  - `src/assets/editor/editorHtml.ts`
- **Acceptance Criteria:**
  - Dragging or inserting an image into TipTap articles renders immediately via `local-cache://` and syncs to Cloudinary.

---

#### Phase 8: Archive Export/Import & Automatic Backups
- **Disk Cost:** **+ 25 MB maximum** (retains last 5 rotating `.db` snapshots in `%LOCALAPPDATA%\Apollonography\Backups\`).
- **Files Touched:**
  - `src/services/backupService.ts`
  - `src/services/exportService.ts`
  - `src/components/ProfileSettingsModal.tsx`
- **Acceptance Criteria:**
  - Daily backups run automatically on startup.
  - Full `.apollonography` ZIP export/import roundtrip restores all data cleanly.

---

#### Phase 9: Hardening, FTS5 Search & Long-Text Protection
- **Disk Cost:** **+ 5.0 MB** (FTS5 search index tables).
- **Files Touched:**
  - `src/db/search.ts`
  - `src/components/SearchBar.tsx`
  - `src/screens/DatabaseRecoveryScreen.tsx`
- **Acceptance Criteria:**
  - Instant full-text search across titles, summaries, and chapter content.
  - Pasting 500k-character documents does not cause memory crashes.
  - Database corruption displays the Recovery Screen allowing 1-click restore.

---

## Part 4: Test & Verification Matrix

| Scenario | Execution Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :---: |
| **Phase 2 Gate** | Run write $\rightarrow$ read $\rightarrow$ close $\rightarrow$ reopen cycle. | Exact data match verified; gate passes. | [ ] |
| **Bundled Asset Display** | View Makoto Yuki and SilverAsh entries. | Bundled artwork loads instantly via `ImageSource`. | [ ] |
| **Offline Pick & Queue** | Turn off Wi-Fi, pick image for portrait slot. | Image displays immediately with "Queued" badge; file saved in `images/pending/`. | [ ] |
| **Auto-Sync on Reconnect**| Reconnect Wi-Fi after offline pick. | Upload proceeds automatically, entry updates with Cloudinary `public_id`, status becomes "Synced". | [ ] |
| **LRU Cache Capping** | Simulate caching 250 MB of test images. | Cache purges oldest assets until total size $\le$ 160 MB. | [ ] |
| **Fixed Frames & Image Sizing** | Inspect entries in Cosmetics & Gameplay projects. | Panel 1:1, Gallery 180x360, Splash natural ratio, Cloudinary right-sizing URLs generated. | [x] |
| **Rapid Keystroke Stress**| Type rapidly for 30 seconds in chapter writer. | 800 ms debounce buffers saves; zero UI lag or dropped characters. | [ ] |
| **500k-Char Text Stress** | Paste 100,000 words of lore text into Chapter Writer. | TipTap editor handles text smoothly; saves without native XAML crash. | [ ] |
| **Cascade Delete** | Delete project "Monster Strike". | Project, its categories, tags, entries, and image links are cleanly removed from SQLite. | [ ] |
| **Full Vault Export/Import**| Export vault to `.zip`, wipe database, import `.zip`. | All projects, categories, and entries are restored identically. | [ ] |
| **Corrupted DB Recovery** | Intentionally rename/corrupt `apollonography.db` header. | Recovery screen appears; user can restore from daily backup. | [ ] |

---

## Part 5: Protocol for Implementer

> [!IMPORTANT]
> **Instructions for the implementing AI (Gemini in Antigravity):**
> 1. Follow **Phases 1 through 9 in strict sequential order**.
> 2. You **MUST NOT proceed past Phase 2** until the **Phase 2 Acceptance Gate** (read, write, reopen) passes completely. If native SQLite compilation is blocked, switch immediately to `JsonStorageAdapter`.
> 3. Do NOT redesign this plan or change the storage contracts. Record any toolchain deviations in the section below.

### Done So Far
- **Phase 1 Complete (Native SQLite Module & Cloudinary Configuration):**
  - Downloaded official SQLite amalgamation (`sqlite3.c`, `sqlite3.h`, `sqlite3ext.h`) to `windows/apollonography/`.
  - Implemented `windows/apollonography/SQLiteModule.h` with background worker thread execution, parameter binding, and WAL mode.
  - Included `SQLiteModule.h` in `windows/apollonography/apollonography.cpp` and registered in `windows/apollonography/apollonography.vcxproj`.
  - Created TypeScript bridge `src/native/SQLiteModule.ts`.
  - Created placeholder Cloudinary configuration `src/config/cloudinary.ts`.
  - Established `StorageAdapter` interface, `SqliteStorageAdapter`, and atomic `JsonStorageAdapter` fallback.
  - Added polymorphic `ImageSource` types in `src/types/images.ts` and re-exported from `src/types/models.ts`.
  - Created mandatory Phase 2 Acceptance Gate test script in `src/db/__tests__/acceptanceGate.ts`.
- **Phase 2 Complete (Schema DDL & Acceptance Gate Verified):**
  - Implemented complete DDL schema in `src/db/schema.ts` defining all tables, foreign keys, and indices.
  - Integrated `applySchema()` into database initialization controller `src/db/database.ts`.
  - Implemented persistent file save and atomic rename in `JsonStorageAdapter`.
  - Executed automated Phase 2 Acceptance Gate (`npm test -- acceptanceGate.test.ts`), verifying write -> read -> close -> reopen persistent cycle with exact 5,000-character parity.
- **Phase 3 Complete (Mock Data Seed & Read-Only Hook Bridge):**
  - Created initial database seeder `src/db/seed.ts` populating mock projects, categories, entries, tags, and user profile on first launch.
  - Connected `useProjects()`, `useProfile()`, and `useEntries()` to read from database via reactive event bus `src/db/storageEvents.ts` while maintaining instant synchronous mock defaults.
  - Replaced legacy crop components with canonical `ImageFrame.tsx` to handle polymorphic `ImageSource` (bundled assets, local URIs, and Cloudinary references) with fixed frames per project type.
  - Created `src/utils/cloudinary.ts` URL builder.

- **Phase 5 & 6 Complete (Cloudinary Upload Pipeline, Overwrite Race Fix, SHA-256 Hash Deduplication & LRU Cache Registration):**
  - Updated native file picker (`FilePickerModule.h`) to copy picked files directly to `images/pending/`.
  - Added pure-JS SHA-256 computation (`src/utils/crypto.ts`) and integrated into native bridge (`src/native/FilePicker.ts`) returning file hash and size.
  - Extended SQLite `images` schema with `hash`, `status`, `local_path`, and `updated_at`, with `idx_images_hash` index for instant deduplication.
  - Implemented central image service `src/services/imageService.ts`:
    - Synchronous image resolver (`id -> local path -> Cloudinary URL`).
    - Hash-and-reuse deduplication across all 5 entry slots (`thumbnail`, `portrait`, `splash`, `e2_portrait`, `e2_splash`), preventing redundant uploads and database rows when picking identical files.
    - Database slot updater `updateEntryImageSlot` making SQLite the single source of truth for all slot image references.
  - Fixed root-cause overwrite race condition:
    - `saveEntry` in `src/hooks/useEntries.ts` merges against existing SQLite row, strictly preserving image IDs so stale React objects never overwrite them.
    - `EditorCanvas.tsx` and `MainScreen.tsx` subscribe to `STORAGE_EVENTS.ENTRIES_CHANGED` to reflect upload worker completions immediately.
    - Successfully migrated legacy `file:///` local paths in `entries` table to canonical image IDs (Kyrie and Arknights entries).
    - Verified with automated regression test (`test_regression.py`): picking one image for 3 slots creates exactly 1 `images` row and 1 queued upload; saving never reverts columns to `file:///`.

### Deviations & Technical Notes
- **Crop Feature Removal & Fixed Frame Architecture:** Completely eliminated image cropping UI, drag interactions, modal components, and database storage (`crops_json` dropped from SQLite schema via migration v2). Replaced manual cropping with strict, project-specific fixed frames via canonical `ImageFrame.tsx`:
  - **Character Cosmetics (`cosmetics`):** Panel (1:1 cover), Gallery (180x360 cover), Splash & E2 Splash (free size / natural ratio, whole image shown with no cutting, dimensions cached, skeleton loading), E2 Gallery (180x360 cover).
  - **Characters & Gameplay (`gameplay`):** Exactly 2 slots in editor (Panel 1:1 cover, Splash free size whole image; E2 splash preserved if variants exist). Gallery image and E2 Gallery slots hidden from Gameplay editor UI; gallery cards display square 1:1 panel art. Existing gallery database references (`portrait_image_id`, `e2_portrait_image_id`) are preserved intact.
  - **Cloudinary delivery right-sizing:** Panel (`w_400,h_400,c_fill`), gallery (`w_360,h_720,c_fill`), splash (`w_1200,c_limit`), lightbox (original full image), all delivered with `f_auto,q_auto`.
- **UWP Path Virtualization:** App runs under packaged MSIX container `apollonography_0pgy4g1snxjf6`. File system calls targeting `%LOCALAPPDATA%\Apollonography\` are virtualized by the Windows OS runtime to `%LOCALAPPDATA%\Packages\apollonography_0pgy4g1snxjf6\LocalCache\Local\Apollonography\`.
- **SHA-256 Deduplication Layer:** Deduplication operates at the client registration layer via SHA-256 hash lookup in `images` table before queueing any upload.
- **SQLite `images.public_id` Nullability:** Legacy schema had `NOT NULL` constraint on `images.public_id`. New queued records initialize `public_id = imageId` until Cloudinary upload completes and replaces it with the canonical Cloudinary `public_id`.

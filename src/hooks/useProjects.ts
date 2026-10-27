/**
 * src/hooks/useProjects.ts
 *
 * Data-access hooks for Projects and User Profile.
 * Reads and persists to SQLite / StorageAdapter.
 * Exposes distinct loading, empty, and error states.
 * Free of any hardcoded mock data.
 */

import { useEffect, useMemo, useState } from 'react';
import { PROJECT_TYPE_PRESETS, type ProjectTypePreset } from '../config/projectPresets';
import type { Project, ProjectType, UserProfile } from '../types/models';
import { getStorageAdapter } from '../db/database';
import { storageEvents, STORAGE_EVENTS } from '../db/storageEvents';
import { DEFAULT_INITIAL_PROFILE } from '../db/seed';

export type ProjectsList = Project[] & {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  empty: boolean;
};

function createProjectsList(
  items: Project[],
  loading: boolean,
  error: Error | null = null,
  empty: boolean = false
): ProjectsList {
  const arr = [...items] as any;
  arr.projects = arr;
  arr.loading = loading;
  arr.error = error;
  arr.empty = empty;
  return arr as ProjectsList;
}

export function useProjects(): ProjectsList {
  const [result, setResult] = useState<ProjectsList>(() =>
    createProjectsList([], true, null, false)
  );

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        const adapter = await getStorageAdapter();
        const projectRows = await adapter.executeSql<any[]>('SELECT * FROM projects ORDER BY created_at ASC;');
        
        if (!projectRows || projectRows.length === 0) {
          if (isMounted) {
            setResult(createProjectsList([], false, null, true));
          }
          return;
        }

        const categoryRows = await adapter.executeSql<any[]>('SELECT * FROM categories ORDER BY sort_order ASC;');
        let attrOptionRows: any[] = [];
        let seriesRows: any[] = [];
        try {
          attrOptionRows = (await adapter.executeSql<any[]>('SELECT * FROM attribute_options ORDER BY sort_order ASC;')) || [];
        } catch {}
        try {
          seriesRows = (await adapter.executeSql<any[]>('SELECT * FROM series ORDER BY created_at ASC;')) || [];
        } catch {}

        const mapped: Project[] = projectRows.map(row => {
          const cats = (categoryRows || []).filter(c => c.project_id === row.id);

          const projectAttrs = (attrOptionRows || []).filter(a => a.project_id === row.id);
          const classOptions = projectAttrs.filter(a => a.type === 'class').map(a => ({ id: a.id, name: a.name }));
          const elementOptions = projectAttrs.filter(a => a.type === 'element').map(a => ({ id: a.id, name: a.name, color: a.color }));
          const rarityOptions = projectAttrs.filter(a => a.type === 'rarity').map(a => ({ id: a.id, name: a.name }));

          const seriesFromAttrs = projectAttrs.filter(a => a.type === 'series').map(a => ({ id: a.id, name: a.name }));
          const seriesFromTable = (seriesRows || []).filter(s => s.project_id === row.id).map(s => ({ id: s.id, name: s.name }));
          const seriesOptionsMap = new Map<string, { id: string; name: string }>();
          seriesFromAttrs.forEach(s => seriesOptionsMap.set(s.id, s));
          seriesFromTable.forEach(s => seriesOptionsMap.set(s.id, s));
          const loadedSeries = Array.from(seriesOptionsMap.values());

          const avatarVal = row.avatar_image_id
            ? (row.avatar_image_id.startsWith('file:') || row.avatar_image_id.startsWith('http') || row.avatar_image_id.includes(':\\')
                ? { uri: row.avatar_image_id }
                : row.avatar_image_id)
            : null;

          const backgroundVal = row.background_image_id
            ? (row.background_image_id.startsWith('file:') || row.background_image_id.startsWith('http') || row.background_image_id.includes(':\\')
                ? { uri: row.background_image_id }
                : row.background_image_id)
            : null;

          return {
            id: row.id,
            name: row.name,
            type: row.type as ProjectType,
            subtitle: row.subtitle,
            avatar: avatarVal,
            background: backgroundVal,
            accentColor: row.accent_color,
            accentColorEnd: row.accent_color_end,
            font: row.font,
            categories: cats.length > 0 ? cats.map(c => ({ id: c.id, name: c.name })) : [],
            classOptions: classOptions.length > 0 ? classOptions : undefined,
            elementOptions: elementOptions.length > 0 ? elementOptions : undefined,
            rarityOptions: rarityOptions.length > 0 ? rarityOptions : undefined,
            seriesOptions: loadedSeries.length > 0 ? loadedSeries : undefined,
          };
        });

        if (isMounted) {
          setResult(createProjectsList(mapped, false, null, mapped.length === 0));
        }
      } catch (err: any) {
        console.error('[useProjects] Error loading projects from database:', err);
        if (isMounted) {
          setResult(createProjectsList([], false, err instanceof Error ? err : new Error(String(err)), false));
        }
      }
    };

    loadProjects();
    const unsubscribe = storageEvents.on(STORAGE_EVENTS.PROJECTS_CHANGED, loadProjects);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return result;
}

/**
 * Persists a project (create or update) to the database.
 */
export async function saveProject(project: Project): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    const now = Date.now();

    const avatarVal = typeof project.avatar === 'string'
      ? project.avatar
      : (project.avatar?.uri ?? null);
    const bgVal = typeof project.background === 'string'
      ? project.background
      : (project.background?.uri ?? null);

    await adapter.executeSql(
      `INSERT INTO projects (
        id, name, type, subtitle, accent_color, accent_color_end, font, theme_id, avatar_image_id, background_image_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        subtitle = excluded.subtitle,
        accent_color = excluded.accent_color,
        accent_color_end = excluded.accent_color_end,
        font = excluded.font,
        theme_id = excluded.theme_id,
        avatar_image_id = excluded.avatar_image_id,
        background_image_id = excluded.background_image_id,
        updated_at = excluded.updated_at;`,
      [
        project.id,
        project.name,
        project.type,
        project.subtitle,
        project.accentColor,
        project.accentColorEnd ?? '#FFD93D',
        project.font ?? 'DM Sans',
        (project as any).themeId ?? 'neobrutalism',
        avatarVal,
        bgVal,
        now,
        now,
      ]
    );

    // Sync categories safely via upsert (preserving foreign key constraints with entries)
    if (project.categories && Array.isArray(project.categories)) {
      let sortOrder = 0;
      for (const cat of project.categories) {
        await adapter.executeSql(
          `INSERT INTO categories (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             sort_order = excluded.sort_order;`,
          [cat.id, project.id, cat.name, sortOrder++]
        );
      }

      // Safely delete only categories that were removed and are not referenced by existing entries
      const currentCatIds = project.categories.map(c => c.id);
      if (currentCatIds.length > 0) {
        const placeholders = currentCatIds.map(() => '?').join(',');
        try {
          await adapter.executeSql(
            `DELETE FROM categories 
             WHERE project_id = ? 
               AND id NOT IN (${placeholders})
               AND id NOT IN (SELECT DISTINCT category_id FROM entries WHERE project_id = ?);`,
            [project.id, ...currentCatIds, project.id]
          );
        } catch {
          // Ignore if restricted
        }
      }
    }
    try { await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);'); } catch {}

    storageEvents.emit(STORAGE_EVENTS.PROJECTS_CHANGED, { projectId: project.id });
  } catch (err) {
    console.warn('[useProjects] Failed to save project to database:', err);
    throw err;
  }
}

export async function createProject(project: Project): Promise<void> {
  return saveProject(project);
}

/**
 * Deletes a project, its categories, and its entries from the database.
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    await adapter.executeSql('DELETE FROM entries WHERE project_id = ?;', [projectId]);
    await adapter.executeSql('DELETE FROM categories WHERE project_id = ?;', [projectId]);
    await adapter.executeSql('DELETE FROM projects WHERE id = ?;', [projectId]);
    storageEvents.emit(STORAGE_EVENTS.PROJECTS_CHANGED, { projectId });
    storageEvents.emit(STORAGE_EVENTS.ENTRIES_CHANGED, { projectId });
  } catch (err) {
    console.warn('[useProjects] Failed to delete project from database:', err);
    throw err;
  }
}

export type ProfileResult = UserProfile & {
  profile: UserProfile;
  loading: boolean;
  error: Error | null;
  empty: boolean;
};

export function useProfile(): ProfileResult {
  const [profile, setProfile] = useState<ProfileResult>(() => ({
    ...DEFAULT_INITIAL_PROFILE,
    profile: DEFAULT_INITIAL_PROFILE,
    loading: true,
    error: null,
    empty: false,
  }));

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const adapter = await getStorageAdapter();
        const rows = await adapter.executeSql<any[]>('SELECT * FROM user_profile LIMIT 1;');
        if (rows && rows.length > 0 && isMounted) {
          const row = rows[0];
          const loaded: UserProfile = {
            id: row.id,
            name: row.name,
            username: row.username,
            initials: row.initials,
            bio: row.bio,
            avatarColor: row.avatar_color,
            role: row.role,
            theme: row.theme,
            accentColor: row.accent_color,
            autoSave: Boolean(row.auto_save),
            defaultView: row.default_view,
            confirmDeletions: Boolean(row.confirm_deletions),
          };
          setProfile({
            ...loaded,
            profile: loaded,
            loading: false,
            error: null,
            empty: false,
          });
        } else if (isMounted) {
          setProfile({
            ...DEFAULT_INITIAL_PROFILE,
            profile: DEFAULT_INITIAL_PROFILE,
            loading: false,
            error: null,
            empty: true,
          });
        }
      } catch (err: any) {
        console.error('[useProfile] Error loading profile from database:', err);
        if (isMounted) {
          setProfile({
            ...DEFAULT_INITIAL_PROFILE,
            profile: DEFAULT_INITIAL_PROFILE,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
            empty: false,
          });
        }
      }
    };

    loadProfile();
    const unsubscribe = storageEvents.on(STORAGE_EVENTS.PROFILE_CHANGED, loadProfile);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return profile;
}

/**
 * Persists the user profile settings to the database.
 */
export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    const now = Date.now();
    await adapter.executeSql(
      `INSERT OR REPLACE INTO user_profile (
        id, name, username, initials, bio, avatar_color, role, theme, accent_color, auto_save, default_view, confirm_deletions, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        profile.id,
        profile.name,
        profile.username ?? '',
        profile.initials,
        profile.bio ?? '',
        profile.avatarColor,
        profile.role ?? 'WORKSPACE OWNER',
        profile.theme ?? 'cream',
        profile.accentColor ?? '#FFD93D',
        profile.autoSave ? 1 : 0,
        profile.defaultView ?? 'editor',
        profile.confirmDeletions ? 1 : 0,
        now,
      ]
    );

    storageEvents.emit(STORAGE_EVENTS.PROFILE_CHANGED, { profileId: profile.id });
  } catch (err) {
    console.warn('[useProjects] Failed to save profile to database:', err);
    throw err;
  }
}

export function getProjectTypePreset(type: ProjectType): ProjectTypePreset {
  return PROJECT_TYPE_PRESETS[type] ?? PROJECT_TYPE_PRESETS.lore;
}

export function useProjectTypePreset(type: ProjectType): ProjectTypePreset {
  return useMemo(() => getProjectTypePreset(type), [type]);
}

/**
 * src/db/seed.ts
 *
 * Initial data seeder for Apollonography.
 * Seeds ONLY user_profile and base settings on a clean installation.
 * Never inserts mock projects, sample entries, or fake data.
 * Safe and non-destructive.
 */

import { StorageAdapter } from './storageAdapter';
import type { UserProfile } from '../types/models';

export const DEFAULT_INITIAL_PROFILE: UserProfile = {
  id: 'user-default',
  name: 'Archivist',
  username: '@archivist',
  initials: 'AR',
  bio: '',
  avatarColor: '#FFD93D',
  role: 'WORKSPACE OWNER',
  theme: 'cream',
  accentColor: '#FFD93D',
  autoSave: true,
  defaultView: 'editor',
  confirmDeletions: true,
};

export async function seedDatabaseIfEmpty(adapter: StorageAdapter): Promise<boolean> {
  try {
    // Check if user profile already exists
    const existing = await adapter.executeSql<any[]>('SELECT id FROM user_profile LIMIT 1;');
    if (existing && existing.length > 0) {
      return false; // Already has profile data
    }

    console.log('[Seed] Seeding initial user profile into fresh database...');
    const now = Date.now();

    await adapter.executeSql(
      `INSERT OR REPLACE INTO user_profile (
        id, name, username, initials, bio, avatar_color, role, theme, accent_color, auto_save, default_view, confirm_deletions, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        DEFAULT_INITIAL_PROFILE.id,
        DEFAULT_INITIAL_PROFILE.name,
        DEFAULT_INITIAL_PROFILE.username ?? '',
        DEFAULT_INITIAL_PROFILE.initials,
        DEFAULT_INITIAL_PROFILE.bio ?? '',
        DEFAULT_INITIAL_PROFILE.avatarColor,
        DEFAULT_INITIAL_PROFILE.role ?? 'WORKSPACE OWNER',
        DEFAULT_INITIAL_PROFILE.theme ?? 'cream',
        DEFAULT_INITIAL_PROFILE.accentColor ?? '#FFD93D',
        DEFAULT_INITIAL_PROFILE.autoSave ? 1 : 0,
        DEFAULT_INITIAL_PROFILE.defaultView ?? 'editor',
        DEFAULT_INITIAL_PROFILE.confirmDeletions ? 1 : 0,
        now,
      ]
    );

    return true;
  } catch (err) {
    console.error('[Seed] Failed to seed database:', err);
    return false;
  }
}

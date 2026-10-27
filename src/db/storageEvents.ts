/**
 * src/db/storageEvents.ts
 *
 * Lightweight reactive event bus for storage mutations.
 * Notifies active hooks when projects, entries, or profile records change in database.
 */

type StorageEventListener = (payload?: any) => void;

class StorageEventEmitter {
  private listeners: Map<string, Set<StorageEventListener>> = new Map();

  on(event: string, listener: StorageEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: string, payload?: any): void {
    this.listeners.get(event)?.forEach(fn => {
      try {
        fn(payload);
      } catch (err) {
        console.warn(`[StorageEvents] Error executing listener for event ${event}:`, err);
      }
    });
  }
}

export const storageEvents = new StorageEventEmitter();

export const STORAGE_EVENTS = {
  PROJECTS_CHANGED: 'projects_changed',
  ENTRIES_CHANGED: 'entries_changed',
  PROFILE_CHANGED: 'profile_changed',
  IMAGE_SYNCED: 'image_synced',
} as const;

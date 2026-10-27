/**
 * src/hooks/useAttributes.ts
 *
 * Data-access hooks and helpers for project attributes:
 * Class, Element, Rarity, and Series.
 *
 * Provides:
 * - Default option presets
 * - Gathering all options for a project (persisted options + values used by entries)
 * - addAttributeOption, renameAttributeOption, deleteAttributeOption, setEntryAttribute
 * - Cascade checking and clearing when deleting an option in use
 */

import type { AttributeOption, AttributeType, ElementOption, Entry, InfoField, Project } from '../types/models';
import { getStorageAdapter } from '../db/database';
import { cleanMojibake } from './useEntries';

export const DEFAULT_CLASS_OPTIONS: AttributeOption[] = [
  { id: 'cls-specialist', name: 'Specialist' },
  { id: 'cls-piercing', name: 'Piercing' },
  { id: 'cls-bouncing', name: 'Bouncing' },
  { id: 'cls-blast', name: 'Blast' },
  { id: 'cls-balanced', name: 'Balanced' },
  { id: 'cls-speed', name: 'Speed' },
  { id: 'cls-power', name: 'Power' },
];

export const DEFAULT_ELEMENT_OPTIONS: ElementOption[] = [
  { id: 'el-light', name: 'Light', color: '#FFD93D' },
  { id: 'el-dark', name: 'Dark', color: '#A855F7' },
  { id: 'el-fire', name: 'Fire', color: '#EF4444' },
  { id: 'el-water', name: 'Water', color: '#0EA5E9' },
  { id: 'el-wood', name: 'Wood', color: '#22C55E' },
];

export const DEFAULT_RARITY_OPTIONS: AttributeOption[] = [
  { id: 'rar-1', name: '★ (1★)' },
  { id: 'rar-2', name: '★★ (2★)' },
  { id: 'rar-3', name: '★★★ (3★)' },
  { id: 'rar-4', name: '★★★★ (4★)' },
  { id: 'rar-5', name: '★★★★★ (5★)' },
  { id: 'rar-6', name: '★★★★★★ (6★)' },
];

export const DEFAULT_SERIES_OPTIONS: AttributeOption[] = [
  { id: 'ser-1', name: 'Twelve Celestial Spirits' },
  { id: 'ser-2', name: 'Neo: Reversing the World' },
  { id: 'ser-3', name: 'Mythological Legends' },
  { id: 'ser-4', name: 'Origin Chronicles' },
];

export function getProjectAttributeOptions(
  project: Project,
  type: AttributeType,
  allEntries?: Entry[]
): AttributeOption[] {
  const map = new Map<string, AttributeOption>();

  // 1. If project has explicit saved options in DB, use them as primary source of truth
  if (type === 'element' && project.elementOptions && project.elementOptions.length > 0) {
    project.elementOptions.forEach(opt => map.set(opt.id, { ...opt }));
  } else if (type === 'class' && project.classOptions && project.classOptions.length > 0) {
    project.classOptions.forEach(opt => map.set(opt.id, { ...opt }));
  } else if (type === 'rarity' && project.rarityOptions && project.rarityOptions.length > 0) {
    project.rarityOptions.forEach(opt => map.set(opt.id, { ...opt }));
  } else if (type === 'series' && project.seriesOptions && project.seriesOptions.length > 0) {
    project.seriesOptions.forEach(opt => map.set(opt.id, { ...opt }));
  } else {
    // Fall back to defaults only if nothing configured in DB yet
    let defaults: AttributeOption[] = [];
    if (type === 'rarity') {
      defaults = DEFAULT_RARITY_OPTIONS;
    } else if (type === 'element') {
      defaults = DEFAULT_ELEMENT_OPTIONS;
    }
    defaults.forEach(opt => map.set(opt.id, { ...opt }));
  }

  // 3. Discover any values already used by entries in this project
  if (allEntries && Array.isArray(allEntries)) {
    allEntries.forEach(e => {
      if (!e || (e.projectId && e.projectId !== project.id)) return;
      let val = '';
      if (type === 'class') {
        val = e.infoFields?.find(f => f.key.toLowerCase() === 'class')?.value ?? '';
      } else if (type === 'element') {
        val = e.infoFields?.find(f => f.key.toLowerCase() === 'element' || f.key.toLowerCase() === 'att.')?.value ?? '';
      } else if (type === 'rarity') {
        val = e.infoFields?.find(f => f.key.toLowerCase() === 'rarity' || f.key.toLowerCase() === 'luck')?.value ?? '';
      } else if (type === 'series') {
        val = e.infoFields?.find(f => f.key.toLowerCase() === 'series')?.value ?? '';
      }

      val = cleanMojibake(val);

      if (val && val.trim()) {
        const trimmed = val.trim();
        // Check if map already has by ID or by name
        const exists = Array.from(map.values()).some(
          o => o.id === trimmed || o.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (!exists) {
          const autoId = `${type}-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          map.set(autoId, {
            id: autoId,
            name: trimmed,
            color: type === 'element' ? '#4ECDC4' : undefined,
          });
        }
      }

      // Check evolutions
      if (Array.isArray(e.evolutions)) {
        e.evolutions.forEach((evo: any) => {
          if (!evo) return;
          const evoVal = evo[type];
          if (evoVal && typeof evoVal === 'string' && evoVal.trim()) {
            const trimmed = evoVal.trim();
            const exists = Array.from(map.values()).some(
              o => o.id === trimmed || o.name.toLowerCase() === trimmed.toLowerCase()
            );
            if (!exists) {
              const autoId = `${type}-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
              map.set(autoId, {
                id: autoId,
                name: trimmed,
                color: type === 'element' ? '#4ECDC4' : undefined,
              });
            }
          }
        });
      }
    });
  }

  return Array.from(map.values());
}

export function addAttributeOption(
  project: Project,
  type: AttributeType,
  name: string,
  color?: string,
  allEntries?: Entry[]
): { updatedProject: Project; newOption: AttributeOption } {
  const currentOptions = getProjectAttributeOptions(project, type, allEntries);
  const newId = `${type}-${Date.now()}`;
  const newOption: AttributeOption = {
    id: newId,
    name: name.trim(),
    color: type === 'element' ? (color || '#4ECDC4') : color,
  };

  const nextOptions = [...currentOptions, newOption];
  const updatedProject = { ...project };

  if (type === 'class') updatedProject.classOptions = nextOptions;
  else if (type === 'element') updatedProject.elementOptions = nextOptions as ElementOption[];
  else if (type === 'rarity') updatedProject.rarityOptions = nextOptions;
  else if (type === 'series') updatedProject.seriesOptions = nextOptions;

  return { updatedProject, newOption };
}

export function renameAttributeOption(
  project: Project,
  type: AttributeType,
  id: string,
  newName: string,
  newColor?: string,
  allEntries?: Entry[]
): { updatedProject: Project; updatedOption: AttributeOption } {
  const currentOptions = getProjectAttributeOptions(project, type, allEntries);
  const targetId = (id || '').trim().toLowerCase();
  const targetName = (newName || '').trim();

  // Match by exact ID, case-insensitive ID, or case-insensitive name
  const targetIndex = currentOptions.findIndex(
    o => o.id === id || o.id.toLowerCase() === targetId || o.name.toLowerCase() === targetId
  );

  let updatedOption: AttributeOption;

  if (targetIndex >= 0) {
    const existing = currentOptions[targetIndex];
    updatedOption = {
      ...existing,
      name: targetName || existing.name,
      color: type === 'element' ? (newColor ?? existing.color ?? '#4ECDC4') : (newColor ?? existing.color),
    };
    currentOptions[targetIndex] = updatedOption;
  } else {
    updatedOption = {
      id: id || `${type}-${targetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: targetName || id,
      color: type === 'element' ? (newColor || '#4ECDC4') : newColor,
    };
    currentOptions.push(updatedOption);
  }

  const updatedProject = { ...project };

  if (type === 'class') updatedProject.classOptions = currentOptions;
  else if (type === 'element') updatedProject.elementOptions = currentOptions as ElementOption[];
  else if (type === 'rarity') updatedProject.rarityOptions = currentOptions;
  else if (type === 'series') updatedProject.seriesOptions = currentOptions;

  return { updatedProject, updatedOption };
}

export function deleteAttributeOption(
  project: Project,
  type: AttributeType,
  id: string,
  allEntries?: Entry[]
): { updatedProject: Project } {
  const currentOptions = getProjectAttributeOptions(project, type, allEntries);
  const targetId = (id || '').trim().toLowerCase();
  const nextOptions = currentOptions.filter(
    opt => opt.id !== id && opt.id.toLowerCase() !== targetId && opt.name.toLowerCase() !== targetId
  );

  const updatedProject = { ...project };
  if (type === 'class') updatedProject.classOptions = nextOptions;
  else if (type === 'element') updatedProject.elementOptions = nextOptions as ElementOption[];
  else if (type === 'rarity') updatedProject.rarityOptions = nextOptions;
  else if (type === 'series') updatedProject.seriesOptions = nextOptions;

  return { updatedProject };
}

export function isAttributeOptionInUse(
  option: AttributeOption,
  type: AttributeType,
  entries: Entry[]
): boolean {
  if (!entries || !Array.isArray(entries)) return false;

  return entries.some(e => {
    if (!e) return false;
    let fieldVal = '';
    if (type === 'class') {
      fieldVal = e.infoFields?.find(f => f.key.toLowerCase() === 'class')?.value ?? '';
    } else if (type === 'element') {
      fieldVal = e.infoFields?.find(f => f.key.toLowerCase() === 'element' || f.key.toLowerCase() === 'att.')?.value ?? '';
    } else if (type === 'rarity') {
      fieldVal = e.infoFields?.find(f => f.key.toLowerCase() === 'rarity' || f.key.toLowerCase() === 'luck')?.value ?? '';
    } else if (type === 'series') {
      fieldVal = e.infoFields?.find(f => f.key.toLowerCase() === 'series')?.value ?? '';
    }

    if (fieldVal === option.id || fieldVal.toLowerCase() === option.name.toLowerCase()) {
      return true;
    }

    // Check evolutions
    if (Array.isArray(e.evolutions)) {
      const evoMatch = e.evolutions.some((evo: any) => {
        const evoVal = evo?.[type];
        return evoVal === option.id || (typeof evoVal === 'string' && evoVal.toLowerCase() === option.name.toLowerCase());
      });
      if (evoMatch) return true;
    }

    return false;
  });
}

export function clearAttributeFromEntries(
  entries: Entry[],
  type: AttributeType,
  option: AttributeOption
): Entry[] {
  if (!entries || !Array.isArray(entries)) return [];

  return entries.map(e => {
    let changed = false;
    const nextInfoFields = (e.infoFields || []).map(f => {
      let isTarget = false;
      if (type === 'class' && f.key.toLowerCase() === 'class') isTarget = true;
      if (type === 'element' && (f.key.toLowerCase() === 'element' || f.key.toLowerCase() === 'att.')) isTarget = true;
      if (type === 'rarity' && (f.key.toLowerCase() === 'rarity' || f.key.toLowerCase() === 'luck')) isTarget = true;
      if (type === 'series' && f.key.toLowerCase() === 'series') isTarget = true;

      if (isTarget && (f.value === option.id || f.value.toLowerCase() === option.name.toLowerCase())) {
        changed = true;
        return { ...f, value: '' };
      }
      return f;
    });

    let nextEvolutions = e.evolutions;
    if (Array.isArray(e.evolutions)) {
      nextEvolutions = e.evolutions.map((evo: any) => {
        const evoVal = evo?.[type];
        if (evoVal === option.id || (typeof evoVal === 'string' && evoVal.toLowerCase() === option.name.toLowerCase())) {
          changed = true;
          return { ...evo, [type]: '' };
        }
        return evo;
      });
    }

    if (!changed) return e;
    return {
      ...e,
      infoFields: nextInfoFields,
      evolutions: nextEvolutions,
    };
  });
}

export function setEntryAttribute(
  entry: Entry,
  type: AttributeType,
  option: AttributeOption
): Entry {
  const existing = entry.infoFields || [];
  let keyName = 'Class';
  if (type === 'element') keyName = 'Element';
  else if (type === 'rarity') keyName = 'Rarity';
  else if (type === 'series') keyName = 'Series';

  const idx = existing.findIndex(f => {
    if (type === 'class') return f.key.toLowerCase() === 'class';
    if (type === 'element') return f.key.toLowerCase() === 'element' || f.key.toLowerCase() === 'att.';
    if (type === 'rarity') return f.key.toLowerCase() === 'rarity' || f.key.toLowerCase() === 'luck';
    if (type === 'series') return f.key.toLowerCase() === 'series';
    return false;
  });

  let nextInfoFields: InfoField[];
  if (idx >= 0) {
    nextInfoFields = existing.map((f, i) => i === idx ? { ...f, value: option.id } : f);
  } else {
    nextInfoFields = [...existing, { key: keyName, value: option.id }];
  }

  return {
    ...entry,
    infoFields: nextInfoFields,
  };
}

/**
 * Persists an attribute option (Class, Element, Rarity, Series) to the database.
 */
export async function saveAttributeOption(
  projectId: string,
  option: AttributeOption,
  type: AttributeType
): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    await adapter.executeSql(
      `INSERT OR REPLACE INTO attribute_options (
        id, project_id, type, name, color, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      [
        option.id,
        projectId,
        type,
        option.name,
        (option as any).color ?? null,
        (option as any).sortOrder ?? 0,
      ]
    );
  } catch (err) {
    console.warn('[useAttributes] Failed to persist attribute option:', err);
    throw err;
  }
}

/**
 * Deletes an attribute option from the database.
 */
export async function deleteAttributeOptionFromDb(
  projectId: string,
  optionId: string
): Promise<void> {
  try {
    const adapter = await getStorageAdapter();
    await adapter.executeSql(
      'DELETE FROM attribute_options WHERE id = ?;',
      [optionId]
    );
  } catch (err) {
    console.warn('[useAttributes] Failed to delete attribute option:', err);
    throw err;
  }
}

/**
 * Fetches all persisted attribute options for a project from the database.
 */
export async function loadAttributeOptionsFromDb(
  projectId: string,
  type?: AttributeType
): Promise<AttributeOption[]> {
  try {
    const adapter = await getStorageAdapter();
    let sql = 'SELECT * FROM attribute_options WHERE project_id = ?';
    const params: string[] = [projectId];
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' ORDER BY sort_order ASC, name ASC;';

    const rows = await adapter.executeSql<any[]>(sql, params);
    if (!rows) return [];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color ?? undefined,
    }));
  } catch (err) {
    console.warn('[useAttributes] Failed to load attribute options:', err);
    return [];
  }
}


/**
 * src/screens/MainScreen.tsx
 *
 * Neobrutalist MainScreen:
 *  - Flat warm cream background (#FBF3EA)
 *  - Bold stationary header with 2px ink border
 *  - Title in display font (Space Grotesk Bold), sticker type pill
 *  - Square bordered icon buttons for quick actions
 *  - BrutalInput for searches
 *  - BrutalToggle for switching view modes (active side in accent color)
 *  - BrutalButton for Add New Article / Add Chapter
 *  - Strict 2px ink dividers and borders throughout
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BrutalBox from '../components/brutal/BrutalBox';
import BrutalButton from '../components/brutal/BrutalButton';
import BrutalCard from '../components/brutal/BrutalCard';
import BrutalDivider from '../components/brutal/BrutalDivider';
import BrutalInput from '../components/brutal/BrutalInput';
import BrutalPill from '../components/brutal/BrutalPill';
import BrutalTextInput from '../components/brutal/BrutalTextInput';
import BrutalToggle from '../components/brutal/BrutalToggle';
import { CategoryChip } from '../components/CategoryChip';
import { ChapterData, ChapterWriterCanvas } from '../components/ChapterWriterCanvas';
import { EditorCanvas } from '../components/EditorCanvas';
import { EntryGalleryCard } from '../components/EntryGalleryCard';
import { EntryListCard } from '../components/EntryListCard';
import { HomeDashboard } from '../components/HomeDashboard';
import { Icon, ICONS } from '../components/Icon';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { SeriesData, SeriesShowcaseCanvas } from '../components/SeriesShowcaseCanvas';
import { useEntries, useAllEntries, createEntry, saveEntry, deleteEntry } from '../hooks/useEntries';
import { BrutalSkeleton, FadeInView } from '../components/brutal/BrutalSkeleton';
import Sidebar, { getFallbackAccentColor } from '../components/Sidebar';
import {
  getProjectTypePreset,
  useProfile,
  useProjects,
  createProject,
  saveProject,
  deleteProject,
  saveProfile,
} from '../hooks/useProjects';
import { useChapters, saveChapter, createChapter, deleteChapter } from '../hooks/useChapters';
import { getStorageAdapter } from '../db/database';
import { enqueueUpload, triggerQueueProcessing } from '../services/uploadQueue';
import {
  BORDER,
  CREAM,
  FONTS,
  getProjectAccent,
  INK,
  RADIUS,
  SHADOW,
  SPACE,
  TYPE,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Entry, Project, ProjectType, Section, UserProfile } from '../types/models';
import { pickImageFromComputer } from '../native/FilePicker';
import ProjectModal, { getInitialsFromName } from '../components/ProjectModal';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal';
import { ImageFrame } from '../components/ImageFrame';

type ViewMode = 'editor' | 'gallery' | 'series' | 'chapters' | 'fashion';

export interface FashionSeriesConfig {
  id: string;
  name: string;
  badge: string;
  description: string;
  logo: any;
  banners?: any[];
}

export interface SeriesBadgeItem {
  id: string;
  label: string;
  color: string;
}

export interface GameplaySeriesConfig {
  id: string;
  name: string;
  badge: string;
  badges?: SeriesBadgeItem[];
  description: string;
}

const BADGE_COLOR_WHEEL_HUES = [
  '#FF3B30', '#FF7A00', '#FFCC00', '#FFEB3B',
  '#A3E635', '#22C55E', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#18181B',
];

const PRESET_BADGE_COLORS = [
  '#FFD93D', '#4ECDC4', '#FF6B6B', '#38BDF8',
  '#A855F7', '#6BCB77', '#FF9F5A', '#18181B',
];

export const DEFAULT_GAMEPLAY_SERIES: GameplaySeriesConfig[] = [];
export const DEFAULT_FASHION_SERIES: FashionSeriesConfig[] = [];

export const MainScreen: React.FC = () => {
  const initialProjects = useProjects();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const initialProfile = useProfile();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Default project
  const [project, setProject] = useState<Project | null>(() => initialProjects[0] ?? null);
  const initialPreset = getProjectTypePreset(project?.type ?? 'gameplay');

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjects(initialProjects);
      setProject(curr => (curr ? (initialProjects.find(p => p.id === curr.id) || curr) : initialProjects[0]));
    } else if (!initialProjects.loading) {
      setProjects([]);
      setProject(null);
    }
  }, [initialProjects]);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  // Navigation mode: 'home' is default on boot
  const [activeNav, setActiveNav] = useState<'home' | 'project'>('home');

  // Project Modal State (Add Project & Edit Project / Project Settings)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create');

  const handleOpenCreateProject = () => {
    setProjectModalMode('create');
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = () => {
    setProjectModalMode('edit');
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (data: {
    id?: string;
    name: string;
    type: ProjectType;
    logoUri: any | null;
    bannerUri?: any | null;
    accentColor: string;
  }) => {
    const preset = getProjectTypePreset(data.type);
    if (projectModalMode === 'create') {
      const newId = `proj-${Date.now()}`;
      const newProject: Project = {
        id: newId,
        name: data.name,
        type: data.type,
        subtitle: preset.displayName,
        avatar: data.logoUri,
        background: data.bannerUri ?? null,
        accentColor: data.accentColor,
        accentColorEnd: '#FFD93D',
        font: 'DM Sans',
        categories: [
          { id: 'all', name: 'All' },
          ...(preset.suggestedCategories || []).map(cat => ({
            id: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: cat,
          })),
        ],
      };
      setProjects(prev => [...prev, newProject]);
      handleOpenProject(newProject);
      try {
        await createProject(newProject);
      } catch (err) {
        console.warn('[MainScreen] Failed to create project in DB:', err);
      }

      // Upload banner / logo to Cloudinary if local file paths
      if (data.bannerUri && typeof data.bannerUri === 'string' && (data.bannerUri.startsWith('file:') || data.bannerUri.includes(':\\') || data.bannerUri.startsWith('/'))) {
        enqueueUpload({
          entryId: newId,
          slot: 'project_banner',
          localTempPath: data.bannerUri,
          folder: `apollonography/${newId}`,
          autoProcess: true,
        }).catch(e => console.warn('[MainScreen] Failed to enqueue project banner upload:', e));
      }
      if (data.logoUri && typeof data.logoUri === 'string' && (data.logoUri.startsWith('file:') || data.logoUri.includes(':\\') || data.logoUri.startsWith('/'))) {
        enqueueUpload({
          entryId: newId,
          slot: 'project_avatar',
          localTempPath: data.logoUri,
          folder: `apollonography/${newId}`,
          autoProcess: true,
        }).catch(e => console.warn('[MainScreen] Failed to enqueue project avatar upload:', e));
      }
    } else {
      if (!project) return;
      const updatedProject: Project = {
        ...project,
        name: data.name,
        type: data.type,
        subtitle: preset.displayName,
        avatar: data.logoUri,
        background: data.bannerUri !== undefined ? data.bannerUri : project.background,
        accentColor: data.accentColor,
        categories: project.categories && project.categories.length > 0
          ? project.categories
          : [
            { id: 'all', name: 'All' },
            ...(preset.suggestedCategories || []).map(cat => ({
              id: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: cat,
            })),
          ],
      };
      setProject(updatedProject);
      setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)));
      try {
        await saveProject(updatedProject);
      } catch (err) {
        console.warn('[MainScreen] Failed to save project in DB:', err);
      }

      // Upload banner / logo to Cloudinary if local file paths
      if (data.bannerUri && typeof data.bannerUri === 'string' && (data.bannerUri.startsWith('file:') || data.bannerUri.includes(':\\') || data.bannerUri.startsWith('/'))) {
        enqueueUpload({
          entryId: updatedProject.id,
          slot: 'project_banner',
          localTempPath: data.bannerUri,
          folder: `apollonography/${updatedProject.id}`,
          autoProcess: true,
        }).catch(e => console.warn('[MainScreen] Failed to enqueue project banner upload:', e));
      }
      if (data.logoUri && typeof data.logoUri === 'string' && (data.logoUri.startsWith('file:') || data.logoUri.includes(':\\') || data.logoUri.startsWith('/'))) {
        enqueueUpload({
          entryId: updatedProject.id,
          slot: 'project_avatar',
          localTempPath: data.logoUri,
          folder: `apollonography/${updatedProject.id}`,
          autoProcess: true,
        }).catch(e => console.warn('[MainScreen] Failed to enqueue project avatar upload:', e));
      }
    }
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) return;
    const remaining = projects.filter(p => p.id !== projectId);
    setProjects(remaining);
    deleteProject(projectId).catch(err => console.warn('[MainScreen] Failed to delete project from DB:', err));
    if (project && project.id === projectId) {
      handleOpenProject(remaining[0]);
    }
    setIsProjectModalOpen(false);
  };

  // Active view tab
  const [activeTab, setActiveTab] = useState<ViewMode>(initialPreset.defaultView);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);

  const baseEntries = useEntries(project?.id ?? '');
  const [customEntries, setCustomEntries] = useState<Record<string, Entry[]>>({});

  const currentProjectEntries = project ? (customEntries[project.id] ?? baseEntries) : [];
  const entries = categoryId === 'all'
    ? currentProjectEntries
    : currentProjectEntries.filter(e =>
      e.categoryId === categoryId ||
      e.tags?.some(t => t.id === categoryId || t.name.toLowerCase() === categoryId.toLowerCase())
    );

  const dbAllEntries = useAllEntries();

  // All entries across all projects
  const allWorkspaceEntries = React.useMemo(() => {
    const customList = Object.values(customEntries).flat();
    const customIds = new Set(customList.map(e => e.id));
    const remainingDb = dbAllEntries.filter(e => !customIds.has(e.id));
    return [...customList, ...remainingDb];
  }, [customEntries, dbAllEntries]);

  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(entries[0] ?? null);

  useEffect(() => {
    // When baseEntries reloads from DB (e.g. upload worker completes, or DB update),
    // ensure customEntries stays in sync with canonical DB image references
    setCustomEntries(prev => {
      if (!project) return prev;
      const current = prev[project.id];
      if (!current) return prev;
      const updatedList = current.map(cEntry => {
        const dbEntry = baseEntries.find(b => b.id === cEntry.id);
        if (!dbEntry) return cEntry;
        return {
          ...cEntry,
          thumbnail: dbEntry.thumbnail ?? cEntry.thumbnail,
          portrait: dbEntry.portrait ?? cEntry.portrait,
          splash: dbEntry.splash ?? cEntry.splash,
          e2Portrait: dbEntry.e2Portrait ?? cEntry.e2Portrait,
          e2Splash: dbEntry.e2Splash ?? cEntry.e2Splash,
        };
      });
      return { ...prev, [project.id]: updatedList };
    });
  }, [baseEntries, project?.id]);

  useEffect(() => {
    if (selectedEntry) {
      const match = baseEntries.find(b => b.id === selectedEntry.id);
      if (match) {
        setSelectedEntry(prev => {
          if (!prev || prev.id !== match.id) return prev;
          const nextThumbnail = match.thumbnail ?? prev.thumbnail;
          const nextPortrait = match.portrait ?? prev.portrait;
          const nextSplash = match.splash ?? prev.splash;
          const nextE2Portrait = match.e2Portrait ?? prev.e2Portrait;
          const nextE2Splash = match.e2Splash ?? prev.e2Splash;
          if (
            prev.thumbnail === nextThumbnail &&
            prev.portrait === nextPortrait &&
            prev.splash === nextSplash &&
            prev.e2Portrait === nextE2Portrait &&
            prev.e2Splash === nextE2Splash
          ) {
            return prev;
          }
          return {
            ...prev,
            thumbnail: nextThumbnail,
            portrait: nextPortrait,
            splash: nextSplash,
            e2Portrait: nextE2Portrait,
            e2Splash: nextE2Splash,
          };
        });
      }
    }
  }, [baseEntries]);
  const [selectedSeries, setSelectedSeries] = useState<SeriesData | null>(null);
  const dbChapters = useChapters(project?.id ?? '');
  const [chapters, setChapters] = useState<ChapterData[]>(dbChapters);
  const [activeChapterId, setActiveChapterId] = useState<string>('ch-0');
  const [chapterSortMode, setChapterSortMode] = useState<'story' | 'recent'>('story');

  const sortedChapters = useMemo(() => {
    const list = [...chapters];
    if (chapterSortMode === 'recent') {
      return list.sort((a, b) => {
        const timeA = a.updatedAt ?? 0;
        const timeB = b.updatedAt ?? 0;
        return timeB - timeA;
      });
    }

    // Default 'story': from Prologue to Chapters
    const getScore = (ch: ChapterData): number => {
      const numStr = (ch.number || '').toLowerCase().trim();
      const titleStr = (ch.title || '').toLowerCase().trim();
      const tagStr = (ch.tagLabel || '').toLowerCase().trim();
      if (numStr.includes('prologue') || titleStr.includes('prologue') || tagStr.includes('prologue')) return -1;
      if (numStr.includes('epilogue') || titleStr.includes('epilogue') || tagStr.includes('epilogue')) return 99999;
      const match = numStr.match(/(?:chapter|ch|act)\s*(\d+)/i) || titleStr.match(/(?:chapter|ch|act)\s*(\d+)/i) || tagStr.match(/(?:chapter|ch|act)\s*(\d+)/i);
      if (match) return parseInt(match[1], 10);
      if (typeof ch.sortOrder === 'number' && ch.sortOrder > 0) return ch.sortOrder;
      return 1000;
    };

    return list.sort((a, b) => getScore(a) - getScore(b));
  }, [chapters, chapterSortMode]);

  useEffect(() => {
    if (dbChapters) {
      setChapters(dbChapters);
    }
  }, [dbChapters]);

  // Gameplay Series Configs & Settings Modal State
  const [gameplaySeriesConfigs, setGameplaySeriesConfigs] = useState<GameplaySeriesConfig[]>(DEFAULT_GAMEPLAY_SERIES);
  const [editingGameplaySeries, setEditingGameplaySeries] = useState<GameplaySeriesConfig | null>(null);
  const [gameplayModalName, setGameplayModalName] = useState('');
  const [gameplayModalBadge, setGameplayModalBadge] = useState('');
  const [gameplayModalBadges, setGameplayModalBadges] = useState<SeriesBadgeItem[]>([]);
  const [newBadgeLabel, setNewBadgeLabel] = useState('');
  const [newBadgeColor, setNewBadgeColor] = useState('#FFD93D');
  const [showBadgeColorWheel, setShowBadgeColorWheel] = useState(false);
  const [gameplayModalDesc, setGameplayModalDesc] = useState('');

  const getInitialFashionConfigs = (proj: Project | null): FashionSeriesConfig[] => {
    if (!proj) return [];
    const nonAllCategories = (proj.categories || []).filter(c => c.id !== 'all');
    if (nonAllCategories.length > 0) {
      return nonAllCategories.map(c => ({
        id: `fsh-${c.id}`,
        name: c.name,
        badge: 'Collection',
        description: `Wardrobe series for ${c.name}.`,
        logo: null,
        banners: [],
      }));
    }
    return [];
  };

  // Fashion Series Configs & Settings Modal State
  const [fashionConfigs, setFashionConfigs] = useState<FashionSeriesConfig[]>(() => getInitialFashionConfigs(project));
  const [editingFashionSeries, setEditingFashionSeries] = useState<FashionSeriesConfig | null>(null);
  const [modalSeriesName, setModalSeriesName] = useState('');
  const [modalSeriesDesc, setModalSeriesDesc] = useState('');
  const [modalSeriesBadge, setModalSeriesBadge] = useState('');
  const [modalSeriesLogo, setModalSeriesLogo] = useState<any>(null);
  const [modalSeriesBanners, setModalSeriesBanners] = useState<any[]>([]);
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [customBannerUrl, setCustomBannerUrl] = useState('');

  // Load Series from SQLite on mount / project change
  useEffect(() => {
    let isMounted = true;
    const loadSeriesFromDb = async () => {
      if (!project) return;
      try {
        const adapter = await getStorageAdapter();
        const rows = await adapter.executeSql<any[]>(
          'SELECT * FROM series WHERE project_id = ? ORDER BY created_at ASC;',
          [project.id]
        );
        if (!isMounted) return;

        if (project.type === 'gameplay') {
          let loaded: GameplaySeriesConfig[] = (rows || []).map(r => {
            let badges: SeriesBadgeItem[] = [];
            try {
              if (r.specs_json) badges = JSON.parse(r.specs_json);
            } catch { }
            if (!badges || badges.length === 0) {
              badges = r.badge ? [{ id: `b-${r.id}`, label: r.badge, color: '#FFD93D' }] : [];
            }
            return {
              id: r.id,
              name: r.name,
              badge: r.badge || (badges[0]?.label ?? 'Series'),
              badges,
              description: r.description || '',
            };
          });

          setGameplaySeriesConfigs(loaded);
        } else if (project.type === 'cosmetics') {
          let loadedFashion: FashionSeriesConfig[] = (rows || []).map(r => {
            let banners: any[] = [];
            try {
              if (r.banners_json) banners = JSON.parse(r.banners_json);
            } catch { }
            return {
              id: r.id,
              name: r.name,
              badge: r.badge || 'Collection',
              description: r.description || '',
              logo: r.logo_image_id ? { uri: r.logo_image_id } : null,
              banners,
            };
          });

          // Also auto-discover any series names already present on entries in this project
          try {
            const entriesRows = await adapter.executeSql<any[]>(
              'SELECT wardrobes_json, info_fields_json FROM entries WHERE project_id = ?;',
              [project.id]
            );
            const discoveredSeriesNames = new Set<string>();
            (entriesRows || []).forEach(er => {
              try {
                if (er.wardrobes_json) {
                  const wList = JSON.parse(er.wardrobes_json);
                  if (Array.isArray(wList)) {
                    wList.forEach((w: any) => {
                      if (w.seriesName && typeof w.seriesName === 'string' && w.seriesName.trim()) {
                        discoveredSeriesNames.add(w.seriesName.trim());
                      }
                    });
                  }
                }
              } catch { }
              try {
                if (er.info_fields_json) {
                  const fList = JSON.parse(er.info_fields_json);
                  if (Array.isArray(fList)) {
                    fList.forEach((f: any) => {
                      if (
                        f.key &&
                        (f.key.toLowerCase().includes('fashion') || f.key.toLowerCase().includes('series')) &&
                        f.value &&
                        typeof f.value === 'string' &&
                        f.value.trim()
                      ) {
                        discoveredSeriesNames.add(f.value.trim());
                      }
                    });
                  }
                }
              } catch { }
            });

            for (const sName of Array.from(discoveredSeriesNames)) {
              if (!loadedFashion.some(f => f.name.toLowerCase() === sName.toLowerCase())) {
                const autoId = `fsh-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                const discovered: FashionSeriesConfig = {
                  id: autoId,
                  name: sName,
                  badge: 'Collection',
                  description: `Wardrobe series for ${sName}.`,
                  logo: undefined,
                  banners: [],
                };
                loadedFashion.push(discovered);

                await adapter.executeSql(
                  `INSERT OR REPLACE INTO series (id, project_id, name, description, badge, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?);`,
                  [autoId, project.id, sName, discovered.description, 'Collection', Date.now(), Date.now()]
                );
                await adapter.executeSql(
                  `INSERT OR REPLACE INTO attribute_options (id, project_id, type, name, sort_order)
                   VALUES (?, ?, 'series', ?, 0);`,
                  [autoId, project.id, sName]
                );
              }
            }
          } catch (err) {
            console.warn('[MainScreen] Failed to discover existing series from entries:', err);
          }

          if (loadedFashion.length > 0) {
            setFashionConfigs(loadedFashion);
          } else {
            setFashionConfigs(getInitialFashionConfigs(project));
          }
        }
      } catch (err) {
        console.warn('[MainScreen] Error loading series from database:', err);
      }
    };

    loadSeriesFromDb();
    return () => {
      isMounted = false;
    };
  }, [project?.id, project?.type]);

  const accentObj = getProjectAccent(project?.id ?? '');
  const accent = project?.accentColor || accentObj.primary;
  const avatarCfg = {
    initials: project ? getInitialsFromName(project.name) : 'AP',
    color: project?.accentColor || getFallbackAccentColor(project?.id || project?.name || ''),
  };

  // Simple, direct view mode switcher
  const switchViewMode = (targetMode: ViewMode) => {
    setActiveTab(targetMode);
  };

  const handleSelectProject = (p: Project) => {
    setProject(p);
    setCategoryId('all');
    setSelectedEntry(null);
    setSelectedSeries(null);
    setSearchQuery('');
    const preset = getProjectTypePreset(p.type);
    switchViewMode(preset.defaultView);
  };

  const handleOpenProject = (p: Project) => {
    handleSelectProject(p);
    setActiveNav('project');
  };

  const handleOpenArticle = (p: Project, entry: Entry) => {
    setProject(p);
    setSelectedEntry(entry);
    setCategoryId('all');
    setSearchQuery('');
    setActiveNav('project');
    const preset = getProjectTypePreset(p.type);
    switchViewMode(preset.defaultView);
  };

  const handleAddNewArticle = () => {
    if (!project) return;
    const preset = getProjectTypePreset(project.type);
    const templateKey = Object.keys(preset.entryTemplates)[0];
    const template = preset.entryTemplates[templateKey];

    const newSections: Section[] = template.sections.map((sec, idx) => ({
      id: `sec-${Date.now()}-${idx}`,
      title: sec.title,
      type: sec.type,
      body: sec.body ?? '',
      items: sec.items ? [...sec.items] : [],
    }));

    const newEntry: Entry = {
      id: `${project.id}-entry-${Date.now()}`,
      projectId: project.id,
      categoryId: categoryId === 'all' ? (project.categories[0]?.id ?? 'characters') : categoryId,
      title: `Untitled ${template.label}`,
      summary: `Newly created ${template.label.toLowerCase()} in ${project.name}.`,
      thumbnail: undefined,
      portrait: undefined,
      tags: [
        { id: 'draft', name: 'Draft', color: accent },
      ],
      infoFields: [
        { key: 'Status', value: 'Draft' },
        { key: 'Type', value: template.label },
      ],
      sections: newSections,
    };

    setCustomEntries(prev => {
      const existing = prev[project.id] ?? baseEntries;
      return { ...prev, [project.id]: [newEntry, ...existing] };
    });
    setSelectedEntry(newEntry);
    createEntry(newEntry).catch(err => console.warn('[MainScreen] Failed to create entry in DB:', err));
    switchViewMode('editor');
  };

  const handleUpdateEntry = (updated: Entry) => {
    if (!project) return;
    setSelectedEntry(updated);
    setCustomEntries(prev => {
      const existing = prev[project.id] ?? baseEntries;
      return {
        ...prev,
        [project.id]: [updated, ...existing.filter(e => e.id !== updated.id)],
      };
    });
    saveEntry(updated).catch(err => console.warn('[MainScreen] Failed to save entry in DB:', err));
  };

  const handleUpdateProject = (updated: Project) => {
    setProject(updated);
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    saveProject(updated).catch(err => console.warn('[MainScreen] Failed to update project in DB:', err));
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!project) return;
    setCustomEntries(prev => {
      const existing = prev[project.id] ?? baseEntries;
      return {
        ...prev,
        [project.id]: existing.filter(e => e.id !== entryId),
      };
    });
    deleteEntry(entryId).catch(err => console.warn('[MainScreen] Failed to delete entry in DB:', err));
    if (selectedEntry?.id === entryId) {
      const remaining = currentProjectEntries.filter(e => e.id !== entryId);
      setSelectedEntry(remaining[0] ?? null);
    }
  };

  const handleOpenFashionSettings = (ser: FashionSeriesConfig) => {
    setEditingFashionSeries(ser);
    setModalSeriesName(ser.name);
    setModalSeriesDesc(ser.description);
    setModalSeriesBadge(ser.badge);
    setModalSeriesLogo(ser.logo);
    setModalSeriesBanners(ser.banners ? [...ser.banners] : []);
  };

  const handleSaveFashionSettings = () => {
    if (!project || !editingFashionSeries) return;
    const oldName = editingFashionSeries.name;
    const finalName = modalSeriesName.trim() || editingFashionSeries.name;
    const finalLogo = modalSeriesLogo ?? editingFashionSeries.logo;
    const finalBanners = modalSeriesBanners.length > 0 ? modalSeriesBanners : (editingFashionSeries.banners || []);
    const updated = fashionConfigs.map(f => {
      if (f.id === editingFashionSeries.id) {
        return {
          ...f,
          name: finalName,
          description: modalSeriesDesc.trim() || f.description,
          badge: modalSeriesBadge.trim() || f.badge,
          logo: finalLogo,
          banners: finalBanners,
        };
      }
      return f;
    });
    setFashionConfigs(updated);
    if (selectedSeries && selectedSeries.id === editingFashionSeries.id) {
      setSelectedSeries({
        ...selectedSeries,
        name: finalName,
        description: modalSeriesDesc.trim() || selectedSeries.description,
        badge: modalSeriesBadge.trim() || selectedSeries.badge,
        logo: finalLogo,
        banners: finalBanners,
      });
    }

    if (oldName !== finalName) {
      currentProjectEntries.forEach(entry => {
        let changed = false;
        const nextWardrobes = (entry.wardrobes || []).map(w => {
          if (w.seriesName && (w.seriesName === oldName || w.seriesName.toLowerCase() === oldName.toLowerCase())) {
            changed = true;
            return { ...w, seriesName: finalName };
          }
          return w;
        });
        const nextFields = (entry.infoFields || []).map(f => {
          if (
            (f.key.toLowerCase().includes('fashion') || f.key.toLowerCase().includes('series')) &&
            (f.value === oldName || f.value.toLowerCase() === oldName.toLowerCase())
          ) {
            changed = true;
            return { ...f, value: finalName };
          }
          return f;
        });
        if (changed) {
          entry.wardrobes = nextWardrobes;
          entry.infoFields = nextFields;
          saveEntry({ ...entry, wardrobes: nextWardrobes, infoFields: nextFields }).catch(() => { });
        }
      });
    }

    // Persist to DB
    (async () => {
      try {
        const adapter = await getStorageAdapter();
        const logoUri = typeof finalLogo === 'string' ? finalLogo : (finalLogo?.uri ?? null);
        const bannersJson = JSON.stringify(finalBanners);
        const now = Date.now();
        await adapter.executeSql(
          `INSERT OR REPLACE INTO series (id, project_id, name, description, badge, logo_image_id, banners_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [editingFashionSeries.id, project.id, finalName, modalSeriesDesc.trim() || editingFashionSeries.description, modalSeriesBadge.trim() || editingFashionSeries.badge, logoUri, bannersJson, now, now]
        );
        await adapter.executeSql(
          `INSERT OR REPLACE INTO attribute_options (id, project_id, type, name, sort_order)
           VALUES (?, ?, 'series', ?, 0);`,
          [editingFashionSeries.id, project.id, finalName]
        );
        await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);');

        // Queue background upload to Cloudinary for local logo if not already remote
        if (logoUri && typeof logoUri === 'string' && (logoUri.startsWith('file:') || logoUri.includes(':\\') || logoUri.startsWith('/'))) {
          enqueueUpload({
            entryId: editingFashionSeries.id,
            slot: 'series_logo',
            localTempPath: logoUri,
            folder: `apollonography/${project.id}/fashion_series`,
            autoProcess: true,
          }).catch(err => console.warn('[MainScreen] Failed to enqueue logo upload:', err));
        }

        // Queue background upload to Cloudinary for any local banners
        if (Array.isArray(finalBanners)) {
          finalBanners.forEach(bUri => {
            const rawB = typeof bUri === 'string' ? bUri : (bUri as any)?.uri;
            if (rawB && typeof rawB === 'string' && (rawB.startsWith('file:') || rawB.includes(':\\') || rawB.startsWith('/'))) {
              enqueueUpload({
                entryId: editingFashionSeries.id,
                slot: 'series_banner',
                localTempPath: rawB,
                folder: `apollonography/${project.id}/fashion_series`,
                autoProcess: true,
              }).catch(err => console.warn('[MainScreen] Failed to enqueue banner upload:', err));
            }
          });
        }
        triggerQueueProcessing();
      } catch (err) {
        console.warn('[MainScreen] Failed to save fashion series to DB:', err);
      }
    })();

    setEditingFashionSeries(null);
  };

  const handleOpenGameplaySettings = (ser: GameplaySeriesConfig | SeriesData) => {
    setEditingGameplaySeries(ser as GameplaySeriesConfig);
    setGameplayModalName(ser.name);
    setGameplayModalBadge(ser.badge || 'Series');
    const existingBadges: SeriesBadgeItem[] = (ser as any).badges && (ser as any).badges.length > 0
      ? [...(ser as any).badges]
      : (ser.badge ? [{ id: `b-${Date.now()}`, label: ser.badge, color: '#FFD93D' }] : []);
    setGameplayModalBadges(existingBadges);
    setNewBadgeLabel('');
    setNewBadgeColor('#FFD93D');
    setShowBadgeColorWheel(false);
    setGameplayModalDesc(ser.description);
  };

  const handleSaveGameplaySettings = () => {
    if (!project || !editingGameplaySeries) return;
    const oldName = editingGameplaySeries.name;
    const seriesId = editingGameplaySeries.id;
    const primaryBadge = gameplayModalBadges[0]?.label || gameplayModalBadge.trim() || 'Series';
    const finalName = gameplayModalName.trim() || editingGameplaySeries.name;
    const finalDesc = gameplayModalDesc.trim() || editingGameplaySeries.description;

    const updated = gameplaySeriesConfigs.map(s => {
      if (s.id === editingGameplaySeries.id) {
        return {
          ...s,
          name: finalName,
          badge: primaryBadge,
          badges: gameplayModalBadges,
          description: finalDesc,
        };
      }
      return s;
    });
    setGameplaySeriesConfigs(updated);
    if (selectedSeries && selectedSeries.id === editingGameplaySeries.id) {
      setSelectedSeries({
        ...selectedSeries,
        name: finalName,
        badge: primaryBadge,
        badges: gameplayModalBadges,
        description: finalDesc,
      });
    }

    const nextSeriesOptions = (project.seriesOptions || []).map(opt =>
      opt.id === editingGameplaySeries.id ? { ...opt, name: finalName } : opt
    );
    if (!nextSeriesOptions.some(opt => opt.id === editingGameplaySeries.id)) {
      nextSeriesOptions.push({ id: editingGameplaySeries.id, name: finalName });
    }
    const updatedProj = { ...project, seriesOptions: nextSeriesOptions };
    handleUpdateProject(updatedProj);

    // Cascade series rename to all associated entries in memory and database
    if (oldName !== finalName) {
      currentProjectEntries.forEach(entry => {
        let changed = false;
        const nextFields = (entry.infoFields || []).map(f => {
          if (
            f.key.toLowerCase() === 'series' &&
            (f.value === oldName || f.value === seriesId || f.value.toLowerCase() === oldName.toLowerCase())
          ) {
            changed = true;
            return { ...f, value: finalName };
          }
          return f;
        });
        if (changed) {
          entry.infoFields = nextFields;
          saveEntry({ ...entry, infoFields: nextFields }).catch(err =>
            console.warn('[MainScreen] Failed to cascade series rename to entry:', err)
          );
        }
      });

      if (selectedEntry) {
        let changed = false;
        const nextFields = (selectedEntry.infoFields || []).map(f => {
          if (
            f.key.toLowerCase() === 'series' &&
            (f.value === oldName || f.value === seriesId || f.value.toLowerCase() === oldName.toLowerCase())
          ) {
            changed = true;
            return { ...f, value: finalName };
          }
          return f;
        });
        if (changed) {
          setSelectedEntry({ ...selectedEntry, infoFields: nextFields });
        }
      }
    }

    (async () => {
      try {
        const adapter = await getStorageAdapter();
        await adapter.executeSql(
          `INSERT OR REPLACE INTO series (
            id, project_id, name, description, badge, specs_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            editingGameplaySeries.id,
            project.id,
            finalName,
            finalDesc,
            primaryBadge,
            JSON.stringify(gameplayModalBadges),
            Date.now(),
            Date.now(),
          ]
        );
        await adapter.executeSql(
          `INSERT OR REPLACE INTO attribute_options (
            id, project_id, type, name, color, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?);`,
          [editingGameplaySeries.id, project.id, 'series', finalName, null, 0]
        );
        await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);');
      } catch (err) {
        console.warn('[MainScreen] Failed to save series to DB:', err);
      }
    })();

    setEditingGameplaySeries(null);
  };

  const handleAddFashionSeries = (newSeriesName: string) => {
    if (!project) return;
    if (fashionConfigs.some(f => f.name.toLowerCase() === newSeriesName.toLowerCase())) return;
    const newId = `fsh-${Date.now()}`;
    const newConfig: FashionSeriesConfig = {
      id: newId,
      name: newSeriesName,
      badge: 'New Collection',
      description: 'Newly registered wardrobe collection. Configure concept details, logo, and banners in settings.',
      logo: undefined,
      banners: [],
    };
    setFashionConfigs(prev => [...prev, newConfig]);

    // Persist to DB
    (async () => {
      try {
        const adapter = await getStorageAdapter();
        const now = Date.now();
        await adapter.executeSql(
          `INSERT OR REPLACE INTO series (id, project_id, name, description, badge, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [newId, project.id, newSeriesName, newConfig.description, newConfig.badge, now, now]
        );
        await adapter.executeSql(
          `INSERT OR REPLACE INTO attribute_options (id, project_id, type, name, sort_order)
           VALUES (?, ?, 'series', ?, 0);`,
          [newId, project.id, newSeriesName]
        );
        await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);');
      } catch (err) {
        console.warn('[MainScreen] Failed to persist new fashion series to DB:', err);
      }
    })();
  };

  const handleAddNewChapter = () => {
    if (!project) return;
    const newIdx = chapters.length;
    const now = Date.now();
    const newCh: ChapterData = {
      id: `ch-${now}`,
      number: `Chapter ${newIdx}`,
      title: 'New Narrative Arc',
      subtitle: 'A new chronicle recorded in the stars.',
      act: `Act ${newIdx} — Unwritten Journey`,
      content: 'Begin writing your story chronicle here...',
      updatedAt: now,
      sortOrder: newIdx,
    };
    setChapters(prev => [...prev, newCh]);
    setActiveChapterId(newCh.id);
    createChapter(project.id, newCh, newIdx).catch(err => console.warn('[MainScreen] Failed to save chapter in DB:', err));
  };

  const handleUpdateChapter = (updated: ChapterData) => {
    if (!project) return;
    const withTime: ChapterData = { ...updated, updatedAt: Date.now() };
    setChapters(prev => prev.map(c => (c.id === updated.id ? withTime : c)));
    saveChapter(project.id, withTime).catch(err => console.warn('[MainScreen] Failed to update chapter in DB:', err));
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!project) return;
    setChapters(prev => {
      const remaining = prev.filter(c => c.id !== chapterId);
      if (remaining.length > 0) {
        setActiveChapterId(remaining[0].id);
      }
      return remaining;
    });
    deleteChapter(project.id, chapterId).catch(err => console.warn('[MainScreen] Failed to delete chapter in DB:', err));
  };

  const handleAddNewSeries = async () => {
    if (!project) return;
    const newId = `series-${Date.now()}`;
    const newName = `New Series ${gameplaySeriesConfigs.length + 1}`;
    const newCfg: GameplaySeriesConfig = {
      id: newId,
      name: newName,
      badge: 'Series',
      badges: [{ id: `b-${newId}`, label: 'Series', color: '#FFD93D' }],
      description: 'Newly created series collection.',
    };

    setGameplaySeriesConfigs(prev => [...prev, newCfg]);
    const updatedProject = {
      ...project,
      seriesOptions: [...(project.seriesOptions || []), { id: newId, name: newName }],
    };
    handleUpdateProject(updatedProject);

    try {
      const adapter = await getStorageAdapter();
      await adapter.executeSql(
        `INSERT OR REPLACE INTO series (
          id, project_id, name, description, badge, specs_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [newId, project.id, newName, newCfg.description, 'Series', JSON.stringify(newCfg.badges), Date.now(), Date.now()]
      );
      await adapter.executeSql(
        `INSERT OR REPLACE INTO attribute_options (
          id, project_id, type, name, color, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [newId, project.id, 'series', newName, null, 0]
      );
      await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);');
    } catch (err) {
      console.warn('[MainScreen] Failed to insert new series in DB:', err);
    }

    handleOpenGameplaySettings(newCfg);
  };

  const handleAddNewFashionSeries = async () => {
    if (!project) return;
    const newId = `fsh-${Date.now()}`;
    const newName = `Fashion Collection ${fashionConfigs.length + 1}`;
    const newCfg: FashionSeriesConfig = {
      id: newId,
      name: newName,
      badge: 'Collection',
      description: 'Newly registered wardrobe collection. Configure concept details, logo, and banners in settings.',
      logo: undefined,
      banners: [],
    };

    setFashionConfigs(prev => [...prev, newCfg]);
    const updatedProject = {
      ...project,
      seriesOptions: [...(project.seriesOptions || []), { id: newId, name: newName }],
    };
    handleUpdateProject(updatedProject);

    try {
      const adapter = await getStorageAdapter();
      const now = Date.now();
      await adapter.executeSql(
        `INSERT OR REPLACE INTO series (
          id, project_id, name, description, badge, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [newId, project.id, newName, newCfg.description, 'Collection', now, now]
      );
      await adapter.executeSql(
        `INSERT OR REPLACE INTO attribute_options (
          id, project_id, type, name, sort_order
        ) VALUES (?, ?, 'series', ?, 0);`,
        [newId, project.id, newName]
      );
      await adapter.executeSql('PRAGMA wal_checkpoint(PASSIVE);');
    } catch (err) {
      console.warn('[MainScreen] Failed to insert new fashion series in DB:', err);
    }

    handleOpenFashionSettings(newCfg);
  };

  const handleAddNewAction = () => {
    if (activeTab === 'chapters') {
      handleAddNewChapter();
    } else if (activeTab === 'series') {
      handleAddNewSeries();
    } else if (activeTab === 'fashion') {
      handleAddNewFashionSeries();
    } else {
      handleAddNewArticle();
    }
  };

  const displayedEntry: Entry | null =
    project && selectedEntry?.projectId === project.id ? selectedEntry : (entries[0] ?? null);

  // ── Project Header ──────────────────────────────────────────────────────────
  const renderProjectHeader = () => {
    if (!project) return null;
    const preset = getProjectTypePreset(project.type);
    return (
      <View style={{ width: 366, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View className="flex-row items-center">
          <InitialsAvatar
            initials={avatarCfg.initials}
            color={accent}
            size={36}
            fontSize={12}
            imageUri={project.avatar}
          />
          <View className="ml-2.5">
            <Text className="font-display text-[15px] font-extrabold text-ink tracking-tight">
              {project.name.toUpperCase()}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <BrutalPill
                label={preset.displayName}
                fill={project.accentColorEnd || accentObj.secondary}
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* Small bordered square icon buttons aligned with the search filter */}
        <View className="flex-row items-center gap-1.5">
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.small}
            shadowOffset={SHADOW.offsetSmall}
            onPress={handleAddNewAction}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon glyph={ICONS.add} size={15} color={INK} />
          </BrutalBox>

          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.small}
            shadowOffset={SHADOW.offsetSmall}
            onPress={handleOpenEditProject}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon glyph={ICONS.settings} size={15} color={INK} />
          </BrutalBox>
        </View>
      </View>
    );
  };

  // ── Categories & Tags (Primary vs Secondary) ─────────────────────────────────
  // First tag is the primary tag. Only primary tags that actually exist on project entries appear on top.
  const dynamicPrimaryTags = React.useMemo(() => {
    const list: { id: string; name: string; color?: string }[] = [];
    const seen = new Set<string>();
    for (const e of currentProjectEntries || []) {
      const primaryTag = e.tags?.[0];
      if (primaryTag && primaryTag.name) {
        const lower = primaryTag.name.trim().toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          list.push({
            id: primaryTag.id || lower,
            name: primaryTag.name.trim(),
            color: primaryTag.color,
          });
        }
      }
    }
    return list;
  }, [currentProjectEntries]);

  // Up to 6 primary tags fit cleanly across 2 lines with 'ALL'; tuck any remainder to the filter
  const MAX_BAR_PRIMARY_TAGS = 6;
  const visiblePrimaryTags = dynamicPrimaryTags.slice(0, MAX_BAR_PRIMARY_TAGS);
  const overflowPrimaryTags = dynamicPrimaryTags.slice(MAX_BAR_PRIMARY_TAGS);

  // Secondary tags are the subsequent tags (tags.slice(1)) tucked away in the filter
  const dynamicSecondaryTags = React.useMemo(() => {
    const primarySet = new Set(dynamicPrimaryTags.map(t => t.name.toLowerCase()));
    const list: { id: string; name: string; color?: string }[] = [];
    const seen = new Set<string>();
    for (const e of currentProjectEntries || []) {
      const secondaryTags = (e.tags || []).slice(1);
      for (const t of secondaryTags) {
        if (t && t.name) {
          const lower = t.name.trim().toLowerCase();
          if (!seen.has(lower) && !primarySet.has(lower)) {
            seen.add(lower);
            list.push({
              id: t.id || lower,
              name: t.name.trim(),
              color: t.color,
            });
          }
        }
      }
    }
    return list;
  }, [currentProjectEntries, dynamicPrimaryTags]);

  // ── Search & Filter Controls ────────────────────────────────────────────────
  const renderSearchRow = () => {
    const isTuckedActive =
      overflowPrimaryTags.some(
        t => categoryId === t.id || categoryId.toLowerCase() === t.name.toLowerCase()
      ) ||
      dynamicSecondaryTags.some(
        t => categoryId === t.id || categoryId.toLowerCase() === t.name.toLowerCase()
      );

    return (
      <View className="px-3 pt-3 pb-2" style={{ position: 'relative', zIndex: 100 }}>
        <BrutalInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder=""
          icon={<Icon glyph={ICONS.search} size={14} color={INK} />}
          rightElement={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSearchQuery('')}
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '900', color: INK }}>✕</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowFilterDropdown(prev => !prev)}
                style={{
                  padding: 4,
                  backgroundColor: showFilterDropdown || isTuckedActive ? YELLOW : 'transparent',
                  borderRadius: 4,
                  borderWidth: isTuckedActive ? 1.5 : 0,
                  borderColor: INK,
                }}
              >
                <Icon glyph={ICONS.filter} size={14} color={INK} />
              </TouchableOpacity>
            </View>
          }
        />

        {/* Filter Button Pop-up Dropdown */}
        {showFilterDropdown && (
          <View
            style={{
              position: 'absolute',
              top: 52,
              right: 12,
              width: 320,
              zIndex: 9999,
              backgroundColor: WHITE,
              borderWidth: 2,
              borderColor: INK,
              borderRadius: RADIUS.card,
              padding: 12,
              shadowColor: '#000',
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 8,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                borderBottomWidth: 1.5,
                borderBottomColor: INK,
                paddingBottom: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon glyph={ICONS.filter} size={13} color={INK} />
                <Text
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 11,
                    fontWeight: '900',
                    color: INK,
                    letterSpacing: 0.5,
                  }}
                >
                  TAG & CATEGORY FILTERS
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterDropdown(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '900', color: INK }}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* PRIMARY TAGS */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 10,
                  fontWeight: '900',
                  color: '#666666',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                PRIMARY TAGS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <CategoryChip
                  key="all"
                  label="ALL"
                  selected={categoryId === 'all'}
                  accentColor={accent}
                  onPress={() => setCategoryId('all')}
                />
                {dynamicPrimaryTags.map(tag => {
                  const isSelected =
                    categoryId === tag.id || categoryId.toLowerCase() === tag.name.toLowerCase();
                  return (
                    <CategoryChip
                      key={tag.id}
                      label={tag.name.toUpperCase()}
                      selected={isSelected}
                      accentColor={tag.color || accent}
                      onPress={() => {
                        setCategoryId(isSelected ? 'all' : tag.name.toLowerCase());
                      }}
                    />
                  );
                })}
              </View>
            </View>

            {/* SECONDARY TAGS */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 8 }}>
              <Text
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 10,
                  fontWeight: '900',
                  color: '#666666',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                SECONDARY TAGS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {dynamicSecondaryTags.map(tag => {
                  const isSelected =
                    categoryId === tag.id || categoryId.toLowerCase() === tag.name.toLowerCase();
                  return (
                    <CategoryChip
                      key={tag.id}
                      label={tag.name.toUpperCase()}
                      selected={isSelected}
                      accentColor={tag.color || accent}
                      onPress={() => {
                        setCategoryId(isSelected ? 'all' : tag.name.toLowerCase());
                      }}
                    />
                  );
                })}
                {dynamicSecondaryTags.length === 0 && (
                  <Text
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: 11,
                      color: '#888888',
                      fontStyle: 'italic',
                    }}
                  >
                    No secondary tags recorded for this project
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderGallerySearch = () => (
    <View className="w-[200px]">
      <BrutalInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder=" "
        icon={<Icon glyph={ICONS.search} size={14} color={INK} />}
        rightElement={
          searchQuery.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSearchQuery('')}
              style={{ paddingHorizontal: 4, paddingVertical: 2 }}
            >
              <Text style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: '900', color: INK }}>✕</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
    </View>
  );

  // Category chips bar: 2 lines max with generous top padding to prevent border clipping
  const renderChips = () => (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        paddingTop: 6,
        paddingBottom: 2,
      }}
    >
      <CategoryChip
        key="all"
        label="ALL"
        selected={categoryId === 'all'}
        accentColor={accent}
        onPress={() => setCategoryId('all')}
      />
      {visiblePrimaryTags.map(tag => {
        const isSelected =
          categoryId === tag.id || categoryId.toLowerCase() === tag.name.toLowerCase();
        return (
          <CategoryChip
            key={tag.id}
            label={tag.name.toUpperCase()}
            selected={isSelected}
            accentColor={tag.color || accent}
            onPress={() => setCategoryId(isSelected ? 'all' : tag.name.toLowerCase())}
          />
        );
      })}
    </View>
  );

  // ── Segmented Toggle (Editor | Gallery | Series, Editor | Chapters, or Editor | Gallery | Fashion) ─
  const renderToggle = () => {
    if (!project) return null;
    const isLore = project.type === 'lore';
    const isCosmetics = project.type === 'cosmetics';
    const options = isLore
      ? [
        { id: 'editor', label: 'Editor', icon: <Icon glyph={ICONS.edit} size={13} color={INK} /> },
        { id: 'chapters', label: 'Chapters', icon: <Icon glyph={ICONS.book} size={13} color={INK} /> },
      ]
      : isCosmetics
        ? [
          { id: 'editor', label: 'Editor', icon: <Icon glyph={ICONS.edit} size={13} color={INK} /> },
          { id: 'gallery', label: 'Gallery', icon: <Icon glyph={ICONS.grid} size={13} color={INK} /> },
          { id: 'fashion', label: 'Fashion', icon: <Icon glyph={ICONS.star} size={13} color={INK} /> },
        ]
        : [
          { id: 'editor', label: 'Editor', icon: <Icon glyph={ICONS.edit} size={13} color={INK} /> },
          { id: 'gallery', label: 'Gallery', icon: <Icon glyph={ICONS.grid} size={13} color={INK} /> },
          { id: 'series', label: 'Series', icon: <Icon glyph={ICONS.folder} size={13} color={INK} /> },
        ];

    return (
      <BrutalToggle
        options={options}
        activeId={activeTab}
        onChange={id => switchViewMode(id as ViewMode)}
        accentColor={accent}
      />
    );
  };

  const renderAddNew = () => {
    if (!project) return null;
    return (
      <BrutalButton
        label={
          activeTab === 'chapters'
            ? 'ADD CHAPTER'
            : activeTab === 'series'
              ? 'ADD SERIES'
              : activeTab === 'fashion'
                ? 'ADD FASHION SERIES'
                : 'ADD NEW ARTICLE'
        }
        variant="primary"
        accentColor={accent}
        size="sm"
        icon={<Icon glyph={ICONS.addCircle} size={14} color={INK} />}
        onPress={handleAddNewAction}
      />
    );
  };

  // ── Editor view ────────────────────────────────────────────────────────────
  const renderEditorView = () => {
    if (!project) return null;
    const q = searchQuery.toLowerCase().trim();
    const displayedList = entries.filter(e => {
      if (!q) return true;
      const titleMatch = (e.title || '').toLowerCase().includes(q);
      const summaryMatch = (e.summary || '').toLowerCase().includes(q);
      const subtitleMatch = (e.subtitle || '').toLowerCase().includes(q);
      const tagMatch = e.tags?.some(t => (t.name || '').toLowerCase().includes(q));
      return titleMatch || summaryMatch || subtitleMatch || tagMatch;
    });

    return (
      <View className="flex-1 flex-row">
        {/* Left List Column */}
        <View className="w-[390px] border-r-2 border-ink bg-cream">
          {renderSearchRow()}
          <View style={{ paddingHorizontal: 12, paddingTop: 2, paddingBottom: 2 }}>{renderChips()}</View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {baseEntries.loading ? (
              <View>
                {[1, 2, 3, 4].map(idx => (
                  <View key={idx} className="mb-2 p-2 rounded-card border-2 border-ink bg-white flex-row items-center">
                    {project.type !== 'lore' && (
                      <BrutalSkeleton width={82} height={82} radius={RADIUS.small} style={{ marginRight: 10 }} />
                    )}
                    <View className="flex-1 justify-center gap-2">
                      <BrutalSkeleton width="75%" height={16} radius={RADIUS.small} />
                      <BrutalSkeleton width="45%" height={12} radius={RADIUS.small} />
                      <View className="flex-row gap-1 mt-1">
                        <BrutalSkeleton width={50} height={18} radius={RADIUS.small} />
                        <BrutalSkeleton width={40} height={18} radius={RADIUS.small} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : baseEntries.error ? (
              <View className="py-8 px-4 items-center bg-red-50 border-2 border-ink rounded-card m-2">
                <Text className="font-display text-[14px] font-black text-red-600 mb-1">DATABASE ERROR</Text>
                <Text className="font-body text-[12px] text-neutral-700 text-center mb-2">{baseEntries.error.message}</Text>
              </View>
            ) : displayedList.length === 0 ? (
              <View className="py-10 px-3 items-center">
                <Text className="font-display text-[13px] font-black text-ink mb-1 text-center">NO ARTICLES YET</Text>
                <Text className="font-body text-[12px] text-neutral-500 text-center mb-3">
                  {searchQuery ? 'No articles match your search filter.' : 'Create an article in this category to begin.'}
                </Text>
                {!searchQuery && (
                  <BrutalButton
                    label="CREATE FIRST ARTICLE"
                    variant="primary"
                    accentColor={accent}
                    size="sm"
                    onPress={handleAddNewArticle}
                  />
                )}
              </View>
            ) : (
              <FadeInView duration={120}>
                {displayedList.map(entry => (
                  <EntryListCard
                    key={entry.id}
                    entry={entry}
                    selected={displayedEntry?.id === entry.id}
                    accentColor={accent}
                    onPress={() => setSelectedEntry(entry)}
                    hideThumbnail={project.type === 'lore'}
                  />
                ))}
              </FadeInView>
            )}
          </ScrollView>
        </View>

        {/* Right Editor Canvas Panel */}
        <View className="flex-1 p-3 bg-cream" style={{ flex: 1, minHeight: 0 }}>
          {baseEntries.loading && !displayedEntry ? (
            <View className="flex-1 p-6 gap-4">
              <BrutalSkeleton width="50%" height={32} radius={RADIUS.button} />
              <View className="flex-row gap-2">
                <BrutalSkeleton width={80} height={24} radius={RADIUS.small} />
                <BrutalSkeleton width={70} height={24} radius={RADIUS.small} />
              </View>
              <BrutalSkeleton width="100%" height={100} radius={RADIUS.card} />
              <BrutalSkeleton width="100%" height={220} radius={RADIUS.card} />
            </View>
          ) : displayedEntry ? (
            <View style={{ flex: 1, minHeight: 0 }}>
              <EditorCanvas
                key={displayedEntry.id}
                entry={displayedEntry}
                project={project}
                accentColor={accent}
                allEntries={currentProjectEntries}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onUpdateProject={handleUpdateProject}
                availableFashionSeries={fashionConfigs.map(f => f.name)}
                onAddFashionSeries={handleAddFashionSeries}
                fashionConfigs={fashionConfigs}
              />
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="font-display text-[18px] font-bold text-ink">
                SELECT AN ARTICLE TO EDIT
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Gallery view ───────────────────────────────────────────────────────────
  const renderGalleryView = () => {
    if (!project) return null;
    const q = searchQuery.toLowerCase().trim();
    const displayedList = entries.filter(e => {
      if (!q) return true;
      const titleMatch = (e.title || '').toLowerCase().includes(q);
      const summaryMatch = (e.summary || '').toLowerCase().includes(q);
      const subtitleMatch = (e.subtitle || '').toLowerCase().includes(q);
      const tagMatch = e.tags?.some(t => (t.name || '').toLowerCase().includes(q));
      return titleMatch || summaryMatch || subtitleMatch || tagMatch;
    });

    return (
      <View className="flex-1 flex-col">
        <View className="px-5 pt-3 pb-2">
          {renderChips()}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap items-start gap-3">
            {baseEntries.loading ? (
              [1, 2, 3, 4].map(idx => (
                <BrutalSkeleton
                  key={idx}
                  width={140}
                  height={project.type === 'cosmetics' ? 340 : 200}
                  radius={RADIUS.card}
                />
              ))
            ) : displayedList.length === 0 ? (
              <View className="py-12 px-4 items-center w-full">
                <Text className="font-display text-[14px] font-black text-ink mb-1">NO GALLERY ARTICLES</Text>
                <Text className="font-body text-[12px] text-neutral-500 text-center">
                  {searchQuery ? 'No articles match your search filter.' : 'Add entries to showcase character visual art and cards.'}
                </Text>
              </View>
            ) : (
              <FadeInView duration={120} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {displayedList.map(entry => (
                  <EntryGalleryCard
                    key={entry.id}
                    entry={entry}
                    accentColor={accent}
                    isCosmetics={project.type === 'cosmetics'}
                    onPress={() => {
                      setSelectedEntry(entry);
                      switchViewMode('editor');
                    }}
                  />
                ))}
              </FadeInView>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // ── Series or Chapters View ───────────────────────────────────────────────
  const renderSeriesOrChaptersView = () => {
    if (!project) return null;
    const isLore = project.type === 'lore';

    if (isLore) {
      const activeChapter = sortedChapters.find(c => c.id === activeChapterId) ?? sortedChapters[0] ?? null;

      return (
        <View className="flex-1 flex-row h-full">
          {/* Chapter sidebar column */}
          <View className="w-[360px] border-r-2 border-ink bg-cream">
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View>
                <Text className="font-display text-[16px] font-extrabold text-ink tracking-wide">STORY CHAPTERS</Text>
                <Text className="font-body text-[11px] text-[#666666] font-semibold mt-0.5">
                  {chapters.length} Chronicles Recorded
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setChapterSortMode(prev => prev === 'story' ? 'recent' : 'story')}
                  accessibilityLabel={chapterSortMode === 'story' ? 'Story Order (Prologue → Chapters). Click for Recent.' : 'Recently Edited. Click for Story Order.'}
                  className={`w-[32px] h-[32px] rounded-button border-2 border-ink items-center justify-center ${chapterSortMode === 'recent' ? 'bg-yellow' : 'bg-white'}`}
                >
                  <Icon glyph={chapterSortMode === 'story' ? ICONS.book : ICONS.clock} size={14} color={INK} />
                </TouchableOpacity>

                <BrutalButton
                  label="NEW"
                  variant="primary"
                  accentColor={accent}
                  size="sm"
                  icon={<Icon glyph={ICONS.addCircle} size={12} color={INK} />}
                  onPress={handleAddNewChapter}
                />
              </View>
            </View>

            <BrutalDivider thickness={BORDER.width} />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              {sortedChapters.map(ch => {
                const isSelected = activeChapter ? ch.id === activeChapter.id : false;
                let plainText = ch.content;
                if (plainText.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(plainText);
                    const extract = (node: any): string => {
                      if (node?.text) return node.text;
                      if (node?.content && Array.isArray(node.content)) {
                        return node.content.map(extract).join(' ');
                      }
                      return '';
                    };
                    plainText = extract(parsed).trim();
                  } catch { }
                }
                const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

                return (
                  <View key={ch.id} className="mb-2">
                    <BrutalBox
                      fill={isSelected ? WHITE : CREAM}
                      borderColor={INK}
                      borderWidth={BORDER.width}
                      radius={RADIUS.button}
                      shadowOffset={isSelected ? SHADOW.offset : SHADOW.offsetSmall}
                      onPress={() => setActiveChapterId(ch.id)}
                      style={{ padding: 12 }}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <BrutalPill
                          label={(ch.tagLabel || ch.number).toUpperCase()}
                          fill={ch.tagColor || YELLOW}
                          size="sm"
                        />
                        <Text className="font-display text-[10px] font-bold text-[#777777]">{wordCount} WORDS</Text>
                      </View>

                      <Text className="font-display text-[14px] font-extrabold text-ink mb-0.5" numberOfLines={1}>
                        {ch.title}
                      </Text>

                      <Text className="font-body text-[12px] text-[#555555] leading-4" numberOfLines={2}>
                        {ch.subtitle || plainText.slice(0, 70)}
                      </Text>
                    </BrutalBox>
                  </View>
                );
              })}
              {sortedChapters.length === 0 && (
                <View className="items-center justify-center p-6 mt-8">
                  <Text className="font-display text-[13px] font-bold text-[#888888] text-center mb-3">
                    No chapters created yet.
                  </Text>
                  <BrutalButton
                    label="+ NEW CHAPTER"
                    variant="primary"
                    accentColor={accent}
                    size="sm"
                    onPress={handleAddNewChapter}
                  />
                </View>
              )}
            </ScrollView>
          </View>

          {/* Canvas */}
          <View className="flex-1 p-3 h-full">
            <ChapterWriterCanvas
              chapter={activeChapter}
              project={project}
              accentColor={accent}
              onUpdateChapter={handleUpdateChapter}
              onDeleteChapter={handleDeleteChapter}
              onAddNewChapter={handleAddNewChapter}
            />
          </View>
        </View>
      );
    }

    // Series view for Characters & Gameplay
    const combinedConfigs = [...gameplaySeriesConfigs];
    const projSeries = project.seriesOptions || [];
    projSeries.forEach(ps => {
      if (!combinedConfigs.some(c => c.id === ps.id || c.name.toLowerCase() === ps.name.toLowerCase())) {
        combinedConfigs.push({
          id: ps.id,
          name: ps.name,
          badge: 'Series',
          badges: [{ id: `b-${ps.id}`, label: 'Series', color: '#FFD93D' }],
          description: `Custom series collection for ${ps.name}.`,
        });
      }
    });

    const seriesList: SeriesData[] = combinedConfigs.map((cfg, idx) => {
      const matchingUnits = currentProjectEntries.filter(e => {
        const serVal = e.infoFields?.find(f => f.key.toLowerCase() === 'series')?.value;
        return serVal && (serVal.toLowerCase() === cfg.name.toLowerCase() || serVal === cfg.id);
      });
      const sliceStart = idx % Math.max(1, currentProjectEntries.length);
      const sliceEnd = Math.min(sliceStart + 3, currentProjectEntries.length);
      const fallback = currentProjectEntries.slice(sliceStart, sliceEnd);
      return {
        id: cfg.id,
        name: cfg.name,
        badge: cfg.badge,
        badges: cfg.badges,
        description: cfg.description,
        entries: matchingUnits.length > 0 ? matchingUnits : (fallback.length > 0 ? fallback : currentProjectEntries.slice(0, 2)),
      };
    });

    if (selectedSeries) {
      return (
        <View className="flex-1 p-3 h-full">
          <SeriesShowcaseCanvas
            series={selectedSeries}
            project={project}
            accentColor={accent}
            onSelectUnit={unit => {
              setSelectedEntry(unit);
              setSelectedSeries(null);
              switchViewMode('editor');
            }}
            onBackToSeriesList={() => setSelectedSeries(null)}
            onOpenSettings={() => {
              const cfg = gameplaySeriesConfigs.find(s => s.id === selectedSeries.id) || selectedSeries;
              handleOpenGameplaySettings(cfg);
            }}
          />
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="font-display text-[20px] font-extrabold text-ink tracking-wide">SERIES &amp; COLLECTIONS</Text>
          <Text className="font-body text-[13px] text-[#666666] mt-0.5">
            Select a series below to open its unit showcase canvas ({seriesList.length} collections available)
          </Text>
        </View>

        <View className="flex-row flex-wrap -mx-2">
          {seriesList.map(ser => (
            <View key={ser.id} className="w-1/3 p-2">
              <BrutalBox
                fill={WHITE}
                borderColor={INK}
                borderWidth={BORDER.width}
                radius={RADIUS.card}
                shadowOffset={SHADOW.offset}
                onPress={() => setSelectedSeries(ser)}
                style={{ padding: 12, minHeight: 220, justifyContent: "space-between" }}
              >
                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    {ser.badges && ser.badges.length > 0 ? (
                      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1, marginRight: 6 }}>
                        {ser.badges.map((b, bIdx) => (
                          <BrutalPill
                            key={bIdx}
                            label={b.label}
                            fill={b.color || YELLOW}
                            size="sm"
                          />
                        ))}
                      </View>
                    ) : (
                      <BrutalPill
                        label={ser.badge ?? 'SERIES'}
                        fill={YELLOW}
                        size="sm"
                      />
                    )}
                    <Text className="font-display text-[10px] font-bold text-[#666666]">
                      {ser.entries.length} UNITS
                    </Text>
                  </View>

                  <Text className="font-display text-[15px] font-extrabold text-ink mb-1" numberOfLines={1}>
                    {ser.name}
                  </Text>

                  <Text className="font-body text-[12px] text-[#555555] leading-4 mb-2" numberOfLines={3}>
                    {ser.description}
                  </Text>
                </View>

                <View>
                  {/* Unit thumbnails preview with 2px ink borders */}
                  <View className="flex-row items-center gap-1.5 mb-2">
                    {ser.entries.slice(0, 4).map(unit => (
                      <View key={unit.id} className="w-20 h-20 rounded-small border-2 border-ink overflow-hidden bg-neutral-200">
                        <ImageFrame
                          kind="panel"
                          source={unit.thumbnail}
                          placeholderLabel={unit.title}
                        />
                      </View>
                    ))}
                    {ser.entries.length > 4 && (
                      <View className="w-8 h-8 rounded-small border-2 border-ink bg-yellow items-center justify-center">
                        <Text className="font-display text-[10px] font-extrabold text-ink">+{ser.entries.length - 4}</Text>
                      </View>
                    )}
                  </View>

                  <BrutalDivider thickness={BORDER.width} style={{ marginBottom: 8 }} />

                  <View className="flex-row items-center justify-between">
                    <Text className="font-display text-[11px] font-extrabold text-ink tracking-wide">
                      SHOWCASE CANVAS →
                    </Text>
                    <Icon glyph={ICONS.chevronRight} size={12} color={INK} />
                  </View>
                </View>
              </BrutalBox>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // ── Fashion view for Character Cosmetics ────────────────────────────────────
  const renderFashionView = () => {
    if (!project) return null;
    const fashionSeriesList: SeriesData[] = fashionConfigs.map(item => {
      const matchedEntries = currentProjectEntries.filter(e => {
        const inWardrobe = e.wardrobes?.some(
          w => w.seriesName && w.seriesName.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        const inField = e.infoFields?.some(
          f =>
            (f.key.toLowerCase().includes('fashion') || f.key.toLowerCase().includes('series')) &&
            f.value.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        const inCategory = e.categoryId && (
          e.categoryId.toLowerCase() === item.id.toLowerCase() ||
          e.categoryId.toLowerCase() === item.name.toLowerCase()
        );
        const inTag = e.tags?.some(t => t.name.toLowerCase() === item.name.toLowerCase());
        return Boolean(inWardrobe || inField || inCategory || inTag);
      });
      return {
        id: item.id,
        name: item.name,
        badge: item.badge,
        description: item.description,
        logo: item.logo,
        banners: item.banners,
        entries: matchedEntries,
      };
    });

    if (selectedSeries) {
      return (
        <View className="flex-1 p-3 h-full">
          <SeriesShowcaseCanvas
            series={selectedSeries}
            project={project}
            accentColor={accent}
            onSelectUnit={unit => {
              setSelectedEntry(unit);
              setSelectedSeries(null);
              switchViewMode('editor');
            }}
            onBackToSeriesList={() => setSelectedSeries(null)}
            onOpenSettings={() => {
              const cfg = fashionConfigs.find(c => c.id === selectedSeries.id);
              if (cfg) handleOpenFashionSettings(cfg);
            }}
          />
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="font-display text-[20px] font-extrabold text-ink tracking-wide">FASHION SERIES</Text>
          <Text className="font-body text-[13px] text-[#666666] mt-0.5">
            Select a fashion series below to view its wardrobe line and associated character units
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-4">
          {fashionSeriesList.map(ser => (
            <View key={ser.id} className="w-[200px]">
              <BrutalBox
                fill={WHITE}
                borderColor={INK}
                borderWidth={BORDER.width}
                radius={RADIUS.card}
                shadowOffset={SHADOW.offset}
                onPress={() => setSelectedSeries(ser)}
                style={{ padding: 12, alignItems: "center" }}
              >
                {/* Square box containing the logo */}
                <View className="w-[168px] h-[168px] bg-white items-center justify-center p-3 overflow-hidden mb-3">
                  {ser.logo ? (
                    <Image
                      source={typeof ser.logo === 'string' ? { uri: ser.logo } : ser.logo}
                      className="w-full h-full"
                      resizeMode="contain"
                      style={{ tintColor: 'black' }}
                    />
                  ) : (
                    <Icon glyph={ICONS.image} size={48} color="#888888" />
                  )}
                </View>

                {/* Below the logo: Tag and Name of the series */}
                <View className="w-full items-center">
                  <View className="flex-row items-center justify-center gap-1.5 mb-1.5">
                    <BrutalPill
                      label={ser.badge ?? 'COLLECTION'}
                      fill={CREAM}
                      size="sm"
                    />
                  </View>
                  <Text className="font-display text-[14px] font-black text-ink text-center tracking-tight" numberOfLines={1}>
                    {ser.name}
                  </Text>
                </View>
              </BrutalBox>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // ── Fashion Series Settings Modal (Opened from inside Fashion View) ─────────
  const renderFashionSettingsModal = () => {
    if (!editingFashionSeries) return null;

    const currentLogoSource = modalSeriesLogo ?? editingFashionSeries.logo;
    const currentBannerSource = modalSeriesBanners?.[0] ?? editingFashionSeries.banners?.[0];

    return (
      <View className="absolute inset-0 bg-ink/50 justify-center items-center z-50">
        <View className="w-[640px] max-w-[95%] bg-cream border-2 border-ink rounded-card p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b-2 border-ink mb-4">
            <View className="flex-row items-center gap-2">
              <Icon glyph={ICONS.settings} size={20} color={INK} />
              <Text className="font-display text-[16px] font-bold text-ink uppercase tracking-wider">FASHION SERIES SETTINGS</Text>
            </View>
            <TouchableOpacity
              onPress={() => setEditingFashionSeries(null)}
              className="w-7 h-7 border-2 border-ink rounded-md bg-white items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="font-display text-xs font-bold text-ink leading-none">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[500px]" showsVerticalScrollIndicator={false}>
            {/* Side-by-Side: Series Logo & Series Hero Banner Containers */}
            <View className="flex-row gap-4 mb-4">
              {/* Left: Series Logo Container */}
              <View className="flex-1">
                <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">
                  SERIES LOGO
                </Text>
                <View className="w-full h-[155px] border-2 border-ink rounded-button bg-white items-center justify-center overflow-hidden p-3 shadow-inner">
                  {currentLogoSource ? (
                    <Image
                      source={typeof currentLogoSource === 'string' ? { uri: currentLogoSource } : currentLogoSource}
                      className="w-full h-full"
                      resizeMode="contain"
                      style={{ tintColor: 'black' }}
                    />
                  ) : (
                    <View className="items-center justify-center">
                      <Icon glyph={ICONS.image} size={36} color="#999999" />
                      <Text className="font-display text-[10px] font-bold text-neutral-400 mt-1">NO LOGO</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    const res = await pickImageFromComputer();
                    if (res?.uri) {
                      setModalSeriesLogo(res.uri);
                    }
                  }}
                  className="mt-2 border-2 border-ink rounded-button bg-yellow py-2 px-3 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="font-display text-[10px] font-black text-ink">CHOOSE LOGO</Text>
                </TouchableOpacity>
              </View>

              {/* Right: Series Hero Banner Container */}
              <View className="flex-1">
                <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">
                  SERIES HERO BANNER
                </Text>
                <View className="w-full h-[155px] border-2 border-ink rounded-button bg-white items-center justify-center overflow-hidden shadow-inner">
                  {currentBannerSource ? (
                    <Image
                      source={typeof currentBannerSource === 'string' ? { uri: currentBannerSource } : currentBannerSource}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="items-center justify-center">
                      <Icon glyph={ICONS.image} size={36} color="#999999" />
                      <Text className="font-display text-[10px] font-bold text-neutral-400 mt-1">NO BANNER</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    const res = await pickImageFromComputer();
                    if (res?.uri) {
                      setModalSeriesBanners(prev => [...prev, res.uri]);
                    }
                  }}
                  className="mt-2 border-2 border-ink rounded-button bg-yellow py-2 px-3 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="font-display text-[10px] font-black text-ink">+ CHOOSE HERO BANNER</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Added Banners Grid: Added Below */}
            {modalSeriesBanners && modalSeriesBanners.length > 0 && (
              <View className="mb-4 p-3 bg-white border-2 border-ink rounded-button">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-display text-[10px] font-bold text-neutral-700 uppercase tracking-wider">
                    CHOSEN HERO BANNERS ({modalSeriesBanners.length})
                  </Text>
                  <Text className="font-display text-[9px] text-neutral-500 font-bold">
                    Slideshow cycles across these banners
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2.5">
                  {modalSeriesBanners.map((bSource, bIdx) => {
                    const src = typeof bSource === 'string' ? { uri: bSource } : bSource;
                    return (
                      <View
                        key={`modal-banner-${bIdx}`}
                        className="relative w-[130px] h-[75px] border-2 border-ink rounded-button overflow-hidden bg-neutral-100"
                      >
                        <Image source={src} className="w-full h-full" resizeMode="cover" />
                        <TouchableOpacity
                          onPress={() => {
                            setModalSeriesBanners(prev => prev.filter((_, idx) => idx !== bIdx));
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/80 items-center justify-center"
                          activeOpacity={0.8}
                        >
                          <Text className="text-white text-[10px] font-black leading-none">✕</Text>
                        </TouchableOpacity>
                        <View className="absolute bottom-1 left-1 bg-ink/70 px-1.5 py-0.5 rounded">
                          <Text className="text-white text-[8px] font-bold">#{bIdx + 1}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Series Info */}
            <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">SERIES NAME</Text>
            <BrutalTextInput
              size="md"
              value={modalSeriesName}
              onChangeText={setModalSeriesName}
              placeholder="Series Name"
              placeholderTextColor="#888888"
              style={{ fontFamily: FONTS.display, fontSize: 13, marginBottom: 12 }}
            />

            <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">COLLECTION TAG / BADGE</Text>
            <BrutalTextInput
              size="md"
              value={modalSeriesBadge}
              onChangeText={setModalSeriesBadge}
              placeholder="e.g. Streetwear, Summer Collection"
              placeholderTextColor="#888888"
              style={{ fontFamily: FONTS.display, fontSize: 13, marginBottom: 12 }}
            />

            <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">SERIES DESCRIPTION &amp; CONCEPT</Text>
            <BrutalTextInput
              variant="multiline"
              minHeight={90}
              value={modalSeriesDesc}
              onChangeText={setModalSeriesDesc}
              placeholder="Series lore & concept description..."
              placeholderTextColor="#888888"
              style={{ fontSize: 13 }}
            />
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row justify-end gap-3 mt-4 pt-3 border-t-2 border-ink">
            <BrutalButton
              label="CANCEL"
              variant="secondary"
              size="md"
              onPress={() => setEditingFashionSeries(null)}
            />
            <BrutalButton
              label="✓ SAVE SETTINGS"
              variant="primary"
              accentColor={YELLOW}
              size="md"
              onPress={handleSaveFashionSettings}
            />
          </View>
        </View>
      </View>
    );
  };

  // ── Gameplay Series Settings Modal ─────────────────────────────────────────
  const renderGameplaySettingsModal = () => {
    if (!editingGameplaySeries) return null;

    return (
      <View className="absolute inset-0 bg-ink/50 justify-center items-center z-50">
        <View className="w-[520px] max-w-[90%] bg-cream border-2 border-ink rounded-card p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b-2 border-ink mb-4">
            <View className="flex-row items-center gap-2">
              <Icon glyph={ICONS.settings} size={20} color={INK} />
              <Text className="font-display text-[16px] font-bold text-ink uppercase tracking-wider">SERIES SETTINGS</Text>
            </View>
            <TouchableOpacity
              onPress={() => setEditingGameplaySeries(null)}
              className="w-7 h-7 border-2 border-ink rounded-md bg-white items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="font-display text-xs font-bold text-ink leading-none">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[420px]" showsVerticalScrollIndicator={false}>
            {/* Series Name */}
            <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">SERIES NAME</Text>
            <BrutalTextInput
              size="md"
              value={gameplayModalName}
              onChangeText={setGameplayModalName}
              placeholder="e.g. Twelve Celestial Spirits"
              placeholderTextColor="#888888"
              style={{ fontFamily: FONTS.display, fontSize: 13, marginBottom: 12 }}
            />

            {/* Badges / Classifications with Color Wheel */}
            <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">
              SERIES BADGES &amp; CLASSIFICATIONS
            </Text>

            {/* Existing Badges Row */}
            <View className="flex-row flex-wrap items-center gap-2 mb-3 bg-white p-2.5 rounded-[10px] border-2 border-ink">
              {gameplayModalBadges.length > 0 ? (
                gameplayModalBadges.map((b, bIdx) => (
                  <View key={b.id || bIdx} className="flex-row items-center gap-1">
                    <BrutalPill
                      label={b.label}
                      fill={b.color || YELLOW}
                      size="sm"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setGameplayModalBadges(prev => prev.filter((_, idx) => idx !== bIdx));
                      }}
                      className="w-4 h-4 rounded-full bg-red-100 border border-red-500 items-center justify-center -ml-1"
                    >
                      <Text className="text-[9px] font-bold text-red-600 leading-none">✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text className="text-[12px] font-body text-neutral-400">No badges assigned yet. Add one below!</Text>
              )}
            </View>

            {/* Add Badge Row with Color Preview & Color Wheel Pop-up */}
            <View className="bg-white border-2 border-ink rounded-[10px] p-3 mb-3 relative z-30">
              <Text className="font-display text-[9px] font-black text-ink uppercase tracking-wider mb-2">
                ADD NEW BADGE WITH CUSTOM COLOR
              </Text>
              <View className="flex-row items-center gap-2">
                <BrutalTextInput
                  size="sm"
                  fill={CREAM}
                  value={newBadgeLabel}
                  onChangeText={setNewBadgeLabel}
                  placeholder="New badge name (e.g. Divine Affinity)"
                  placeholderTextColor="#888888"
                  style={{ flex: 1, fontFamily: FONTS.display, fontSize: 12, borderRadius: RADIUS.small }}
                />

                {/* Color Swatch Trigger */}
                <TouchableOpacity
                  onPress={() => setShowBadgeColorWheel(!showBadgeColorWheel)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 8,
                    height: 36,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: INK,
                    backgroundColor: newBadgeColor,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.display, fontSize: 11, fontWeight: '900', color: INK }}>
                    {newBadgeColor.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 10, color: INK }}>{showBadgeColorWheel ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {/* Add Button */}
                <BrutalButton
                  label="+ ADD"
                  variant="primary"
                  accentColor={YELLOW}
                  size="sm"
                  onPress={() => {
                    if (!newBadgeLabel.trim()) return;
                    const created: SeriesBadgeItem = {
                      id: `badge-${Date.now()}`,
                      label: newBadgeLabel.trim(),
                      color: newBadgeColor,
                    };
                    setGameplayModalBadges(prev => [...prev, created]);
                    setNewBadgeLabel('');
                    setShowBadgeColorWheel(false);
                  }}
                />
              </View>

              {/* Color Wheel Pop-up for Badges */}
              {showBadgeColorWheel && (
                <View
                  style={{
                    marginTop: 10,
                    padding: 12,
                    backgroundColor: CREAM,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: INK,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontFamily: FONTS.display, fontSize: 10, fontWeight: '800', color: INK }}>
                      PICK BADGE COLOR WHEEL
                    </Text>
                    <TouchableOpacity onPress={() => setShowBadgeColorWheel(false)}>
                      <Text style={{ fontFamily: FONTS.display, fontSize: 10, fontWeight: '800', color: INK }}>✕ CLOSE</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    {/* Visual Circular Color Wheel */}
                    <View style={{ width: 100, height: 100, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                      {BADGE_COLOR_WHEEL_HUES.map((hue, index) => {
                        const total = BADGE_COLOR_WHEEL_HUES.length;
                        const angle = (index * 2 * Math.PI) / total;
                        const radius = 38;
                        const x = 50 + radius * Math.cos(angle) - 10;
                        const y = 50 + radius * Math.sin(angle) - 10;
                        const isSelected = newBadgeColor.toLowerCase() === hue.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={hue}
                            onPress={() => setNewBadgeColor(hue)}
                            activeOpacity={0.7}
                            style={{
                              position: 'absolute',
                              left: x,
                              top: y,
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: hue,
                              borderWidth: isSelected ? 3 : 1.5,
                              borderColor: INK,
                            }}
                          />
                        );
                      })}
                      {/* Center Swatch Display */}
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: newBadgeColor,
                          borderWidth: 2,
                          borderColor: INK,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: INK }} />
                      </View>
                    </View>

                    {/* Quick Swatches & Hex Input */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONTS.display, fontSize: 9, fontWeight: '800', color: '#666', marginBottom: 6 }}>
                        POPULAR BADGE PALETTE
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {PRESET_BADGE_COLORS.map(color => {
                          const isSelected = newBadgeColor.toLowerCase() === color.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={color}
                              onPress={() => setNewBadgeColor(color)}
                              activeOpacity={0.7}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                backgroundColor: color,
                                borderWidth: isSelected ? 3 : 1.5,
                                borderColor: isSelected ? INK : 'rgba(0,0,0,0.25)',
                              }}
                            />
                          );
                        })}
                      </View>

                      {/* Hex input */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
                        <Text style={{ fontFamily: FONTS.display, fontSize: 11, fontWeight: '900', color: INK }}>#</Text>
                        <BrutalTextInput
                          size="sm"
                          value={newBadgeColor.replace('#', '')}
                          onChangeText={hex => {
                            const clean = hex.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                            setNewBadgeColor(`#${clean}`);
                          }}
                          placeholder="FFD93D"
                          placeholderTextColor="#888888"
                          maxLength={6}
                          borderWidth={1.5}
                          style={{
                            flex: 1,
                            height: 28,
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            fontFamily: FONTS.display,
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Description */}
            <Text className="font-display text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">SERIES OVERVIEW &amp; DESCRIPTION</Text>
            <BrutalTextInput
              variant="multiline"
              minHeight={90}
              value={gameplayModalDesc}
              onChangeText={setGameplayModalDesc}
              placeholder="Describe the combat lore, traits, and mechanics of this series..."
              placeholderTextColor="#888888"
              style={{ fontSize: 13 }}
            />
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row justify-end gap-3 mt-4 pt-3 border-t-2 border-ink">
            <BrutalButton
              label="CANCEL"
              variant="secondary"
              size="md"
              onPress={() => setEditingGameplaySeries(null)}
            />
            <BrutalButton
              label="✓ SAVE SETTINGS"
              variant="primary"
              accentColor={YELLOW}
              size="md"
              onPress={handleSaveGameplaySettings}
            />
          </View>
        </View>
      </View>
    );
  };

  // ── Root ───────────────────────────────────────────────────────────────────
  return (
    <View className="flex-row flex-1 bg-cream overflow-hidden">
      <Sidebar
        projects={projects}
        loading={initialProjects.loading}
        selectedProjectId={activeNav === 'home' ? 'home' : (project?.id ?? '')}
        profile={profile}
        onSelectProject={handleOpenProject}
        onAddNew={handleOpenCreateProject}
        onProfilePress={() => setIsProfileModalOpen(true)}
        onSelectHome={() => setActiveNav('home')}
      />

      <View className="flex-1 flex-col bg-cream overflow-hidden">
        {activeNav === 'home' ? (
          <HomeDashboard
            projects={projects}
            allEntries={allWorkspaceEntries}
            profileName={profile.name}
            loading={initialProjects.loading || dbAllEntries.loading}
            onSelectProject={handleOpenProject}
            onSelectArticle={handleOpenArticle}
            onAddNewProject={handleOpenCreateProject}
          />
        ) : !project ? (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="font-display text-[18px] font-black text-ink mb-1">NO PROJECT SELECTED</Text>
            <Text className="font-body text-[13px] text-neutral-600 mb-4 text-center max-w-[400px]">
              Select a project from the sidebar or create a new world to view its chronicles.
            </Text>
            <BrutalButton
              label="CREATE NEW PROJECT"
              variant="primary"
              accentColor={YELLOW}
              size="md"
              onPress={handleOpenCreateProject}
            />
          </View>
        ) : (
          <View className="flex-1 flex-col overflow-hidden">
            {/* Stationary Top Bar */}
            <View className="flex-row items-center justify-between px-3 h-[68px] bg-cream z-10">
              {renderProjectHeader()}

              <View className="flex-row items-center gap-3">
                {activeTab === 'gallery' && renderGallerySearch()}
                {renderToggle()}
                {activeTab === 'chapters' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setChapterSortMode(prev => prev === 'story' ? 'recent' : 'story')}
                    accessibilityLabel={chapterSortMode === 'story' ? 'Story Order (Prologue → Chapters). Click for Recent.' : 'Recently Edited. Click for Story Order.'}
                    className={`w-[34px] h-[34px] rounded-button border-2 border-ink items-center justify-center ${chapterSortMode === 'recent' ? 'bg-yellow' : 'bg-white'}`}
                  >
                    <Icon glyph={chapterSortMode === 'story' ? ICONS.book : ICONS.clock} size={15} color={INK} />
                  </TouchableOpacity>
                )}
                {renderAddNew()}
              </View>
            </View>

            <BrutalDivider thickness={BORDER.width} />

            {/* Content Area Below Header */}
            <View className="flex-1 overflow-hidden">
              {activeTab === 'editor'
                ? renderEditorView()
                : activeTab === 'gallery'
                  ? renderGalleryView()
                  : activeTab === 'fashion'
                    ? renderFashionView()
                    : renderSeriesOrChaptersView()}
            </View>
          </View>
        )}
      </View>

      {/* Fashion Series Logo & Settings Modal */}
      {renderFashionSettingsModal()}

      {/* Gameplay Series Settings Modal */}
      {renderGameplaySettingsModal()}

      {/* Project Modal: Add Project & Edit Project / Project Settings */}
      <ProjectModal
        visible={isProjectModalOpen}
        mode={projectModalMode}
        project={projectModalMode === 'edit' ? project : null}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        onDelete={projects.length > 1 ? handleDeleteProject : undefined}
      />

      {/* Profile & Settings Modal */}
      <ProfileSettingsModal
        visible={isProfileModalOpen}
        profile={profile}
        projects={projects}
        totalArticles={allWorkspaceEntries.length}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={(updated) => {
          setProfile(updated);
          saveProfile(updated).catch(err => console.warn('[MainScreen] Failed to save profile in DB:', err));
        }}
      />
    </View>
  );
};

export default MainScreen;

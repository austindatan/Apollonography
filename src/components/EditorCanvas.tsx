/**
 * src/components/EditorCanvas.tsx
 *
 * Neobrutalist Editor Canvas:
 *  - One big BrutalBox panel on the cream page
 *  - Formatting toolbar as a row of bordered square icon buttons
 *  - Section headers uppercase with thick ink underline (3px)
 *  - Info table with crisp ink grid lines
 *  - Ability list rows separated by 2px ink lines, with label as small colored pill and name in bold caps
 *  - Interactive emoji selector with bordered buttons
 *  - Supports exact category behaviors (Gameplay vs Lore & Story)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BORDER,
  CREAM,
  FONTS,
  INK,
  LAVENDER,
  ORANGE,
  RADIUS,
  SHADOW,
  SPACE,
  TEAL,
  TYPE,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Ability, AttributeOption, AttributeType, Entry, InfoField, Project, RelationshipItem, Section, Tag } from '../types/models';
import { AbilityList } from './AbilityList';
import { MiniTipTapEditor } from './MiniTipTapEditor';
import { MiniRichTextView } from './MiniRichTextView';
import { migrateAbilities, DEFAULT_EVOLUTION_ABILITIES } from '../utils/abilityUtils';
import BrutalBox from './brutal/BrutalBox';
import BrutalButton from './brutal/BrutalButton';
import BrutalDivider from './brutal/BrutalDivider';
import BrutalPill from './brutal/BrutalPill';
import BrutalTextInput from './brutal/BrutalTextInput';
import { Icon, ICONS } from './Icon';
import { TagPill } from './TagPill';
import { ImageFrame } from './ImageFrame';
import { AlignedSeriesLogo } from './AlignedSeriesLogo';
import { pickImageFromComputer } from '../native/FilePicker';
import { cleanMojibake } from '../hooks/useEntries';
import { registerOrReuseImage, resolveImageSync, updateEntryImageSlot } from '../services/imageService';
import { storageEvents, STORAGE_EVENTS } from '../db/storageEvents';
import { useLightbox } from '../context/LightboxContext';
import { LoreVisualMediaFrame } from './LoreVisualMediaFrame';
import { AttributeDropdown } from './AttributeDropdown';
import {
  getProjectAttributeOptions,
  addAttributeOption,
  renameAttributeOption,
  deleteAttributeOption,
  isAttributeOptionInUse,
  clearAttributeFromEntries,
  saveAttributeOption,
  deleteAttributeOptionFromDb,
} from '../hooks/useAttributes';
import { getStorageAdapter } from '../db/database';

const AVAILABLE_EMOJIS = [
  '⚡', '💥', '🔥', '❄️', '🌪️', '🌊', '🌱', '☀️', '🌙', '☄️',
  '⚔️', '🗡️', '🛡️', '🏹', '🎯', '🪓', '🔱', '💣', '🔫', '🥊',
  '🔮', '✨', '🌟', '💫', '🌀', '☠️', '🩸', '🧪', '🧿', '🧬',
  '❤️', '💚', '🩹', '👑', '🕊️', '🦅', '🐺', '🐉', '🦁', '👁️',
  '⚙️', '🔋', '💎', '⌛', '🔑', '🏷️', '📜', '🔔', '🚀', '🌌',
  '🏆', '🎖️', '💠', '⭐', '🪄', '🔆', '🔅', '⚜️', '🪐', '🌠',
];

const COLOR_WHEEL_HUES = [
  '#FF3B30', '#FF7A00', '#FFCC00', '#FFEB3B',
  '#A3E635', '#22C55E', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#18181B',
];

const PRESET_TAG_COLORS = [
  '#4ECDC4', '#FFD93D', '#FF6B6B', '#FF9F5A',
  '#B59CDD', '#38BDF8', '#6BCB77', '#141414',
];

export interface UnitEvolutionItem {
  id: string;
  name: string;
  desc?: string;
  image?: any;
  class?: string;
  element?: string;
  rarity?: string;
  series?: string;
  abilities?: Ability[];
  passiveEmoji?: string;
  passiveName?: string;
  passiveDesc?: string;
  skill1Emoji?: string;
  skill1Name?: string;
  skill1Desc?: string;
  skill2Emoji?: string;
  skill2Name?: string;
  skill2Desc?: string;
  skill3Emoji?: string;
  skill3Name?: string;
  skill3Desc?: string;
  ultimateEmoji?: string;
  ultimateName?: string;
  ultimateDesc?: string;
}

export interface WardrobeCosmeticItem {
  id: string;
  wardrobeName: string;
  seriesName: string;
  about: string;
  splash?: any;
  gallery?: any;
}

interface Props {
  entry: Entry;
  project: Project;
  accentColor: string;
  allEntries?: Entry[];
  onUpdateEntry?: (updated: Entry) => void;
  onDeleteEntry?: (entryId: string) => void;
  onUpdateProject?: (updated: Project) => void;
  availableFashionSeries?: string[];
  onAddFashionSeries?: (seriesName: string) => void;
  fashionConfigs?: Array<{ id: string; name: string; logo?: any; banners?: any[];[key: string]: any }>;
}

export const EditorCanvas: React.FC<Props> = ({
  entry,
  project,
  accentColor,
  allEntries = [],
  onUpdateEntry,
  onDeleteEntry,
  onUpdateProject,
  availableFashionSeries = [],
  onAddFashionSeries,
  fashionConfigs = [],
}) => {
  const { openLightbox } = useLightbox();
  const isGameplay = project.type === 'gameplay';
  const isLore = project.type === 'lore';
  const isCosmetics = project.type === 'cosmetics';
  const [isEditing, setIsEditing] = useState(false);
  const [viewSplashMode, setViewSplashMode] = useState<'default' | 'e2'>('default');
  const [loreContainerWidth, setLoreContainerWidth] = useState(600);
  const scrollViewRef = useRef<ScrollView>(null);

  // Visual Media Images
  const [panelImage, setPanelImage] = useState<any>(entry.thumbnail);
  const [galleryImage, setGalleryImage] = useState<any>(entry.portrait ?? entry.thumbnail);
  const [splashImage, setSplashImage] = useState<any>(entry.splash ?? entry.portrait ?? entry.thumbnail);
  const [e2GalleryImage, setE2GalleryImage] = useState<any>(entry.e2Portrait ?? entry.portrait ?? entry.thumbnail);
  const [e2SplashImage, setE2SplashImage] = useState<any>(entry.e2Splash ?? entry.splash ?? entry.thumbnail);

  // Image Chooser Modal state
  const [activeChooserSlot, setActiveChooserSlot] = useState<string | null>(null);

  // Shared fields
  const [name, setName] = useState(entry.title);
  const [title, setTitle] = useState(
    entry.subtitle ||
    entry.infoFields.find(f => f.key.toLowerCase() === 'role' || f.key.toLowerCase() === 'title')?.value ||
    (entry.tags.map(t => t.name).join(' · ') || 'Character Article')
  );
  const [tags, setTags] = useState<Tag[]>(entry.tags);
  const [overview, setOverview] = useState(
    entry.sections.find(s => s.title.toLowerCase() === 'overview')?.body ?? entry.summary
  );
  const [isEditingOverview, setIsEditingOverview] = useState(false);

  // Tag creation state & color wheel
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4ECDC4');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const existingProjectTags = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    if (allEntries && Array.isArray(allEntries)) {
      allEntries.forEach(e => {
        if (e && (!e.projectId || e.projectId === project.id) && Array.isArray(e.tags)) {
          e.tags.forEach(t => {
            if (t && t.name && !map.has(t.name.toLowerCase())) {
              map.set(t.name.toLowerCase(), { id: t.id, name: t.name, color: t.color || '#4ECDC4' });
            }
          });
        }
      });
    }
    if (tags && Array.isArray(tags)) {
      tags.forEach(t => {
        if (t && t.name && !map.has(t.name.toLowerCase())) {
          map.set(t.name.toLowerCase(), { id: t.id, name: t.name, color: t.color || '#4ECDC4' });
        }
      });
    }
    return Array.from(map.values());
  }, [allEntries, tags, project.id]);

  const filteredExistingTags = React.useMemo(() => {
    if (!newTagName.trim()) return existingProjectTags;
    return existingProjectTags.filter(t =>
      t.name.toLowerCase().includes(newTagName.trim().toLowerCase())
    );
  }, [existingProjectTags, newTagName]);

  // Characters & Gameplay fields
  const [heroClass, setHeroClass] = useState(
    entry.infoFields.find(f => f.key.toLowerCase() === 'class')?.value ?? ''
  );
  const [heroElement, setHeroElement] = useState(
    entry.infoFields.find(f => f.key.toLowerCase() === 'element' || f.key.toLowerCase() === 'att.')?.value ?? ''
  );
  const [heroRarity, setHeroRarity] = useState(
    cleanMojibake(entry.infoFields.find(f => f.key.toLowerCase() === 'rarity' || f.key.toLowerCase() === 'luck')?.value ?? '★★★★★ (5★)')
  );
  const [gameplaySeries, setGameplaySeries] = useState(
    entry.infoFields.find(f => f.key.toLowerCase() === 'series')?.value ?? ''
  );

  // Dynamic project attribute options
  const classOptions = React.useMemo(
    () => getProjectAttributeOptions(project, 'class', allEntries),
    [project, allEntries]
  );
  const elementOptions = React.useMemo(
    () => getProjectAttributeOptions(project, 'element', allEntries),
    [project, allEntries]
  );
  const rarityOptions = React.useMemo(
    () => getProjectAttributeOptions(project, 'rarity', allEntries),
    [project, allEntries]
  );
  const seriesOptions = React.useMemo(
    () => getProjectAttributeOptions(project, 'series', allEntries),
    [project, allEntries]
  );

  const syncInfoField = (key: string, value: string) => {
    const existing = entry.infoFields || [];
    const idx = existing.findIndex(f => {
      if (key.toLowerCase() === 'class') return f.key.toLowerCase() === 'class';
      if (key.toLowerCase() === 'element') return f.key.toLowerCase() === 'element' || f.key.toLowerCase() === 'att.';
      if (key.toLowerCase() === 'rarity') return f.key.toLowerCase() === 'rarity' || f.key.toLowerCase() === 'luck';
      if (key.toLowerCase() === 'series') return f.key.toLowerCase() === 'series';
      return f.key.toLowerCase() === key.toLowerCase();
    });

    let nextInfoFields: InfoField[];
    if (idx >= 0) {
      nextInfoFields = existing.map((f, i) => (i === idx ? { ...f, value } : f));
    } else {
      nextInfoFields = [...existing, { key: key.charAt(0).toUpperCase() + key.slice(1), value }];
    }
    entry.infoFields = nextInfoFields;
    onUpdateEntry?.({ ...entry, infoFields: nextInfoFields });
  };

  const handleSelectAttribute = (type: AttributeType, option: AttributeOption) => {
    if (type === 'class') {
      setHeroClass(option.name);
      syncInfoField('class', option.name);
    } else if (type === 'element') {
      setHeroElement(option.name);
      syncInfoField('element', option.name);
    } else if (type === 'rarity') {
      setHeroRarity(option.name);
      syncInfoField('rarity', option.name);
    } else if (type === 'series') {
      setGameplaySeries(option.name);
      syncInfoField('series', option.name);
    }
  };

  const handleAddAttributeOption = async (type: AttributeType, name: string, color?: string) => {
    try {
      const { updatedProject, newOption } = addAttributeOption(project, type, name, color, allEntries);
      await saveAttributeOption(project.id, newOption, type);
      if (type === 'series') {
        const adapter = await getStorageAdapter();
        await adapter.executeSql(
          `INSERT OR REPLACE INTO series (
            id, project_id, name, description, badge, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [newOption.id, project.id, newOption.name, '', '', Date.now(), Date.now()]
        );
      }
      onUpdateProject?.(updatedProject);
      handleSelectAttribute(type, newOption);
    } catch (err) {
      console.warn('[EditorCanvas] Failed to persist new attribute/series:', err);
    }
  };

  const handleRenameAttributeOption = async (type: AttributeType, id: string, newName: string, newColor?: string) => {
    try {
      const { updatedProject, updatedOption } = renameAttributeOption(project, type, id, newName, newColor, allEntries);
      if (updatedOption) {
        await saveAttributeOption(project.id, updatedOption, type);
        onUpdateProject?.(updatedProject);
        if (type === 'class') { setHeroClass(updatedOption.name); syncInfoField('class', updatedOption.name); }
        else if (type === 'element') { setHeroElement(updatedOption.name); syncInfoField('element', updatedOption.name); }
        else if (type === 'rarity') { setHeroRarity(updatedOption.name); syncInfoField('rarity', updatedOption.name); }
        else if (type === 'series') { setGameplaySeries(updatedOption.name); syncInfoField('series', updatedOption.name); }
      }
    } catch (err) {
      console.warn('[EditorCanvas] Failed to persist renamed attribute:', err);
    }
  };

  const handleDeleteAttributeOption = async (type: AttributeType, id: string) => {
    try {
      const targetOption = getProjectAttributeOptions(project, type, allEntries).find(
        o => o.id === id || o.id.toLowerCase() === id.toLowerCase() || o.name.toLowerCase() === id.toLowerCase()
      );
      if (!targetOption) return;

      await deleteAttributeOptionFromDb(project.id, targetOption.id);
      const { updatedProject } = deleteAttributeOption(project, type, id, allEntries);
      onUpdateProject?.(updatedProject);

      if (allEntries && Array.isArray(allEntries)) {
        clearAttributeFromEntries(allEntries, type, targetOption);
      }

      if (type === 'class' && (heroClass === id || heroClass.toLowerCase() === targetOption.name.toLowerCase())) {
        setHeroClass('');
        syncInfoField('class', '');
      } else if (type === 'element' && (heroElement === id || heroElement.toLowerCase() === targetOption.name.toLowerCase())) {
        setHeroElement('');
        syncInfoField('element', '');
      } else if (type === 'rarity' && (heroRarity === id || heroRarity.toLowerCase() === targetOption.name.toLowerCase())) {
        setHeroRarity('');
        syncInfoField('rarity', '');
      } else if (type === 'series' && (gameplaySeries === id || gameplaySeries.toLowerCase() === targetOption.name.toLowerCase())) {
        setGameplaySeries('');
        syncInfoField('series', '');
      }
    } catch (err) {
      console.warn('[EditorCanvas] Failed to delete attribute option:', err);
    }
  };

  const handleSelectEvolutionAttribute = (evoId: string, type: AttributeType, option: AttributeOption) => {
    handleUpdateEvolution(evoId, type as keyof UnitEvolutionItem, option.id);
  };

  // Flexible Combat Kit Abilities
  const [abilities, setAbilities] = useState<Ability[]>(() => migrateAbilities(entry));
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);

  // Unit Evolution Forms (independent awakened form, decoupled from entry.portrait)
  const [evolutions, setEvolutions] = useState<UnitEvolutionItem[]>(() => {
    if (entry.evolutions !== undefined) {
      return (entry.evolutions || []).map(e => ({
        ...e,
        abilities: migrateAbilities(e, DEFAULT_EVOLUTION_ABILITIES),
      }));
    }
    return [];
  });

  const handleAddEvolution = () => {
    const nextIdx = evolutions.length + 1;
    const newEvo: UnitEvolutionItem = {
      id: `evo-${Date.now()}`,
      name: `Evolution Form 0${nextIdx}`,
      desc: '',
      image: undefined,
      abilities: [],
    };
    const nextEvos = [...evolutions, newEvo];
    setEvolutions(nextEvos);
    entry.evolutions = nextEvos;
    if (onUpdateEntry) {
      onUpdateEntry({ ...entry, evolutions: nextEvos });
    }
  };

  const handleRemoveEvolution = (id: string) => {
    const nextEvos = evolutions.filter(e => e.id !== id);
    setEvolutions(nextEvos);
    entry.evolutions = nextEvos;
    if (onUpdateEntry) {
      onUpdateEntry({ ...entry, evolutions: nextEvos });
    }
  };

  const handleUpdateEvolution = (id: string, field: keyof UnitEvolutionItem, val: any) => {
    const nextEvos = evolutions.map(e => (e.id === id ? { ...e, [field]: val } : e));
    setEvolutions(nextEvos);
    if (onUpdateEntry) {
      onUpdateEntry({ ...entry, evolutions: nextEvos });
    }
  };

  // Character Cosmetics fields & Multiple Wardrobes
  const [subClass, setSubClass] = useState(
    entry.infoFields.find(f => f.key.toLowerCase().includes('sub'))?.value ?? ''
  );
  const [wardrobes, setWardrobes] = useState<WardrobeCosmeticItem[]>(() => {
    if (entry.wardrobes && entry.wardrobes.length > 0) {
      return entry.wardrobes;
    }
    if (project.type === 'cosmetics') {
      const defaultWardrobeGallery = entry.portrait ?? entry.thumbnail;
      const initialSeries = (availableFashionSeries && availableFashionSeries.length > 0)
        ? availableFashionSeries[0]
        : (project.categories.find(c => c.id !== 'all')?.name ?? 'Standard');
      return [
        {
          id: 'w-1',
          wardrobeName: entry.title.includes('(') ? entry.title.split('(')[1].replace(')', '') : 'Default Wardrobe',
          seriesName: entry.infoFields.find(f => f.key.toLowerCase().includes('fashion') || f.key.toLowerCase().includes('series'))?.value ?? initialSeries,
          about: entry.sections.find(s => s.title.toLowerCase().includes('cosmetic') || s.title.toLowerCase().includes('series'))?.body ??
            'Brand line and wardrobe concept.',
          splash: entry.splash ?? entry.portrait ?? entry.thumbnail,
          gallery: defaultWardrobeGallery,
        },
      ];
    }
    return entry.wardrobes ?? [];
  });
  const [openDropdownWardrobeId, setOpenDropdownWardrobeId] = useState<string | null>(null);
  const [activeAttributeDropdown, setActiveAttributeDropdown] = useState<string | null>(null);
  const [isCreatingSeriesForId, setIsCreatingSeriesForId] = useState<string | null>(null);
  const [newSeriesNameInput, setNewSeriesNameInput] = useState('');


  const handleAddWardrobe = () => {
    const nextIdx = wardrobes.length + 1;
    const defaultSeries = (availableFashionSeries && availableFashionSeries.length > 0)
      ? availableFashionSeries[0]
      : (project.categories.find(c => c.id !== 'all')?.name ?? (isGameplay ? '' : 'Standard'));
    const defaultSplashArt = entry.splash ?? entry.portrait ?? entry.thumbnail;
    const defaultGalleryArt = entry.portrait ?? entry.thumbnail;
    const newWardrobe: WardrobeCosmeticItem = {
      id: `w-${Date.now()}`,
      wardrobeName: isGameplay ? `Outfit 0${nextIdx}` : `Wardrobe Outfit 0${nextIdx}`,
      seriesName: isGameplay ? '' : defaultSeries,
      about: isGameplay ? 'Alternative wardrobe and outfit concept.' : 'Designer combat tailoring with reinforced aesthetic accents.',
      splash: defaultSplashArt,
      gallery: defaultGalleryArt,
    };
    setWardrobes(prev => {
      const next = [...prev, newWardrobe];
      entry.wardrobes = next;
      if (onUpdateEntry) onUpdateEntry({ ...entry, wardrobes: next });
      return next;
    });
  };

  const handleRemoveWardrobe = (id: string) => {
    setWardrobes(prev => {
      const next = prev.filter(w => w.id !== id);
      entry.wardrobes = next;
      if (onUpdateEntry) onUpdateEntry({ ...entry, wardrobes: next });
      return next;
    });
  };

  const handleUpdateWardrobe = (id: string, updates: Partial<WardrobeCosmeticItem>) => {
    setWardrobes(prev => {
      const updated = prev.map(w => (w.id === id ? { ...w, ...updates } : w));
      entry.wardrobes = updated;
      if (onUpdateEntry) onUpdateEntry({ ...entry, wardrobes: updated });
      return updated;
    });
  };

  const handleCreateNewSeriesForWardrobe = (wardrobeId: string) => {
    const trimmed = newSeriesNameInput.trim();
    if (!trimmed) return;
    if (onAddFashionSeries) {
      onAddFashionSeries(trimmed);
    }
    handleUpdateWardrobe(wardrobeId, { seriesName: trimmed });
    setIsCreatingSeriesForId(null);
    setNewSeriesNameInput('');
    setOpenDropdownWardrobeId(null);
  };

  // Lore & Story fields
  const [role, setRole] = useState(
    entry.infoFields.find(f => f.key.toLowerCase() === 'role')?.value ?? ''
  );
  const [backstory, setBackstory] = useState(
    entry.sections.find(s => s.title.toLowerCase() === 'backstory')?.body ?? ''
  );

  // Hidden by default in Lore & Story unless entry already has items
  const [showLoreVisuals, setShowLoreVisuals] = useState(() => {
    return Boolean(
      entry.sections?.some(
        s => (s.title.toLowerCase() === 'visual media' || s.title.toLowerCase() === 'gallery') &&
          Array.isArray(s.items) &&
          s.items.length > 0
      )
    );
  });
  const [showLoreRelationships, setShowLoreRelationships] = useState(() => {
    return Boolean(
      entry.sections?.some(
        s => s.title.toLowerCase() === 'relationships' && Array.isArray(s.items) && s.items.length > 0
      )
    );
  });
  const [showLoreAdditionalInfo, setShowLoreAdditionalInfo] = useState(() => {
    const sec = entry.sections?.find(
      s => (s.title.toLowerCase() === 'additional info' || s.title.toLowerCase() === 'additional archival info' || s.type === 'infoTable')
    );
    return Boolean(sec && Array.isArray(sec.items) && sec.items.length > 0);
  });
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Dynamic custom sections added by user
  const [customSections, setCustomSections] = useState<Array<{ id: string; title: string; body: string }>>(() => {
    const standardTitles = ['overview', 'backstory', 'relationships', 'visual media', 'gallery', 'additional info', 'additional archival info'];
    return (entry.sections || [])
      .filter(s => s && s.title && !standardTitles.includes(s.title.toLowerCase()))
      .map((s, idx) => ({
        id: s.id || `custom-sec-${idx}-${Date.now()}`,
        title: s.title,
        body: s.body || '',
      }));
  });

  const [visualMediaList, setVisualMediaList] = useState<Array<{ id: string; title: string; image: any }>>(() => {
    const existingSec = entry.sections?.find(s => s.title.toLowerCase() === 'visual media' || s.title.toLowerCase() === 'gallery');
    if (existingSec && Array.isArray(existingSec.items) && existingSec.items.length > 0) {
      return existingSec.items.map((item: any, idx: number) => ({
        id: item.id || `vm-${idx}-${Date.now()}`,
        title: item.title || (idx === 0 ? 'PANEL ART' : idx === 1 ? 'GALLERY ART' : `ILLUSTRATION 0${idx + 1}`),
        image: item.image || item.source || (idx === 0 ? entry.thumbnail : (entry.portrait ?? entry.thumbnail)),
      }));
    }
    return [];
  });

  const syncVisualMediaToEntry = (nextList: Array<{ id: string; title: string; image: any }>) => {
    const existingSections = entry.sections || [];
    const secIdx = existingSections.findIndex(s => s.title.toLowerCase() === 'visual media' || s.title.toLowerCase() === 'gallery');
    let nextSections: Section[];
    if (secIdx >= 0) {
      nextSections = existingSections.map((s, idx) => idx === secIdx ? { ...s, items: nextList } : s);
    } else {
      nextSections = [...existingSections, { title: 'Visual Media', items: nextList }];
    }
    entry.sections = nextSections;
    onUpdateEntry?.({
      ...entry,
      sections: nextSections,
    });
  };

  const handleAddVisualMedia = () => {
    const nextIdx = visualMediaList.length + 1;
    const newMedia = {
      id: `vm-${Date.now()}`,
      title: `ILLUSTRATION 0${nextIdx}`,
      image: entry.splash ?? entry.portrait ?? entry.thumbnail,
    };
    const nextList = [...visualMediaList, newMedia];
    setVisualMediaList(nextList);
    syncVisualMediaToEntry(nextList);
  };

  const handleUpdateVisualMedia = (id: string, updates: Partial<{ title: string; image: any }>) => {
    const nextList = visualMediaList.map(item => item.id === id ? { ...item, ...updates } : item);
    setVisualMediaList(nextList);
    if (nextList.length > 0 && nextList[0].id === id && updates.image) {
      setPanelImage(updates.image);
    }
    if (nextList.length > 1 && nextList[1].id === id && updates.image) {
      setGalleryImage(updates.image);
    }
    syncVisualMediaToEntry(nextList);
  };

  const handleRemoveVisualMedia = (id: string) => {
    const nextList = visualMediaList.filter(item => item.id !== id);
    setVisualMediaList(nextList);
    syncVisualMediaToEntry(nextList);
  };

  const handleHideVisualMedia = () => {
    setShowLoreVisuals(false);
    const nextSections = (entry.sections || []).filter(
      s => s.title.toLowerCase() !== 'visual media' && s.title.toLowerCase() !== 'gallery'
    );
    entry.sections = nextSections;
    onUpdateEntry?.({ ...entry, sections: nextSections });
  };

  const [relationships, setRelationships] = useState<RelationshipItem[]>(() => {
    const existing = entry.sections?.find(s => s.title.toLowerCase() === 'relationships')?.items as RelationshipItem[] | undefined;
    if (existing && existing.length > 0) return existing;
    return [];
  });

  const [additionalInfo, setAdditionalInfo] = useState<Array<{ key: string; value: string }>>(() => {
    const sec = entry.sections?.find(
      s => (s.title.toLowerCase() === 'additional info' || s.title.toLowerCase() === 'additional archival info' || s.type === 'infoTable')
    );
    if (sec && Array.isArray(sec.items) && sec.items.length > 0) {
      return sec.items.map((item: any) => ({ key: item.key || 'Field', value: item.value || '' }));
    }
    return [];
  });

  const syncRelationshipsToEntry = (next: RelationshipItem[]) => {
    const existingSections = entry.sections || [];
    const relSecIdx = existingSections.findIndex(s => s.title.toLowerCase() === 'relationships');
    let nextSections: Section[];
    if (relSecIdx >= 0) {
      nextSections = existingSections.map((s, idx) => idx === relSecIdx ? { ...s, items: next } : s);
    } else {
      nextSections = [...existingSections, { title: 'Relationships', items: next }];
    }
    entry.sections = nextSections;
    onUpdateEntry?.({ ...entry, sections: nextSections });
  };

  const handleAddRelationship = () => {
    const candidate = allEntries.find(e => e.id !== entry.id && !relationships.some(r => r.targetEntryId === e.id)) ??
      allEntries.find(e => e.id !== entry.id) ?? entry;
    const newRel: RelationshipItem = {
      id: `rel-${Date.now()}`,
      targetEntryId: candidate.id,
      relation: 'Travel Companion',
    };
    const next = [...relationships, newRel];
    setRelationships(next);
    syncRelationshipsToEntry(next);
  };

  const handleUpdateRelationship = (id: string, updates: Partial<RelationshipItem>) => {
    const next = relationships.map(r => r.id === id ? { ...r, ...updates } : r);
    setRelationships(next);
    syncRelationshipsToEntry(next);
  };

  const handleRemoveRelationship = (id: string) => {
    const next = relationships.filter(r => r.id !== id);
    setRelationships(next);
    syncRelationshipsToEntry(next);
  };

  const handleHideRelationships = () => {
    setShowLoreRelationships(false);
    const nextSections = (entry.sections || []).filter(
      s => s.title.toLowerCase() !== 'relationships'
    );
    entry.sections = nextSections;
    onUpdateEntry?.({ ...entry, sections: nextSections });
  };

  const syncAdditionalInfoToEntry = (next: Array<{ key: string; value: string }>) => {
    const nonArchivalFields = (entry.infoFields || []).filter(
      f => ['role', 'class', 'element', 'rarity', 'series', 'luck', 'att.'].includes(f.key.toLowerCase())
    );
    const updatedInfoFields: InfoField[] = [
      ...nonArchivalFields,
      ...next.map(item => ({ key: item.key, value: item.value })),
    ];
    entry.infoFields = updatedInfoFields;

    const existingSections = entry.sections || [];
    const addInfoSecIdx = existingSections.findIndex(
      s => s.title.toLowerCase() === 'additional info' || s.title.toLowerCase() === 'additional archival info' || s.type === 'infoTable'
    );
    let nextSections: Section[];
    if (addInfoSecIdx >= 0) {
      nextSections = existingSections.map((s, idx) => idx === addInfoSecIdx ? { ...s, items: next } : s);
    } else {
      nextSections = [...existingSections, { title: 'Additional Info', type: 'infoTable', items: next }];
    }
    entry.sections = nextSections;
    onUpdateEntry?.({ ...entry, infoFields: updatedInfoFields, sections: nextSections });
  };

  const handleAddAdditionalInfo = () => {
    const next = [...additionalInfo, { key: 'Custom Field', value: 'Record details...' }];
    setAdditionalInfo(next);
    syncAdditionalInfoToEntry(next);
  };

  const handleUpdateAdditionalInfo = (index: number, key: string, value: string) => {
    const next = additionalInfo.map((item, idx) => idx === index ? { key, value } : item);
    setAdditionalInfo(next);
    syncAdditionalInfoToEntry(next);
  };

  const handleRemoveAdditionalInfo = (index: number) => {
    const next = additionalInfo.filter((_, idx) => idx !== index);
    setAdditionalInfo(next);
    syncAdditionalInfoToEntry(next);
  };

  const handleHideAdditionalInfo = () => {
    setShowLoreAdditionalInfo(false);
    const nonArchival = (entry.infoFields || []).filter(
      f => ['role', 'class', 'element', 'rarity', 'series', 'luck', 'att.'].includes(f.key.toLowerCase())
    );
    entry.infoFields = nonArchival;

    const nextSections = (entry.sections || []).filter(
      s => s.title.toLowerCase() !== 'additional info' && s.title.toLowerCase() !== 'additional archival info' && s.type !== 'infoTable'
    );
    entry.sections = nextSections;
    onUpdateEntry?.({ ...entry, infoFields: nonArchival, sections: nextSections });
  };

  useEffect(() => {
    setName(entry.title);
    const initialTitle = entry.subtitle ||
      entry.infoFields.find(f => f.key.toLowerCase() === 'role' || f.key.toLowerCase() === 'title')?.value ||
      (entry.tags.map(t => t.name).join(' · ') || 'Character Article');
    setTitle(initialTitle);
    setRole(initialTitle);
    setTags(entry.tags);
    setOverview(
      entry.sections.find(s => s.title.toLowerCase() === 'overview')?.body ?? entry.summary
    );
    setIsEditingOverview(false);
    setHeroClass(entry.infoFields.find(f => f.key.toLowerCase() === 'class')?.value ?? '');
    setHeroElement(entry.infoFields.find(f => f.key.toLowerCase() === 'element' || f.key.toLowerCase() === 'att.')?.value ?? '');
    setHeroRarity(cleanMojibake(entry.infoFields.find(f => f.key.toLowerCase() === 'rarity' || f.key.toLowerCase() === 'luck')?.value ?? ''));
    setGameplaySeries(entry.infoFields.find(f => f.key.toLowerCase() === 'series')?.value ?? '');
    if (entry.evolutions !== undefined) {
      setEvolutions(
        (entry.evolutions || []).map(e => ({
          ...e,
          abilities: migrateAbilities(e, []),
        }))
      );
    } else {
      setEvolutions([]);
    }
    if (entry.wardrobes && entry.wardrobes.length > 0) {
      setWardrobes(entry.wardrobes);
    } else if (project.type === 'cosmetics') {
      const defaultWardrobeGallery = entry.portrait ?? entry.thumbnail;
      const initialWardrobes = [
        {
          id: 'w-1',
          wardrobeName: entry.title.includes('(') ? entry.title.split('(')[1].replace(')', '') : 'Default Wardrobe',
          seriesName: entry.infoFields.find(f => f.key.toLowerCase().includes('fashion') || f.key.toLowerCase().includes('series'))?.value ?? '',
          about: entry.sections.find(s => s.title.toLowerCase().includes('cosmetic') || s.title.toLowerCase().includes('series'))?.body ?? '',
          splash: entry.splash ?? entry.portrait ?? entry.thumbnail,
          gallery: defaultWardrobeGallery,
        },
      ];
      setWardrobes(initialWardrobes);
      entry.wardrobes = initialWardrobes;
    } else {
      setWardrobes(entry.wardrobes ?? []);
    }
    setRole(entry.infoFields.find(f => f.key.toLowerCase() === 'role')?.value ?? '');
    setBackstory(
      entry.sections.find(s => s.title.toLowerCase() === 'backstory')?.body ?? ''
    );
    const hasVisuals = Boolean(
      entry.sections?.some(s => (s.title.toLowerCase() === 'visual media' || s.title.toLowerCase() === 'gallery') && Array.isArray(s.items) && s.items.length > 0)
    );
    const hasRels = Boolean(
      entry.sections?.some(s => s.title.toLowerCase() === 'relationships' && Array.isArray(s.items) && s.items.length > 0)
    );
    const existingAddInfoSec = entry.sections?.find(
      s => (s.title.toLowerCase() === 'additional info' || s.title.toLowerCase() === 'additional archival info' || s.type === 'infoTable')
    );
    const hasAddInfo = Boolean(existingAddInfoSec && Array.isArray(existingAddInfoSec.items) && existingAddInfoSec.items.length > 0);

    setShowLoreVisuals(hasVisuals);
    setShowLoreRelationships(hasRels);
    setShowLoreAdditionalInfo(hasAddInfo);
    const standardTitles = ['overview', 'backstory', 'relationships', 'visual media', 'gallery', 'additional info', 'additional archival info'];
    const loadedCustomSections = (entry.sections || [])
      .filter(s => s && s.title && !standardTitles.includes(s.title.toLowerCase()))
      .map((s, idx) => ({
        id: s.id || `custom-sec-${idx}-${Date.now()}`,
        title: s.title,
        body: s.body || '',
      }));
    setCustomSections(loadedCustomSections);

    const existingRels = entry.sections?.find(s => s.title.toLowerCase() === 'relationships')?.items as RelationshipItem[] | undefined;
    if (existingRels && existingRels.length > 0) {
      setRelationships(existingRels);
    } else {
      setRelationships([]);
    }

    if (existingAddInfoSec && Array.isArray(existingAddInfoSec.items) && existingAddInfoSec.items.length > 0) {
      setAdditionalInfo(existingAddInfoSec.items.map((item: any) => ({ key: item.key || 'Field', value: item.value || '' })));
    } else {
      setAdditionalInfo([]);
    }
    const existingMediaSec = entry.sections?.find(s => s.title.toLowerCase() === 'visual media' || s.title.toLowerCase() === 'gallery');
    if (existingMediaSec && Array.isArray(existingMediaSec.items) && existingMediaSec.items.length > 0) {
      setVisualMediaList(existingMediaSec.items.map((item: any, idx: number) => ({
        id: item.id || `vm-${idx}-${Date.now()}`,
        title: item.title || (idx === 0 ? 'PANEL ART' : idx === 1 ? 'GALLERY ART' : `ILLUSTRATION 0${idx + 1}`),
        image: item.image || item.source || (idx === 0 ? entry.thumbnail : (entry.portrait ?? entry.thumbnail)),
      })));
    } else {
      setVisualMediaList([]);
    }
    setPanelImage(entry.thumbnail);
    setGalleryImage(entry.portrait ?? entry.thumbnail);
    setSplashImage(entry.splash ?? entry.portrait ?? entry.thumbnail);
    setE2GalleryImage(entry.e2Portrait ?? entry.portrait ?? entry.thumbnail);
    setE2SplashImage(entry.e2Splash ?? entry.splash ?? entry.thumbnail);
    setActiveChooserSlot(null);
    setAbilities(migrateAbilities(entry));
  }, [entry.id]);

  useEffect(() => {
    setPanelImage(entry.thumbnail);
    setGalleryImage(entry.portrait ?? entry.thumbnail);
    setSplashImage(entry.splash ?? entry.portrait ?? entry.thumbnail);
    setE2GalleryImage(entry.e2Portrait ?? entry.portrait ?? entry.thumbnail);
    setE2SplashImage(entry.e2Splash ?? entry.splash ?? entry.thumbnail);
  }, [entry.thumbnail, entry.portrait, entry.splash, entry.e2Portrait, entry.e2Splash]);

  useEffect(() => {
    const unsubscribe = storageEvents.on(STORAGE_EVENTS.ENTRIES_CHANGED, async (payload: any) => {
      if (payload?.entryId && payload.entryId !== entry.id) return;
      try {
        const adapter = await getStorageAdapter();
        const rows = await adapter.executeSql<any[]>(
          'SELECT thumbnail_image_id, portrait_image_id, splash_image_id, e2_portrait_image_id, e2_splash_image_id FROM entries WHERE id = ?;',
          [entry.id]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          if (r.thumbnail_image_id) {
            const res = resolveImageSync(r.thumbnail_image_id);
            if (res) setPanelImage(res);
          }
          if (r.portrait_image_id) {
            const res = resolveImageSync(r.portrait_image_id);
            if (res) setGalleryImage(res);
          }
          if (r.splash_image_id) {
            const res = resolveImageSync(r.splash_image_id);
            if (res) setSplashImage(res);
          }
          if (r.e2_portrait_image_id) {
            const res = resolveImageSync(r.e2_portrait_image_id);
            if (res) setE2GalleryImage(res);
          }
          if (r.e2_splash_image_id) {
            const res = resolveImageSync(r.e2_splash_image_id);
            if (res) setE2SplashImage(res);
          }
        }
      } catch (err) {
        console.warn('[EditorCanvas] Failed to refresh images from DB on entries-changed:', err);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [entry.id]);

  const getCurrentSlotImage = (slot: string | null) => {
    if (!slot) return panelImage;
    if (slot === 'panel') return panelImage;
    if (slot === 'gallery') return galleryImage;
    if (slot.startsWith('lore-vm-')) {
      const vmId = slot.replace('lore-vm-', '');
      const vm = visualMediaList.find(v => v.id === vmId);
      return vm?.image ?? panelImage;
    }
    if (slot === 'splash') return splashImage;
    if (slot === 'e2Gallery') return e2GalleryImage;
    if (slot === 'e2Splash') return e2SplashImage;
    if (slot.startsWith('evo-')) {
      const evoId = slot.replace('evo-', '');
      const evo = evolutions.find(e => e.id === evoId);
      return evo?.image ?? null;
    }
    if (slot.startsWith('wardrobe-splash-')) {
      const wId = slot.replace('wardrobe-splash-', '');
      const w = wardrobes.find(item => item.id === wId);
      return w?.splash ?? entry.splash ?? entry.portrait ?? entry.thumbnail;
    }
    if (slot.startsWith('wardrobe-gallery-')) {
      const wId = slot.replace('wardrobe-gallery-', '');
      const w = wardrobes.find(item => item.id === wId);
      return w?.gallery ?? entry.portrait ?? entry.thumbnail;
    }
    return panelImage;
  };

  const handleApplyImageToSlot = (slot: string | null, imgSource: any) => {
    if (!slot) return;

    if (slot.startsWith('evo-')) {
      const evoId = slot.replace('evo-', '');
      const nextEvos = evolutions.map(e => (e.id === evoId ? { ...e, image: imgSource } : e));
      setEvolutions(nextEvos);
      if (onUpdateEntry) {
        onUpdateEntry({ ...entry, evolutions: nextEvos });
      }
      setActiveChooserSlot(null);
      return;
    }
    if (slot.startsWith('wardrobe-splash-')) {
      const wId = slot.replace('wardrobe-splash-', '');
      handleUpdateWardrobe(wId, { splash: imgSource });
      setActiveChooserSlot(null);
      return;
    }
    if (slot.startsWith('lore-vm-')) {
      const vmId = slot.replace('lore-vm-', '');
      handleUpdateVisualMedia(vmId, { image: imgSource });
      setActiveChooserSlot(null);
      return;
    }
    if (slot.startsWith('wardrobe-gallery-')) {
      const wId = slot.replace('wardrobe-gallery-', '');
      handleUpdateWardrobe(wId, { gallery: imgSource });
      setActiveChooserSlot(null);
      return;
    }

    let updatedFields: Partial<Entry> = {};
    if (slot === 'panel') {
      setPanelImage(imgSource);
      updatedFields = { thumbnail: imgSource };
    } else if (slot === 'gallery') {
      setGalleryImage(imgSource);
      updatedFields = { portrait: imgSource };
    } else if (slot === 'splash') {
      setSplashImage(imgSource);
      updatedFields = { splash: imgSource };
    } else if (slot === 'e2Gallery') {
      setE2GalleryImage(imgSource);
      updatedFields = { e2Portrait: imgSource };
    } else if (slot === 'e2Splash') {
      setE2SplashImage(imgSource);
      updatedFields = { e2Splash: imgSource };
    }
    if (onUpdateEntry) {
      onUpdateEntry({ ...entry, ...updatedFields });
    }
    setActiveChooserSlot(null);
  };

  const syncCustomSectionsToEntry = (nextCustom: Array<{ id: string; title: string; body: string }>) => {
    const standardTitles = ['overview', 'backstory', 'relationships', 'visual media', 'gallery', 'additional info', 'additional archival info'];
    const preserved = (entry.sections || []).filter(
      s => s && s.title && standardTitles.includes(s.title.toLowerCase())
    );
    const updatedSections: Section[] = [
      ...preserved,
      ...nextCustom.map(cs => ({
        id: cs.id,
        title: cs.title,
        body: cs.body,
      })),
    ];
    entry.sections = updatedSections;
    onUpdateEntry?.({ ...entry, sections: updatedSections });
  };

  const handleAddNewCustomSection = () => {
    const next = [
      ...customSections,
      {
        id: `sec-${Date.now()}`,
        title: 'New Section',
        body: 'Enter your custom lore notes or historical records here...',
      },
    ];
    setCustomSections(next);
    setShowAddMenu(false);
    syncCustomSectionsToEntry(next);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleUpdateCustomSection = (index: number, updates: Partial<{ title: string; body: string }>) => {
    const next = customSections.map((sec, idx) => (idx === index ? { ...sec, ...updates } : sec));
    setCustomSections(next);
    syncCustomSectionsToEntry(next);
  };

  const handleRemoveCustomSection = (index: number) => {
    const next = customSections.filter((_, idx) => idx !== index);
    setCustomSections(next);
    syncCustomSectionsToEntry(next);
  };

  const handleOverviewChange = (val: string) => {
    setOverview(val);
    entry.summary = val;
    const existingSections = entry.sections || [];
    const updatedSections = [...existingSections];
    const oIdx = updatedSections.findIndex(s => s.title.toLowerCase() === 'overview');
    if (oIdx >= 0) {
      updatedSections[oIdx] = { ...updatedSections[oIdx], body: val };
    } else {
      updatedSections.unshift({ id: `sec-overview-${entry.id}`, title: 'Overview', body: val });
    }
    entry.sections = updatedSections;
    onUpdateEntry?.({ ...entry, summary: val, sections: updatedSections });
  };

  const renderHeroViewMode = () => {
    const splashSource = isCosmetics
      ? (viewSplashMode === 'e2'
        ? (e2SplashImage ?? splashImage ?? panelImage)
        : (splashImage ?? galleryImage ?? panelImage))
      : (splashImage ?? galleryImage ?? panelImage);

    return (
      <View className="flex-row items-start gap-5 mb-5">
        {/* Left Column: Splash Art with in-image E0/E2 toggles */}
        <View className="w-[600px]">
          <BrutalBox
            fill="#E5E5E5"
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.card}
            shadowOffset={SHADOW.offset}
            style={{ overflow: "hidden", backgroundColor: "#E5E5E5" }}
          >
            <View className="w-[600px] h-[450px] bg-neutral-200 items-center justify-center relative overflow-hidden">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openLightbox(splashSource, entry.title)}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel="Enlarge splash art in lightbox"
              >
                <ImageFrame
                  key={`splash-${viewSplashMode}-${entry.id}`}
                  kind="splash"
                  source={splashSource}
                  className="w-full h-full"
                  placeholderLabel="SPLASH ART"
                />
              </TouchableOpacity>

              {/* In-image floating controls: E0 and E2 */}
              {isCosmetics && (
                <View className="absolute top-2.5 left-2.5 z-20 flex-row items-center gap-2">
                  <View className="flex-row rounded-button border-2 border-ink overflow-hidden bg-white">
                    <TouchableOpacity
                      onPress={() => setViewSplashMode('default')}
                      activeOpacity={0.8}
                      className={`px-2.5 py-1 ${viewSplashMode === "default" ? "bg-yellow" : "bg-white"}`}
                    >
                      <Text
                        className={`font-display text-[10px] text-ink ${viewSplashMode === "default" ? "font-extrabold" : "font-bold"}`}
                      >
                        E0
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setViewSplashMode('e2')}
                      activeOpacity={0.8}
                      className={`px-2.5 py-1 ${viewSplashMode === "e2" ? "bg-yellow" : "bg-white"}`}
                    >
                      <Text
                        className={`font-display text-[10px] text-ink ${viewSplashMode === "e2" ? "font-extrabold" : "font-bold"}`}
                      >
                        E2
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </BrutalBox>
        </View>

        {/* Right Column: Entry Identity + Attributes & Classification */}
        <View className="flex-1">
          {/* Entry Identity */}
          <View className="p-3 rounded-button border-2 border-ink bg-white">
            <View className="border-b-2 border-ink pb-1 mb-3">
              <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">ENTRY IDENTITY</Text>
            </View>

            <Text className="font-display text-[26px] font-black text-ink mb-0.5">{name}</Text>
            <Text className="font-body text-[14px] font-semibold text-[#666666] mb-2">{title}</Text>

            {/* Tags with Primary / Secondary Badges */}
            <View className="flex-row flex-wrap items-center mb-2">
              {tags.map((t, idx) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6, marginBottom: 4 }}>
                  <TagPill tag={t} />
                  <View
                    style={{
                      marginLeft: 4,
                      backgroundColor: idx === 0 ? INK : '#EAEAEA',
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 3,
                      borderWidth: 1,
                      borderColor: INK,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.display,
                        fontSize: 8,
                        fontWeight: '900',
                        color: idx === 0 ? WHITE : INK,
                        letterSpacing: 0.5,
                      }}
                    >
                      {idx === 0 ? 'PRIMARY' : 'SECONDARY'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Overview */}
            <View className="mt-1">
              <View className="mb-1">
                <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider">OVERVIEW</Text>
              </View>
              <Text className="font-body text-[14px] text-ink leading-5">{overview}</Text>
            </View>
          </View>

          {/* Attributes & Classification */}
          <View className="p-3 rounded-button border-2 border-ink bg-white mb-5 mt-5">
            <View className="border-b-2 border-ink pb-1 mb-3">
              <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">ATTRIBUTES &amp; CLASSIFICATION</Text>
            </View>

            {isCosmetics ? (
              <View className="border-2 border-ink rounded-button overflow-hidden bg-white mb-5">
                <View className="flex-row">
                  <View className="flex-1 p-3 border-r-2 border-ink">
                    <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">CLASS</Text>
                    <Text className="font-display text-[14px] font-extrabold text-ink">{heroClass}</Text>
                  </View>
                  <View className="flex-1 p-3">
                    <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">SUB-CLASS</Text>
                    <Text className="font-display text-[14px] font-extrabold text-ink">{subClass}</Text>
                  </View>
                </View>
                <View className="flex-row border-t-2 border-ink">
                  <View className="flex-1 p-3">
                    <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">RARITY</Text>
                    <Text className="font-display text-[14px] font-extrabold text-[#B45309]">
                      {cleanMojibake(heroRarity)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="border-2 border-ink rounded-button overflow-hidden bg-white mb-5">
                <View className="flex-row">
                  <View className="flex-1 p-3 border-r-2 border-ink">
                    <AttributeDropdown
                      label="CLASS"
                      attributeType="class"
                      value={heroClass}
                      options={classOptions}
                      isEditing={false}
                      onSelect={(opt) => handleSelectAttribute('class', opt)}
                      onAddOption={(name) => handleAddAttributeOption('class', name)}
                      onRenameOption={(id, name) => handleRenameAttributeOption('class', id, name)}
                      onDeleteOption={(id) => handleDeleteAttributeOption('class', id)}
                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'class', allEntries)}
                    />
                  </View>
                  <View className="flex-1 p-3">
                    <AttributeDropdown
                      label="ELEMENT"
                      attributeType="element"
                      value={heroElement}
                      options={elementOptions}
                      isEditing={false}
                      onSelect={(opt) => handleSelectAttribute('element', opt)}
                      onAddOption={(name, color) => handleAddAttributeOption('element', name, color)}
                      onRenameOption={(id, name, color) => handleRenameAttributeOption('element', id, name, color)}
                      onDeleteOption={(id) => handleDeleteAttributeOption('element', id)}
                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'element', allEntries)}
                    />
                  </View>
                </View>
                <View className="flex-row border-t-2 border-ink">
                  <View className="flex-1 p-3 border-r-2 border-ink">
                    <AttributeDropdown
                      label="RARITY"
                      attributeType="rarity"
                      value={heroRarity}
                      options={rarityOptions}
                      isEditing={false}
                      onSelect={(opt) => handleSelectAttribute('rarity', opt)}
                      onAddOption={(name) => handleAddAttributeOption('rarity', name)}
                      onRenameOption={(id, name) => handleRenameAttributeOption('rarity', id, name)}
                      onDeleteOption={(id) => handleDeleteAttributeOption('rarity', id)}
                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'rarity', allEntries)}
                    />
                  </View>
                  <View className="flex-1 p-3">
                    <AttributeDropdown
                      label="SERIES"
                      attributeType="series"
                      value={gameplaySeries}
                      options={seriesOptions}
                      isEditing={false}
                      onSelect={(opt) => handleSelectAttribute('series', opt)}
                      onAddOption={(name) => handleAddAttributeOption('series', name)}
                      onRenameOption={(id, name) => handleRenameAttributeOption('series', id, name)}
                      onDeleteOption={(id) => handleDeleteAttributeOption('series', id)}
                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'series', allEntries)}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderCosmeticSeries = () => (
    <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
      <View className="border-b-2 border-ink pb-1 mb-3 flex-row items-center justify-between">
        <View className="pb-1">
          <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">COSMETIC SERIES &amp; WARDROBE</Text>
        </View>

        {isEditing && (
          <BrutalButton
            label="+ ADD WARDROBE"
            variant="secondary"
            size="sm"
            onPress={handleAddWardrobe}
          />
        )}
      </View>

      <View className="gap-3">
        {wardrobes.map((wardrobe, wIdx) => {
          const isDropdownOpen = openDropdownWardrobeId === wardrobe.id;
          const isCreatingSeries = isCreatingSeriesForId === wardrobe.id;
          const matchingSeries = (fashionConfigs || []).find(f => {
            if (!f?.name || !wardrobe.seriesName) return false;
            const fName = f.name.toLowerCase().trim();
            const wName = wardrobe.seriesName.toLowerCase().trim();
            return fName === wName || fName.includes(wName) || wName.includes(fName);
          });
          const seriesLogo = matchingSeries?.logo;

          return (
            <BrutalBox
              key={wardrobe.id}
              fill={CREAM}
              borderColor={INK}
              borderWidth={BORDER.width}
              radius={RADIUS.button}
              shadowOffset={SHADOW.offsetSmall}
            >
              {isEditing ? (
                <View className="p-3">
                  {/* Side-by-side images at top */}
                  <View className="flex-row items-start gap-4 mb-3">
                    {/* 1. Wardrobe Splash Art */}
                    <View className="w-[350px] items-center gap-1.5">
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => openLightbox(wardrobe.splash ?? entry.splash ?? entry.portrait ?? entry.thumbnail, `${wardrobe.wardrobeName || 'Wardrobe'} Splash`)}
                        style={{ width: 350, height: 225 }}
                        accessibilityLabel="Enlarge wardrobe splash art"
                      >
                        <View className="w-[350px] h-[225px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200">
                          <Image
                            source={wardrobe.splash ?? entry.splash ?? entry.portrait ?? entry.thumbnail}
                            className="w-full h-full"
                            resizeMode="contain"
                          />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setActiveChooserSlot(`wardrobe-splash-${wardrobe.id}`)}
                        className="flex-row items-center justify-center gap-1 py-1 px-3 border-2 border-ink rounded-small bg-white mt-1 w-full"
                        activeOpacity={0.8}
                      >
                        <Text className="font-display text-[9px] font-extrabold text-ink tracking-wider">CHOOSE SPLASH</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 2. Wardrobe Gallery Image */}
                    <View className="w-[350px] items-center gap-1.5">
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => openLightbox(wardrobe.gallery ?? entry.portrait ?? entry.thumbnail, `${wardrobe.wardrobeName || 'Wardrobe'} Gallery`)}
                        style={{ width: 350, height: 225 }}
                        accessibilityLabel="Enlarge wardrobe gallery image"
                      >
                        <View className="w-[350px] h-[225px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200">
                          <Image
                            source={wardrobe.gallery ?? entry.portrait ?? entry.thumbnail}
                            className="w-full h-full"
                            resizeMode="contain"
                          />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setActiveChooserSlot(`wardrobe-gallery-${wardrobe.id}`)}
                        className="flex-row items-center justify-center gap-1 py-1 px-3 border-2 border-ink rounded-small bg-white mt-1 w-full"
                        activeOpacity={0.8}
                      >
                        <Text className="font-display text-[9px] font-extrabold text-ink tracking-wider">CHOOSE GALLERY</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.xs }} />

                  {/* Rest of the information below: Fashion Series first, then Wardrobe Name */}
                  <View className="mt-2">
                    {/* 1. Fashion Series selector (Dropdown or New) */}
                    <View className="mb-2">
                      <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">FASHION SERIES</Text>
                      <View className="relative z-30 mb-2">
                        {/* Selected value button */}
                        <TouchableOpacity
                          onPress={() => {
                            setOpenDropdownWardrobeId(isDropdownOpen ? null : wardrobe.id);
                            setIsCreatingSeriesForId(null);
                          }}
                          activeOpacity={0.8}
                          className="flex-row items-center justify-between border-2 border-ink rounded-button px-3 h-[42px] bg-white"
                        >
                          <Text className="font-display text-[13px] font-bold text-ink">
                            {wardrobe.seriesName || 'Select a Fashion Series...'}
                          </Text>
                          <Text className="font-display text-[11px] font-black text-ink">{isDropdownOpen ? '▲' : '▼'}</Text>
                        </TouchableOpacity>

                        {/* Dropdown Options */}
                        {isDropdownOpen && (
                          <View className="absolute top-11 left-0 right-0 z-50 bg-white border-2 border-ink rounded-button p-2 shadow-sm">
                            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                              {(availableFashionSeries.length > 0 ? availableFashionSeries : project.categories.filter(c => c.id !== 'all').map(c => c.name)).map(sName => (
                                <TouchableOpacity
                                  key={sName}
                                  onPress={() => {
                                    handleUpdateWardrobe(wardrobe.id, { seriesName: sName });
                                    setOpenDropdownWardrobeId(null);
                                    setIsCreatingSeriesForId(null);
                                  }}
                                  className={`flex-row items-center justify-between px-2.5 py-2 rounded-small mb-1 ${wardrobe.seriesName === sName ? "bg-yellow" : "bg-cream"}`}
                                >
                                  <Text
                                    className={`font-display text-[12px] text-ink ${wardrobe.seriesName === sName ? "font-extrabold" : "font-bold"}`}
                                  >
                                    {sName}
                                  </Text>
                                </TouchableOpacity>
                              ))}

                              {/* Create new series option */}
                              <TouchableOpacity
                                onPress={() => {
                                  setIsCreatingSeriesForId(wardrobe.id);
                                  setOpenDropdownWardrobeId(null);
                                }}
                                className="flex-row items-center gap-1.5 px-2.5 py-2 rounded-small border border-dashed border-ink bg-cream"
                              >
                                <Text className="font-display text-[11px] font-extrabold text-ink tracking-wider">
                                  + Create New Fashion Series...
                                </Text>
                              </TouchableOpacity>
                            </ScrollView>
                          </View>
                        )}

                        {/* Inline input if creating new series */}
                        {isCreatingSeries && (
                          <View className="flex-row items-center gap-2 mb-2">
                            <BrutalTextInput
                              variant="single"
                              size="sm"
                              value={newSeriesNameInput}
                              onChangeText={setNewSeriesNameInput}
                              placeholder="Enter new series name..."
                              style={{ flex: 1, fontFamily: FONTS.display, fontSize: 12, fontWeight: '700' }}
                            />
                            <BrutalButton
                              label="ADD"
                              variant="primary"
                              size="sm"
                              onPress={() => handleCreateNewSeriesForWardrobe(wardrobe.id)}
                            />
                            <BrutalButton
                              label="✕"
                              variant="ghost"
                              size="sm"
                              onPress={() => {
                                setIsCreatingSeriesForId(null);
                                setNewSeriesNameInput('');
                              }}
                            />
                          </View>
                        )}
                      </View>
                    </View>

                    <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.sm }} />

                    {/* 2. Wardrobe name + Delete button */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View style={{ flex: 1 }}>
                        <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">WARDROBE NAME</Text>
                        <BrutalTextInput
                          variant="single"
                          size="md"
                          value={wardrobe.wardrobeName}
                          onChangeText={text => handleUpdateWardrobe(wardrobe.id, { wardrobeName: text })}
                          style={{ fontSize: 14 }}
                          placeholder="e.g. Fresh Delivery"
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => handleRemoveWardrobe(wardrobe.id)}
                        className="w-7 h-7 rounded-small border-2 border-ink bg-white items-center justify-center ml-2"
                        activeOpacity={0.8}
                      >
                        <Icon glyph={ICONS.delete} size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>

                    <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.sm }} />

                    {/* 3. About wardrobe */}
                    <View className="mt-1">
                      <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">ABOUT THE WARDROBE / CONCEPT</Text>
                      <BrutalTextInput
                        variant="multiline"
                        minHeight={80}
                        maxHeight={260}
                        maxLength={5000}
                        value={wardrobe.about}
                        onChangeText={text => handleUpdateWardrobe(wardrobe.id, { about: text })}
                        style={{ fontSize: 14 }}
                        placeholder="Wardrobe notes, concept, fabric specs..."
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-start gap-4 p-3">
                  {/* Left: Wardrobe Splash Art only in view mode (without redundant text) */}
                  <View className="w-[500px] items-center">
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(wardrobe.splash ?? entry.splash ?? entry.portrait ?? entry.thumbnail, `${wardrobe.wardrobeName || 'Wardrobe'} Splash`)}
                      style={{ width: 500, height: 500 }}
                      accessibilityLabel="Enlarge wardrobe splash art"
                    >
                      <View className="w-[500px] h-[500px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200">
                        <Image
                          source={wardrobe.splash ?? entry.splash ?? entry.portrait ?? entry.thumbnail}
                          className="w-full h-full"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Right: Wardrobe Details (Fashion Series first, then Wardrobe Name, then About) */}
                  <View className="flex-1">
                    {/* 1. Fashion Series (First) - Show Logo if available */}
                    <View className="mb-2">
                      <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">FASHION SERIES</Text>
                      {seriesLogo ? (
                        <View className="items-start justify-center my-1.5">
                          <AlignedSeriesLogo
                            source={seriesLogo}
                            maxHeight={135}
                            maxWidth={340}
                            tintColor="black"
                          />
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="font-display text-[16px] font-extrabold text-ink">{wardrobe.seriesName}</Text>
                        </View>
                      )}
                    </View>

                    <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.sm }} />

                    {/* 2. Wardrobe Name (Second) */}
                    <View className="mb-2">
                      <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">WARDROBE NAME</Text>
                      <Text className="font-display text-[18px] font-extrabold text-ink mt-0.5">{wardrobe.wardrobeName}</Text>
                    </View>

                    <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.sm }} />

                    {/* 3. About the Wardrobe (Third) */}
                    <View className="mt-1">
                      <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">ABOUT THE WARDROBE / CONCEPT</Text>
                      <Text className="font-body text-[14px] text-ink leading-5">{wardrobe.about}</Text>
                    </View>
                  </View>
                </View>
              )}
            </BrutalBox>
          );
        })}
      </View>
    </View>
  );

  const renderGameplayWardrobes = () => (
    <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
      <View className="border-b-2 border-ink pb-2 mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">WARDROBES &amp; SKINS</Text>
          {wardrobes.length > 0 && (
            <View className="px-2 py-0.5 rounded-full border border-ink bg-yellow">
              <Text className="font-display text-[10px] font-black text-ink">{wardrobes.length}</Text>
            </View>
          )}
        </View>

        {isEditing && (
          <BrutalButton
            label="+ ADD WARDROBE"
            variant="secondary"
            size="sm"
            icon={<Icon glyph={ICONS.addCircle} size={14} color={INK} />}
            onPress={handleAddWardrobe}
          />
        )}
      </View>

      {wardrobes.length === 0 ? (
        <View className="p-4 items-center justify-center bg-cream/40 rounded-small border border-dashed border-ink/30">
          <Text className="font-display text-[12px] font-bold text-ink/60">
            {isEditing
              ? 'No wardrobes or skins added yet. Click "+ ADD WARDROBE" above to add one.'
              : 'No alternate wardrobes or skins recorded.'}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {wardrobes.map((wardrobe) => {
            const splashImg = wardrobe.splash ?? entry.splash ?? entry.portrait ?? entry.thumbnail;

            return (
              <BrutalBox
                key={wardrobe.id}
                fill={CREAM}
                borderColor={INK}
                borderWidth={BORDER.width}
                radius={RADIUS.button}
                shadowOffset={SHADOW.offsetSmall}
              >
                {isEditing ? (
                  <View className="p-3">
                    <View className="flex-row items-start gap-4">
                      {/* 1. Splash Art preview & Chooser on Left */}
                      <View className="w-[350px] items-center gap-1.5">
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => openLightbox(splashImg, `${wardrobe.wardrobeName || 'Wardrobe'} Splash`)}
                          style={{ width: 350, height: 225 }}
                          accessibilityLabel="Enlarge wardrobe splash art"
                        >
                          <View className="w-[350px] h-[225px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200">
                            <Image
                              source={splashImg}
                              className="w-full h-full"
                              resizeMode="contain"
                            />
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot(`wardrobe-splash-${wardrobe.id}`)}
                          className="flex-row items-center justify-center gap-1.5 py-1.5 px-3 border-2 border-ink rounded-small bg-white mt-1 w-full"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider">CHOOSE SPLASH ART</Text>
                        </TouchableOpacity>
                      </View>

                      {/* 2. Fashion Name & About on Right */}
                      <View className="flex-1">
                        {/* Fashion Name + Delete */}
                        <View className="flex-row items-start justify-between mb-2">
                          <View style={{ flex: 1 }}>
                            <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">FASHION NAME</Text>
                            <BrutalTextInput
                              variant="single"
                              size="md"
                              value={wardrobe.wardrobeName}
                              onChangeText={text => handleUpdateWardrobe(wardrobe.id, { wardrobeName: text })}
                              style={{ fontSize: 14 }}
                              placeholder="e.g. Fresh Fastener / Summer Breeze"
                            />
                          </View>

                          <TouchableOpacity
                            onPress={() => handleRemoveWardrobe(wardrobe.id)}
                            className="w-7 h-7 rounded-small border-2 border-ink bg-white items-center justify-center ml-2 mt-5"
                            activeOpacity={0.8}
                            accessibilityLabel="Delete wardrobe"
                          >
                            <Icon glyph={ICONS.delete} size={14} color="#DC2626" />
                          </TouchableOpacity>
                        </View>

                        <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.xs }} />

                        {/* About */}
                        <View className="mt-2">
                          <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">ABOUT</Text>
                          <BrutalTextInput
                            variant="multiline"
                            minHeight={120}
                            maxHeight={260}
                            maxLength={5000}
                            value={wardrobe.about}
                            onChangeText={text => handleUpdateWardrobe(wardrobe.id, { about: text })}
                            style={{ fontSize: 14 }}
                            placeholder="Wardrobe notes, concept, design description..."
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-start gap-4 p-3">
                    {/* Left: Wardrobe Splash Art with lightbox (500x500 matching Character Cosmetics) */}
                    <View className="w-[500px] items-center">
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => openLightbox(splashImg, `${wardrobe.wardrobeName || 'Wardrobe'} Splash`)}
                        style={{ width: 500, height: 400 }}
                        accessibilityLabel="Enlarge wardrobe splash art"
                      >
                        <View className="w-[500px] h-[400px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200">
                          <Image
                            source={splashImg}
                            className="w-full h-full"
                            resizeMode="contain"
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Right: Fashion Name and About */}
                    <View className="flex-1">
                      {/* Fashion Name */}
                      <View className="mb-2">
                        <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">FASHION NAME</Text>
                        <Text className="font-display text-[18px] font-extrabold text-ink mt-0.5">
                          {wardrobe.wardrobeName || 'Untitled Outfit'}
                        </Text>
                      </View>

                      <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.sm }} />

                      {/* About */}
                      <View className="mt-1">
                        <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">ABOUT</Text>
                        <Text className="font-body text-[14px] text-ink leading-5">
                          {wardrobe.about || 'No details provided.'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </BrutalBox>
            );
          })}
        </View>
      )}
    </View>
  );

  // ── Image Chooser Modal ──────────────────────────────────────────
  const renderImageChooserModal = () => {
    if (!activeChooserSlot) return null;

    const slotLabels: Record<string, string> = {
      panel: 'Panel Image (Square)',
      gallery: 'Gallery Image (Portrait)',
      splash: 'Splash Art (Banner)',
      e2Gallery: 'Elite 2 Gallery Image',
      e2Splash: 'Elite 2 Splash Art',
    };

    let targetLabel = slotLabels[activeChooserSlot];
    if (!targetLabel) {
      if (activeChooserSlot.startsWith('evo-')) targetLabel = 'Unit Evolution Image';
      else if (activeChooserSlot.startsWith('wardrobe-splash-')) targetLabel = 'Wardrobe Splash Art';
      else if (activeChooserSlot.startsWith('wardrobe-gallery-')) targetLabel = 'Wardrobe Gallery Image';
      else if (activeChooserSlot.startsWith('lore-vm-')) targetLabel = 'Visual Media Artwork';
      else targetLabel = activeChooserSlot.toUpperCase();
    }

    return (
      <View className="absolute inset-0 bg-ink/60 z-[9999] items-center justify-center p-5">
        <View className="w-[520px] max-w-full">
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.card}
            shadowOffset={SHADOW.offsetHeavy}
            style={{ padding: 18 }}
          >
            <View className="flex-row items-center justify-between border-b-2 border-ink pb-2 mb-3">
              <View>
                <Text className="font-display text-[15px] font-extrabold text-ink tracking-wide">
                  CHOOSE IMAGE FROM DEVICE
                </Text>
                <Text className="font-body text-[11px] text-[#666666]">
                  Target Slot: {targetLabel}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveChooserSlot(null)}
                className="w-7 h-7 rounded-small border-2 border-ink bg-white items-center justify-center"
              >
                <Text className="font-display text-[12px] font-extrabold text-ink">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Native Windows File Picker Button */}
            <View className="mb-4">
              <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-2">
                SELECT IMAGE FILE (.PNG, .JPG, .JPEG, .WEBP)
              </Text>
              <BrutalButton
                label="CHOOSE FROM COMPUTER"
                variant="primary"
                accentColor={YELLOW}
                size="md"
                onPress={async () => {
                  const result = await pickImageFromComputer();
                  if (result && result.uri && activeChooserSlot) {
                    const slotMap: Record<string, string> = {
                      panel: 'thumbnail',
                      gallery: 'portrait',
                      splash: 'splash',
                      e2Gallery: 'e2Portrait',
                      e2Splash: 'e2Splash',
                    };
                    const queueSlot = slotMap[activeChooserSlot] ?? activeChooserSlot;
                    const reg = await registerOrReuseImage({
                      localPath: result.localPath || result.uri,
                      hash: result.hash!,
                      size: result.size,
                      folder: `apollonography/${project.id}`,
                      entryId: entry.id,
                      slot: queueSlot,
                    });

                    // Update entry slot directly in SQLite
                    await updateEntryImageSlot(entry.id, queueSlot, reg.imageId);

                    // Resolve image for instant display
                    const resolved = resolveImageSync(reg.imageId);
                    handleApplyImageToSlot(activeChooserSlot, resolved || { id: reg.imageId, uri: result.uri, status: reg.status });
                  }
                }}
              />
              <Text className="font-body text-[10px] text-[#666666] mt-2">
                Opens native Windows File Explorer. Selected images are securely copied into the app's local data folder.
              </Text>
            </View>

            {/* Action buttons */}
            <View className="flex-row items-center justify-end pt-2 border-t-2 border-ink">
              <BrutalButton
                label="CANCEL"
                variant="secondary"
                size="sm"
                onPress={() => setActiveChooserSlot(null)}
              />
            </View>
          </BrutalBox>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 h-full">
      <BrutalBox
        fill={WHITE}
        borderColor={INK}
        borderWidth={BORDER.width}
        radius={RADIUS.card}
        shadowOffset={0}
        style={{ flex: 1, height: '100%', position: 'relative' }}
      >
        {/* ── Top Toolbar ─ */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-cream">
          <View className="flex-row items-center gap-3">
            <BrutalPill
              label={isEditing ? 'EDITING MODE' : 'ARTICLE VIEW'}
              fill={isEditing ? YELLOW : CREAM}
              size="sm"
            />
          </View>

          <View className="flex-row items-center gap-2">
            {isEditing && isLore && (
              <View className="relative z-50">
                <BrutalButton
                  label={showAddMenu ? 'CLOSE MENU' : '+ ADD SECTION'}
                  variant={showAddMenu ? 'primary' : 'secondary'}
                  accentColor={YELLOW}
                  size="sm"
                  icon={<Icon glyph={showAddMenu ? ICONS.delete : ICONS.addCircle} size={13} color={INK} />}
                  onPress={() => setShowAddMenu(!showAddMenu)}
                />

                {/* Floating Add Section Dropdown directly below Add Section button */}
                {showAddMenu && (
                  <View
                    className="p-2 rounded-button border-2 border-ink bg-white shadow-lg w-[280px]"
                    style={{ position: 'absolute', top: 40, right: 0, zIndex: 999 }}
                  >
                    <Text className="font-display text-[10px] font-extrabold text-[#888888] tracking-wider px-2 py-1">CHOOSE SECTION TO REVEAL</Text>

                    {!showLoreVisuals && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowLoreVisuals(true);
                          setShowAddMenu(false);
                          const list = visualMediaList.length > 0 ? visualMediaList : [
                            { id: `vm-1-${Date.now()}`, title: 'PANEL ART', image: entry.thumbnail },
                            { id: `vm-2-${Date.now()}`, title: 'GALLERY ART', image: entry.portrait ?? entry.thumbnail },
                          ];
                          setVisualMediaList(list);
                          syncVisualMediaToEntry(list);
                        }}
                        className="flex-row items-center gap-2 px-2.5 py-2 rounded-small"
                      >
                        <Text className="font-display text-[12px] font-bold text-ink">🖼️ VISUAL MEDIA</Text>
                        <Text className="font-body text-[10px] text-[#666666] mt-0.5">Illustrations, maps, scene art</Text>
                      </TouchableOpacity>
                    )}
                    {!showLoreRelationships && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowLoreRelationships(true);
                          setShowAddMenu(false);
                          const rels = relationships.length > 0 ? relationships : allEntries
                            .filter(e => e.id !== entry.id)
                            .slice(0, 2)
                            .map((e, idx) => ({
                              id: `rel-${Date.now()}-${idx}`,
                              targetEntryId: e.id,
                              relation: idx === 0 ? 'Travel Companion & Guardian' : 'Best Friend & Express Comrade',
                            }));
                          setRelationships(rels);
                          syncRelationshipsToEntry(rels);
                        }}
                        className="flex-row items-center gap-2 px-2.5 py-2 rounded-small"
                      >
                        <Text className="font-display text-[12px] font-bold text-ink">🔗 RELATIONSHIPS</Text>
                        <Text className="font-body text-[10px] text-[#666666] mt-0.5">Allies, mentors, factions</Text>
                      </TouchableOpacity>
                    )}

                    {!showLoreAdditionalInfo && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowLoreAdditionalInfo(true);
                          setShowAddMenu(false);
                          const info = additionalInfo.length > 0 ? additionalInfo : [
                            { key: 'Affiliation', value: '' },
                            { key: 'Origin', value: '' },
                            { key: 'Status', value: 'Draft' },
                          ];
                          setAdditionalInfo(info);
                          syncAdditionalInfoToEntry(info);
                        }}
                        className="flex-row items-center gap-2 px-2.5 py-2 rounded-small"
                      >
                        <Text className="font-display text-[12px] font-bold text-ink">📋 ADDITIONAL INFO</Text>
                        <Text className="font-body text-[10px] text-[#666666] mt-0.5">Affiliations and lore records</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={handleAddNewCustomSection}
                      className="flex-row items-center gap-2 px-2.5 py-2 rounded-small border-t border-ink/20"
                    >
                      <Text className="font-display text-[12px] font-bold text-ink">📄 + ADD NEW CUSTOM SECTION</Text>
                      <Text className="font-body text-[10px] text-[#666666] mt-0.5">Custom narrative block</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <BrutalButton
              label={isEditing ? 'DONE EDITING' : 'EDIT ARTICLE'}
              variant={isEditing ? 'primary' : 'secondary'}
              accentColor={YELLOW}
              size="sm"
              icon={<Icon glyph={isEditing ? ICONS.article : ICONS.edit} size={13} color={INK} />}
              onPress={() => {
                if (isEditing && onUpdateEntry) {
                  const nonArchivalFields = (entry.infoFields || []).filter(
                    f => ['class', 'element', 'rarity', 'series', 'luck', 'att.'].includes(f.key.toLowerCase())
                  );
                  const updatedInfoFields: InfoField[] = [
                    { key: 'Role', value: title },
                    ...nonArchivalFields,
                    ...(showLoreAdditionalInfo ? additionalInfo.map(item => ({ key: item.key, value: item.value })) : []),
                  ];

                  const existingSections = entry.sections || [];
                  let updatedSections = [...existingSections];
                  const overviewIdx = updatedSections.findIndex(s => s.title.toLowerCase() === 'overview');
                  if (overviewIdx >= 0) {
                    updatedSections[overviewIdx] = { ...updatedSections[overviewIdx], body: overview };
                  } else {
                    updatedSections.unshift({ id: `sec-overview-${entry.id}`, title: 'Overview', body: overview });
                  }
                  const backstoryIdx = updatedSections.findIndex(s => s.title.toLowerCase() === 'backstory');
                  if (backstoryIdx >= 0) {
                    updatedSections[backstoryIdx] = { ...updatedSections[backstoryIdx], body: backstory };
                  } else {
                    updatedSections.push({ title: 'Backstory', body: backstory });
                  }

                  const relIdx = updatedSections.findIndex(s => s.title.toLowerCase() === 'relationships');
                  if (showLoreRelationships && relationships.length > 0) {
                    if (relIdx >= 0) {
                      updatedSections[relIdx] = { ...updatedSections[relIdx], items: relationships };
                    } else {
                      updatedSections.push({ title: 'Relationships', items: relationships });
                    }
                  } else if (relIdx >= 0) {
                    updatedSections = updatedSections.filter((_, idx) => idx !== relIdx);
                  }

                  const vmIdx = updatedSections.findIndex(s => s.title.toLowerCase() === 'visual media' || s.title.toLowerCase() === 'gallery');
                  if (showLoreVisuals && visualMediaList.length > 0) {
                    if (vmIdx >= 0) {
                      updatedSections[vmIdx] = { ...updatedSections[vmIdx], items: visualMediaList };
                    } else {
                      updatedSections.push({ title: 'Visual Media', items: visualMediaList });
                    }
                  } else if (vmIdx >= 0) {
                    updatedSections = updatedSections.filter((_, idx) => idx !== vmIdx);
                  }

                  const addInfoIdx = updatedSections.findIndex(
                    s => s.title.toLowerCase() === 'additional info' || s.title.toLowerCase() === 'additional archival info' || s.type === 'infoTable'
                  );
                  if (showLoreAdditionalInfo && additionalInfo.length > 0) {
                    if (addInfoIdx >= 0) {
                      updatedSections[addInfoIdx] = { ...updatedSections[addInfoIdx], items: additionalInfo };
                    } else {
                      updatedSections.push({ title: 'Additional Info', type: 'infoTable', items: additionalInfo });
                    }
                  } else if (addInfoIdx >= 0) {
                    updatedSections = updatedSections.filter((_, idx) => idx !== addInfoIdx);
                  }

                  const standardTitles = ['overview', 'backstory', 'relationships', 'visual media', 'gallery', 'additional info', 'additional archival info'];
                  const preservedStandard = updatedSections.filter(
                    s => s && s.title && standardTitles.includes(s.title.toLowerCase())
                  );
                  const finalSections: Section[] = [
                    ...preservedStandard,
                    ...customSections.map(cs => ({
                      id: cs.id,
                      title: cs.title,
                      body: cs.body,
                    })),
                  ];

                  onUpdateEntry({
                    ...entry,
                    title: name,
                    subtitle: title,
                    summary: overview,
                    thumbnail: panelImage,
                    portrait: galleryImage,
                    splash: splashImage,
                    e2Portrait: e2GalleryImage,
                    e2Splash: e2SplashImage,
                    infoFields: updatedInfoFields,
                    sections: finalSections,
                    wardrobes,
                    evolutions,
                    abilities,
                  });
                }
                setIsEditing(!isEditing);
                setIsEditingOverview(false);
                if (isEditing) setShowAddMenu(false);
              }}
            />

            {isEditing && onDeleteEntry && (
              <TouchableOpacity
                onPress={() => onDeleteEntry(entry.id)}
                className="w-[34px] h-[34px] rounded-button border-2 border-ink bg-white items-center justify-center"
                activeOpacity={0.8}
              >
                <Icon glyph={ICONS.delete} size={15} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <BrutalDivider thickness={BORDER.width} />

        {/* ── Canvas Content ────────────────────────────────────────── */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={true}
        >
          {/* ── 2-COLUMN ARTICLE VIEW MODE (SPLASH ART LEFT, IDENTITY & ATTRIBUTES RIGHT) ── */}
          {!isEditing && (isGameplay || isCosmetics) && renderHeroViewMode()}

          {/* ── EDIT MODE VISUAL MEDIA: Full Frames Row ── */}
          {isEditing && (isGameplay || isCosmetics) && (
            <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
              <View className="border-b-2 border-ink pb-1 mb-3">
                <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">VISUAL MEDIA</Text>
              </View>

              {isCosmetics ? (
                <View className="flex-row gap-4 mb-3">
                  {/* Panel Image */}
                  <View className="flex-1">
                    <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">PANEL IMAGE</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(panelImage, `${entry.title} - Panel Image`)}
                      style={{ width: '100%', height: 180 }}
                      accessibilityLabel="Enlarge panel image"
                    >
                      <View className="w-full h-[180px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200 relative">
                        <ImageFrame
                          kind="panel"
                          source={panelImage}
                          className="w-full h-full"
                          placeholderLabel="PANEL"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center justify-between mt-2 flex-wrap gap-1">
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot('panel')}
                          className="px-1.5 py-0.5 rounded-small border-2 border-ink bg-white"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-bold text-ink">CHOOSE</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <BrutalPill label="1:1" fill={CREAM} size="sm" />
                      </View>
                    </View>
                  </View>

                  {/* Gallery Image */}
                  <View className="flex-1">
                    <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">GALLERY IMAGE</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(galleryImage, `${entry.title} - Gallery Image`)}
                      style={{ width: '100%', height: 180 }}
                      accessibilityLabel="Enlarge gallery image"
                    >
                      <View className="w-full h-[180px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200 relative">
                        <ImageFrame
                          kind="gallery"
                          source={galleryImage}
                          className="w-full h-full"
                          placeholderLabel="GALLERY"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center justify-between mt-2 flex-wrap gap-1">
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot('gallery')}
                          className="px-1.5 py-0.5 rounded-small border-2 border-ink bg-white"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-bold text-ink">CHOOSE</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <BrutalPill label="1:2" fill={CREAM} size="sm" />
                      </View>
                    </View>
                  </View>

                  {/* Splash Art (Free Size) */}
                  <View className="flex-1">
                    <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">SPLASH ART</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(splashImage, `${entry.title} - Splash Art`)}
                      style={{ width: '100%', height: 180 }}
                      accessibilityLabel="Enlarge splash art"
                    >
                      <View className="w-full h-[180px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200 relative">
                        <ImageFrame
                          kind="splash"
                          source={splashImage}
                          className="w-full h-full"
                          placeholderLabel="SPLASH"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center justify-between mt-2 flex-wrap gap-1">
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot('splash')}
                          className="px-1.5 py-0.5 rounded-small border-2 border-ink bg-white"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-bold text-ink">CHOOSE</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <BrutalPill label="BANNER" fill={CREAM} size="sm" />
                      </View>
                    </View>
                  </View>

                  {/* E2 Gallery Image */}
                  <View className="flex-1">
                    <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">E2 GALLERY IMAGE</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(e2GalleryImage, `${entry.title} - E2 Gallery Image`)}
                      style={{ width: '100%', height: 180 }}
                      accessibilityLabel="Enlarge E2 gallery image"
                    >
                      <View className="w-full h-[180px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200 relative">
                        <ImageFrame
                          kind="gallery"
                          source={e2GalleryImage}
                          className="w-full h-full"
                          placeholderLabel="E2 GALLERY"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center justify-between mt-2 flex-wrap gap-1">
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot('e2Gallery')}
                          className="px-1.5 py-0.5 rounded-small border-2 border-ink bg-white"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-bold text-ink">CHOOSE</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <BrutalPill label="1:2" fill={CREAM} size="sm" />
                      </View>
                    </View>
                  </View>

                  {/* E2 Splash Art */}
                  <View className="flex-1">
                    <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">E2 SPLASH ART</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(e2SplashImage, `${entry.title} - E2 Splash Art`)}
                      style={{ width: '100%', height: 180 }}
                      accessibilityLabel="Enlarge E2 splash art"
                    >
                      <View className="w-full h-[180px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200 relative">
                        <ImageFrame
                          kind="splash"
                          source={e2SplashImage}
                          className="w-full h-full"
                          placeholderLabel="E2 SPLASH"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center justify-between mt-2 flex-wrap gap-1">
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot('e2Splash')}
                          className="px-1.5 py-0.5 rounded-small border-2 border-ink bg-white"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-bold text-ink">CHOOSE</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <BrutalPill label="E2 BANNER" fill={CREAM} size="sm" />
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-4 mb-3">
                  {/* Panel Image Frame (1:1, contain, centered) */}
                  <View className="flex-1">
                    <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">PANEL IMAGE</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(panelImage, `${entry.title} - Panel Image`)}
                      style={{ width: '100%', height: 180 }}
                      accessibilityLabel="Enlarge panel image"
                    >
                      <View className="w-full h-[180px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200 relative">
                        <ImageFrame
                          kind="panel"
                          source={panelImage}
                          className="w-full h-full"
                          placeholderLabel="PANEL"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center justify-between mt-2 flex-wrap gap-1">
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot('panel')}
                          className="px-2 py-0.5 rounded-small border-2 border-ink bg-white"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-bold text-ink">CHOOSE</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <BrutalPill label="1:1" fill={CREAM} size="sm" />
                      </View>
                    </View>
                  </View>

                  {/* Splash Art Frame (Free Size, whole image) */}
                  <View className="flex-1">
                    <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">SPLASH ART</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openLightbox(splashImage, `${entry.title} - Splash Art`)}
                      style={{ width: '100%', height: 180 }}
                      accessibilityLabel="Enlarge splash art"
                    >
                      <View className="w-full h-[180px] rounded-small border-2 border-ink overflow-hidden bg-neutral-200 relative">
                        <ImageFrame
                          kind="splash"
                          source={splashImage}
                          className="w-full h-full"
                          placeholderLabel="SPLASH"
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center justify-between mt-2 flex-wrap gap-1">
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setActiveChooserSlot('splash')}
                          className="px-2 py-0.5 rounded-small border-2 border-ink bg-white"
                          activeOpacity={0.8}
                        >
                          <Text className="font-display text-[9px] font-bold text-ink">CHOOSE</Text>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <BrutalPill label="BANNER" fill={CREAM} size="sm" />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── ENTRY IDENTITY (Shown in edit mode or always for Lore & Story) ── */}
          {(isEditing || isLore) && (
            <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
              <View className="border-b-2 border-ink pb-1 mb-3">
                <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">ENTRY IDENTITY</Text>
              </View>

              {/* Name */}
              {isEditing ? (
                <View className="mb-3">
                  <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">CHARACTER / ENTRY NAME</Text>
                  <BrutalTextInput
                    variant="single"
                    size="lg"
                    value={name}
                    onChangeText={setName}
                    style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: '800' }}
                  />
                </View>
              ) : (
                <Text className="font-display text-[26px] font-black text-ink mb-0.5">{name}</Text>
              )}

              {/* Title */}
              {isEditing ? (
                <View className="mb-3">
                  <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">TITLE / ROLE DESCRIPTOR</Text>
                  <BrutalTextInput
                    variant="single"
                    size="md"
                    value={title}
                    onChangeText={(val) => {
                      setTitle(val);
                      setRole(val);
                    }}
                    style={{ fontSize: 14 }}
                  />
                </View>
              ) : (
                <Text className="font-body text-[14px] font-semibold text-[#666666] mb-2">{title}</Text>
              )}

              {/* Tags & Floating Tag Creator */}
              <View style={{ marginBottom: 1 }}>
                <View className="flex-row flex-wrap items-center mb-2">
                  {tags.map((t, idx) => (
                    <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6, marginBottom: 4 }}>
                      <TagPill
                        tag={t}
                        onRemove={isEditing ? () => {
                          const updatedTags = tags.filter(x => x.id !== t.id);
                          setTags(updatedTags);
                          if (onUpdateEntry) onUpdateEntry({ ...entry, tags: updatedTags });
                        } : undefined}
                      />
                      <View
                        style={{
                          marginLeft: 4,
                          backgroundColor: idx === 0 ? INK : '#EAEAEA',
                          paddingHorizontal: 4,
                          paddingVertical: 1,
                          borderRadius: 3,
                          borderWidth: 1,
                          borderColor: INK,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.display,
                            fontSize: 8,
                            fontWeight: '900',
                            color: idx === 0 ? WHITE : INK,
                            letterSpacing: 0.5,
                          }}
                        >
                          {idx === 0 ? 'PRIMARY' : 'SECONDARY'}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {isEditing && !isAddingTag && (
                    <BrutalButton
                      label={tags.length === 0 ? '+ ADD PRIMARY TAG' : '+ ADD SECONDARY TAG'}
                      variant="secondary"
                      size="sm"
                      onPress={() => setIsAddingTag(true)}
                    />
                  )}
                </View>

                {/* Interactive Tag Creator with Color Wheel */}
                {isEditing && isAddingTag && (
                  <View className="w-full max-w-[560px] p-3 rounded-card border-2 border-ink bg-white mt-2 mb-1">
                    <View className="flex-row items-center justify-between mb-3 pb-1 border-b-2 border-ink">
                      <Text className="font-display text-[12px] font-black text-ink tracking-wide">
                        🎨 CREATE NEW {tags.length === 0 ? 'PRIMARY' : 'SECONDARY'} TAG
                      </Text>
                      <TouchableOpacity
                        onPress={() => setIsAddingTag(false)}
                        className="px-1.5 py-0.5"
                      >
                        <Text className="text-[14px] font-black text-ink">✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Name Input & Live Preview */}
                    <View className="flex-row items-start gap-4 mb-3 z-50">
                      <View style={{ flex: 1 }} className="relative z-50">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider">TAG NAME</Text>
                          {existingProjectTags.length > 0 && (
                            <TouchableOpacity
                              onPress={() => setShowTagDropdown(prev => !prev)}
                              className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-small border border-ink bg-cream"
                              activeOpacity={0.7}
                            >
                              <Text className="font-display text-[9px] font-bold text-ink">
                                {showTagDropdown ? '▲ CLOSE' : `▼ EXISTING (${existingProjectTags.length})`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <BrutalTextInput
                          variant="single"
                          size="md"
                          fill={CREAM}
                          value={newTagName}
                          onChangeText={text => setNewTagName(text)}
                          placeholder="e.g. Limited, Elite, Siracusa"
                          style={{ fontSize: 14, fontWeight: '700' }}
                        />

                        {/* Dropdown for Existing Tags */}
                        {showTagDropdown && filteredExistingTags.length > 0 && (
                          <View className="mt-2 bg-white border-2 border-ink rounded-button shadow-md max-h-[160px] overflow-hidden">
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} className="max-h-[160px]">
                              {filteredExistingTags.map(item => (
                                <TouchableOpacity
                                  key={item.id || item.name}
                                  onPress={() => {
                                    setNewTagName(item.name);
                                    if (item.color) setNewTagColor(item.color);
                                    setShowTagDropdown(false);
                                  }}
                                  className="flex-row items-center justify-between px-3 py-2 border-b border-neutral-100 bg-white"
                                  activeOpacity={0.7}
                                >
                                  <View className="flex-row items-center gap-2">
                                    <View
                                      className="w-3.5 h-3.5 rounded-full border border-ink"
                                      style={{ backgroundColor: item.color || '#4ECDC4' }}
                                    />
                                    <Text className="font-display text-[12px] font-bold text-ink">
                                      {item.name}
                                    </Text>
                                  </View>
                                  <BrutalPill label="SELECT" fill={YELLOW} size="sm" />
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                      <View className="items-start justify-center">
                        <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider mb-1">LIVE PREVIEW</Text>
                        <TagPill
                          tag={{
                            id: 'preview',
                            name: newTagName.trim() || 'TAG PREVIEW',
                            color: newTagColor,
                          }}
                        />
                      </View>
                    </View>

                    {/* Color Wheel Section */}
                    <View className="p-3 rounded-button border-2 border-ink bg-cream mb-3">
                      <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider mb-2">CHOOSE COLOR FROM COLOR WHEEL</Text>

                      <View className="flex-row items-center gap-6">
                        {/* Visual Circular Color Wheel */}
                        <View className="w-[104px] h-[104px] rounded-full bg-white border-2 border-ink relative items-center justify-center">
                          {COLOR_WHEEL_HUES.map((hue, index) => {
                            const total = COLOR_WHEEL_HUES.length;
                            const angle = (index * 2 * Math.PI) / total;
                            const radius = 42;
                            const x = 50 + radius * Math.cos(angle) - 11;
                            const y = 50 + radius * Math.sin(angle) - 11;
                            const isSelected = newTagColor.toLowerCase() === hue.toLowerCase();
                            return (
                              <TouchableOpacity
                                key={hue}
                                onPress={() => setNewTagColor(hue)}
                                activeOpacity={0.7}
                                style={{
                                  position: 'absolute',
                                  width: 22,
                                  height: 22,
                                  borderRadius: 11,
                                  backgroundColor: hue,
                                  left: x,
                                  top: y,
                                  borderWidth: isSelected ? 3 : 2,
                                  borderColor: INK,
                                  zIndex: 2,
                                }}
                              />
                            );
                          })}
                          {/* Center Swatch Display */}
                          <View
                            className="w-8 h-8 rounded-full border-2 border-ink items-center justify-center z-[3]"
                            style={{ backgroundColor: newTagColor }}
                          >
                            <View className="w-2 h-2 rounded-full bg-ink" />
                          </View>
                        </View>

                        {/* Quick Swatches & Hex Input */}
                        <View className="flex-1">
                          <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1.5">
                            POPULAR BRUTAL PALETTE
                          </Text>
                          <View className="flex-row flex-wrap gap-2 mb-2">
                            {PRESET_TAG_COLORS.map(color => {
                              const isSelected = newTagColor.toLowerCase() === color.toLowerCase();
                              return (
                                <TouchableOpacity
                                  key={color}
                                  onPress={() => setNewTagColor(color)}
                                  activeOpacity={0.7}
                                  className="w-7 h-7 rounded-small"
                                  style={{
                                    backgroundColor: color,
                                    borderColor: isSelected ? INK : 'rgba(0,0,0,0.2)',
                                    borderWidth: isSelected ? 3 : 2,
                                  }}
                                />
                              );
                            })}
                          </View>

                          {/* Hex input */}
                          <View className="flex-row items-center gap-1">
                            <Text className="font-display text-[10px] font-extrabold text-ink">HEX</Text>
                            <BrutalTextInput
                              variant="single"
                              size="sm"
                              value={newTagColor}
                              onChangeText={setNewTagColor}
                              placeholder="#4ECDC4"
                              style={{ width: 100, fontSize: 12, fontWeight: '700', borderRadius: RADIUS.small }}
                            />
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Actions */}
                    <View className="flex-row justify-end gap-2">
                      <BrutalButton
                        label="CANCEL"
                        variant="secondary"
                        size="sm"
                        onPress={() => setIsAddingTag(false)}
                      />
                      <BrutalButton
                        label="✓ ADD TAG"
                        variant="primary"
                        accentColor={YELLOW}
                        size="sm"
                        onPress={() => {
                          if (!newTagName.trim()) return;
                          const created: Tag = {
                            id: `tag-${Date.now()}`,
                            name: newTagName.trim(),
                            color: newTagColor,
                          };
                          const updated = [...tags, created];
                          setTags(updated);
                          if (onUpdateEntry) onUpdateEntry({ ...entry, tags: updated });
                          setNewTagName('');
                          setShowTagDropdown(false);
                          setIsAddingTag(false);
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Overview */}
              <View className="mb-3">
                <View className="flex-row items-center justify-between pb-0.5 mb-1">
                  <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider">OVERVIEW &amp; SUMMARY</Text>
                  {isEditing && (
                    <TouchableOpacity
                      onPress={() => setIsEditingOverview(!isEditingOverview)}
                      className={`px-2 py-0.5 rounded-small border border-ink ${isEditingOverview ? 'bg-[#FFD93D]' : 'bg-[#FFF4D6] flex-row items-center gap-1'}`}
                      activeOpacity={0.8}
                    >
                      <Text className="font-display text-[9px] font-extrabold text-ink">
                        {isEditingOverview ? '✓ DONE' : 'EDIT'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isEditing && isEditingOverview ? (
                  <MiniTipTapEditor
                    value={overview}
                    onChange={handleOverviewChange}
                    minHeight={90}
                    maxHeight={220}
                    placeholder="Write character overview & summary..."
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => isEditing && setIsEditingOverview(true)}
                    activeOpacity={isEditing ? 0.85 : 1}
                    className="rounded-small border border-ink bg-white p-3 min-h-[56px] justify-center"
                  >
                    <MiniRichTextView
                      content={overview || (isEditing ? 'Tap to write character overview & summary...' : 'No overview recorded.')}
                      style={{ fontSize: 14, color: overview ? INK : '#9CA3AF', lineHeight: 22 }}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Attributes Table */}
              {(isGameplay || isCosmetics) && (
                <View className="p-3 rounded-button border-2 border-ink bg-white">
                  <View className="border-b-2 border-ink pb-1 mb-3">
                    <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">ATTRIBUTES &amp; CLASSIFICATION</Text>
                  </View>

                  {isCosmetics ? (
                    <View className="border-2 border-ink rounded-button bg-white">
                      <View className="flex-row">
                        <View className="flex-1 p-3 border-r-2 border-ink">
                          <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">CLASS</Text>
                          {isEditing ? (
                            <BrutalTextInput
                              variant="single"
                              size="sm"
                              fill={CREAM}
                              borderWidth={1}
                              value={heroClass}
                              onChangeText={setHeroClass}
                              style={{ fontSize: 13, fontWeight: '700', borderRadius: RADIUS.small }}
                            />
                          ) : (
                            <Text className="font-display text-[14px] font-extrabold text-ink">{heroClass}</Text>
                          )}
                        </View>
                        <View className="flex-1 p-3">
                          <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">SUB-CLASS</Text>
                          {isEditing ? (
                            <BrutalTextInput
                              variant="single"
                              size="sm"
                              fill={CREAM}
                              borderWidth={1}
                              value={subClass}
                              onChangeText={setSubClass}
                              style={{ fontSize: 13, fontWeight: '700', borderRadius: RADIUS.small }}
                            />
                          ) : (
                            <Text className="font-display text-[14px] font-extrabold text-ink">{subClass}</Text>
                          )}
                        </View>
                      </View>
                      <View className="flex-row border-t-2 border-ink">
                        <View className="flex-1 p-3">
                          <AttributeDropdown
                            label="RARITY"
                            attributeType="rarity"
                            value={heroRarity}
                            options={rarityOptions}
                            isEditing={isEditing}
                            isOpen={activeAttributeDropdown === 'cosmetic-rarity'}
                            onOpenChange={(open) => setActiveAttributeDropdown(open ? 'cosmetic-rarity' : null)}
                            onSelect={(opt) => handleSelectAttribute('rarity', opt)}
                            onAddOption={(name) => handleAddAttributeOption('rarity', name)}
                            onRenameOption={(id, name) => handleRenameAttributeOption('rarity', id, name)}
                            onDeleteOption={(id) => handleDeleteAttributeOption('rarity', id)}
                            isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'rarity', allEntries)}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="border-2 border-ink rounded-button bg-white mb-5">
                      <View className="flex-row">
                        <View className="flex-1 p-3 border-r-2 border-ink">
                          <AttributeDropdown
                            label="CLASS"
                            attributeType="class"
                            value={heroClass}
                            options={classOptions}
                            isEditing={isEditing}
                            isOpen={activeAttributeDropdown === 'main-class'}
                            onOpenChange={(open) => setActiveAttributeDropdown(open ? 'main-class' : null)}
                            onSelect={(opt) => handleSelectAttribute('class', opt)}
                            onAddOption={(name) => handleAddAttributeOption('class', name)}
                            onRenameOption={(id, name) => handleRenameAttributeOption('class', id, name)}
                            onDeleteOption={(id) => handleDeleteAttributeOption('class', id)}
                            isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'class', allEntries)}
                          />
                        </View>
                        <View className="flex-1 p-3">
                          <AttributeDropdown
                            label="ELEMENT"
                            attributeType="element"
                            value={heroElement}
                            options={elementOptions}
                            isEditing={isEditing}
                            isOpen={activeAttributeDropdown === 'main-element'}
                            onOpenChange={(open) => setActiveAttributeDropdown(open ? 'main-element' : null)}
                            onSelect={(opt) => handleSelectAttribute('element', opt)}
                            onAddOption={(name, color) => handleAddAttributeOption('element', name, color)}
                            onRenameOption={(id, name, color) => handleRenameAttributeOption('element', id, name, color)}
                            onDeleteOption={(id) => handleDeleteAttributeOption('element', id)}
                            isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'element', allEntries)}
                          />
                        </View>
                      </View>
                      <View className="flex-row border-t-2 border-ink">
                        <View className="flex-1 p-3 border-r-2 border-ink">
                          <AttributeDropdown
                            label="RARITY"
                            attributeType="rarity"
                            value={heroRarity}
                            options={rarityOptions}
                            isEditing={isEditing}
                            isOpen={activeAttributeDropdown === 'main-rarity'}
                            onOpenChange={(open) => setActiveAttributeDropdown(open ? 'main-rarity' : null)}
                            onSelect={(opt) => handleSelectAttribute('rarity', opt)}
                            onAddOption={(name) => handleAddAttributeOption('rarity', name)}
                            onRenameOption={(id, name) => handleRenameAttributeOption('rarity', id, name)}
                            onDeleteOption={(id) => handleDeleteAttributeOption('rarity', id)}
                            isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'rarity', allEntries)}
                          />
                        </View>
                        <View className="flex-1 p-3">
                          <AttributeDropdown
                            label="SERIES"
                            attributeType="series"
                            value={gameplaySeries}
                            options={seriesOptions}
                            isEditing={isEditing}
                            isOpen={activeAttributeDropdown === 'main-series'}
                            onOpenChange={(open) => setActiveAttributeDropdown(open ? 'main-series' : null)}
                            onSelect={(opt) => handleSelectAttribute('series', opt)}
                            onAddOption={(name) => handleAddAttributeOption('series', name)}
                            onRenameOption={(id, name) => handleRenameAttributeOption('series', id, name)}
                            onDeleteOption={(id) => handleDeleteAttributeOption('series', id)}
                            isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'series', allEntries)}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ── CHARACTERS & GAMEPLAY: Combat Kit & Evolution (View & Edit) ─── */}
          {isGameplay && (
            <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
              <View className="mt-1 mb-2">
                <AbilityList
                  abilities={abilities}
                  onChange={setAbilities}
                  isEditing={isEditing}
                  title="COMBAT KIT & ABILITIES"
                />
              </View>

              {/* Unit Evolution */}
              <View className="p-3 rounded-card border-2 border-ink bg-cream mb-1">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-display text-[14px] font-extrabold text-ink">UNIT EVOLUTION</Text>
                    <Text className="font-body text-[12px] text-[#666666] mt-0.5">
                      Awakened / Transcended unit forms ({evolutions.length} {evolutions.length === 1 ? 'form' : 'forms'} available)
                    </Text>
                  </View>
                  {isEditing && (
                    <BrutalButton
                      label="+ ADD EVOLUTION"
                      variant="primary"
                      accentColor={YELLOW}
                      size="sm"
                      icon={<Icon glyph={ICONS.addCircle} size={14} color={INK} />}
                      onPress={handleAddEvolution}
                    />
                  )}
                </View>

                <View className="mt-3 gap-3">
                  {evolutions.map((evo, idx) => (
                    <View key={evo.id} className="w-full">
                      <BrutalBox
                        fill={WHITE}
                        borderColor={INK}
                        borderWidth={BORDER.width}
                        radius={RADIUS.card}
                        shadowOffset={SHADOW.offsetSmall}
                        style={{ padding: 12 }}
                      >
                        {/* Top row: 400x400 Splash on left, Form Identity & Attributes on right */}
                        <View className="flex-row items-start gap-5 mb-4">
                          {/* 1. 400x400 Evolution Splash Art */}
                          <View className="w-[400px] items-center gap-2">
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() => {
                                if (evo.image) {
                                  openLightbox(evo.image, `${evo.name || 'Unit Evolution'} Art`);
                                } else if (isEditing) {
                                  setActiveChooserSlot(`evo-${evo.id}`);
                                }
                              }}
                              style={{ width: 400, height: 400 }}
                              accessibilityLabel="Enlarge evolution art"
                            >
                              <View className="w-[400px] h-[400px] rounded-card border-2 border-ink overflow-hidden bg-neutral-200">
                                <ImageFrame
                                  kind="splash"
                                  source={evo.image}
                                  className="w-full h-full"
                                  placeholderLabel="EVOLUTION ART"
                                  resizeMode="contain"
                                />
                              </View>
                            </TouchableOpacity>
                            {isEditing && (
                              <TouchableOpacity
                                onPress={() => setActiveChooserSlot(`evo-${evo.id}`)}
                                className="flex-row items-center justify-center gap-1.5 py-2 px-4 border-2 border-ink rounded-small bg-white w-full"
                                activeOpacity={0.8}
                              >
                                <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider">CHOOSE EVOLUTION ART</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* 2. Beside Splash: Form Identity + Attributes & Classification */}
                          <View className="flex-1">
                            {/* Form Identity Card */}
                            <View className="p-3 rounded-button border-2 border-ink bg-white">
                              <View className="border-b-2 border-ink pb-1 mb-2 flex-row items-center justify-between">
                                <Text className="font-display text-[12px] font-extrabold text-ink tracking-wide">
                                  TRANSCENDENCE / FORM IDENTITY
                                </Text>
                                {isEditing && (
                                  <TouchableOpacity
                                    onPress={() => handleRemoveEvolution(evo.id)}
                                    className="w-6 h-6 rounded-small border border-ink bg-white items-center justify-center"
                                    activeOpacity={0.8}
                                  >
                                    <Icon glyph={ICONS.delete} size={13} color="#DC2626" />
                                  </TouchableOpacity>
                                )}
                              </View>

                              <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">FORM NAME</Text>
                              {isEditing ? (
                                <BrutalTextInput
                                  variant="single"
                                  size="md"
                                  value={evo.name}
                                  onChangeText={(txt) => handleUpdateEvolution(evo.id, 'name', txt)}
                                  style={{ fontSize: 16, fontWeight: '800' }}
                                />
                              ) : (
                                <Text className="font-display text-[18px] font-black text-ink mb-1">{evo.name}</Text>
                              )}

                              {/* Form Overview / Desc */}
                              <View className="mt-2">
                                <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">FORM OVERVIEW &amp; LORE</Text>
                                {isEditing ? (
                                  <BrutalTextInput
                                    variant="multiline"
                                    minHeight={65}
                                    maxHeight={200}
                                    maxLength={5000}
                                    value={evo.desc}
                                    onChangeText={(txt) => handleUpdateEvolution(evo.id, 'desc', txt)}
                                    style={{ fontSize: 13 }}
                                  />
                                ) : (
                                  <Text className="font-body text-[13px] text-ink leading-5">{evo.desc}</Text>
                                )}
                              </View>
                            </View>

                            {/* Form Attributes & Classification */}
                            <View className="p-3 rounded-button border-2 border-ink bg-white">
                              <View className="border-b-2 border-ink pb-1 mb-2">
                                <Text className="font-display text-[12px] font-extrabold text-ink tracking-wide">
                                  ATTRIBUTES &amp; CLASSIFICATION
                                </Text>
                              </View>
                              <View className="border-2 border-ink rounded-button bg-white">
                                <View className="flex-row">
                                  <View className="flex-1 p-2.5 border-r-2 border-ink">
                                    <AttributeDropdown
                                      label="CLASS"
                                      attributeType="class"
                                      value={evo.class ?? heroClass}
                                      options={classOptions}
                                      isEditing={isEditing}
                                      isOpen={activeAttributeDropdown === `evo-${evo.id}-class`}
                                      onOpenChange={(open) => setActiveAttributeDropdown(open ? `evo-${evo.id}-class` : null)}
                                      onSelect={(opt) => handleSelectEvolutionAttribute(evo.id, 'class', opt)}
                                      onAddOption={(name) => handleAddAttributeOption('class', name)}
                                      onRenameOption={(id, name) => handleRenameAttributeOption('class', id, name)}
                                      onDeleteOption={(id) => handleDeleteAttributeOption('class', id)}
                                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'class', allEntries)}
                                    />
                                  </View>
                                  <View className="flex-1 p-2.5">
                                    <AttributeDropdown
                                      label="ELEMENT"
                                      attributeType="element"
                                      value={evo.element ?? heroElement}
                                      options={elementOptions}
                                      isEditing={isEditing}
                                      isOpen={activeAttributeDropdown === `evo-${evo.id}-element`}
                                      onOpenChange={(open) => setActiveAttributeDropdown(open ? `evo-${evo.id}-element` : null)}
                                      onSelect={(opt) => handleSelectEvolutionAttribute(evo.id, 'element', opt)}
                                      onAddOption={(name, color) => handleAddAttributeOption('element', name, color)}
                                      onRenameOption={(id, name, color) => handleRenameAttributeOption('element', id, name, color)}
                                      onDeleteOption={(id) => handleDeleteAttributeOption('element', id)}
                                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'element', allEntries)}
                                    />
                                  </View>
                                </View>
                                <View className="flex-row border-t-2 border-ink">
                                  <View className="flex-1 p-2.5 border-r-2 border-ink">
                                    <AttributeDropdown
                                      label="RARITY"
                                      attributeType="rarity"
                                      value={evo.rarity ?? heroRarity}
                                      options={rarityOptions}
                                      isEditing={isEditing}
                                      isOpen={activeAttributeDropdown === `evo-${evo.id}-rarity`}
                                      onOpenChange={(open) => setActiveAttributeDropdown(open ? `evo-${evo.id}-rarity` : null)}
                                      onSelect={(opt) => handleSelectEvolutionAttribute(evo.id, 'rarity', opt)}
                                      onAddOption={(name) => handleAddAttributeOption('rarity', name)}
                                      onRenameOption={(id, name) => handleRenameAttributeOption('rarity', id, name)}
                                      onDeleteOption={(id) => handleDeleteAttributeOption('rarity', id)}
                                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'rarity', allEntries)}
                                    />
                                  </View>
                                  <View className="flex-1 p-2.5">
                                    <AttributeDropdown
                                      label="SERIES"
                                      attributeType="series"
                                      value={evo.series ?? gameplaySeries}
                                      options={seriesOptions}
                                      isEditing={isEditing}
                                      isOpen={activeAttributeDropdown === `evo-${evo.id}-series`}
                                      onOpenChange={(open) => setActiveAttributeDropdown(open ? `evo-${evo.id}-series` : null)}
                                      onSelect={(opt) => handleSelectEvolutionAttribute(evo.id, 'series', opt)}
                                      onAddOption={(name) => handleAddAttributeOption('series', name)}
                                      onRenameOption={(id, name) => handleRenameAttributeOption('series', id, name)}
                                      onDeleteOption={(id) => handleDeleteAttributeOption('series', id)}
                                      isOptionInUse={(opt) => isAttributeOptionInUse(opt, 'series', allEntries)}
                                    />
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* Divider separating top splash/identity and bottom skills */}
                        <BrutalDivider thickness={BORDER.width} style={{ marginVertical: SPACE.xs }} />

                        {/* Bottom Section: Awakened Skill Changes (full width) */}
                        <View className="mt-3">
                          <AbilityList
                            abilities={migrateAbilities(evo, DEFAULT_EVOLUTION_ABILITIES)}
                            onChange={(nextAbilities) => handleUpdateEvolution(evo.id, 'abilities', nextAbilities)}
                            isEditing={isEditing}
                            title="AWAKENED SKILL CHANGES"
                            isEvolution={true}
                          />
                        </View>
                      </BrutalBox>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── CHARACTERS & GAMEPLAY: Wardrobes & Skins ─────────────── */}
          {isGameplay && renderGameplayWardrobes()}

          {/* ── CHARACTER COSMETICS: Cosmetic Series & Wardrobe ───────── */}
          {isCosmetics && renderCosmeticSeries()}

          {/* ── LORE & STORY: Role, Backstory, Hidden-by-default Sections ── */}
          {isLore && (
            <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
              {/* Role in Narrative */}
              <View className="p-3 rounded-button border-2 border-ink bg-cream mb-5">
                <Text className="font-display text-[10px] font-bold text-ink tracking-wider mb-1">ROLE IN NARRATIVE</Text>
                {isEditing ? (
                  <BrutalTextInput
                    variant="single"
                    size="md"
                    value={role}
                    onChangeText={setRole}
                    style={{ fontSize: 14 }}
                  />
                ) : (
                  <Text className="font-body text-[14px] font-bold text-ink">{role}</Text>
                )}
              </View>

              {/* Backstory */}
              <View className="mb-5">
                <View className="border-b-2 border-ink pb-1 mb-3">
                  <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">BACKSTORY &amp; CHRONICLES</Text>
                </View>
                {isEditing ? (
                  <BrutalTextInput
                    variant="multiline"
                    minHeight={80}
                    maxHeight={260}
                    maxLength={10000}
                    value={backstory}
                    onChangeText={setBackstory}
                    style={{ fontSize: 14 }}
                  />
                ) : (
                  <Text className="font-body text-[14px] text-ink leading-5">{backstory}</Text>
                )}
              </View>

              {/* Visual Media & Gallery */}
              {(showLoreVisuals && (isEditing || visualMediaList.length > 0)) && (
                <View
                  className="p-3 rounded-button border-2 border-ink bg-white mb-5"
                  onLayout={(e) => setLoreContainerWidth(e.nativeEvent.layout.width)}
                >
                  <View className="flex-row items-center justify-between mb-3 border-b-2 border-ink pb-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">
                        VISUAL MEDIA &amp; GALLERY
                      </Text>
                      <BrutalPill label={`${visualMediaList.length} ASSETS`} fill={YELLOW} size="sm" />
                    </View>
                    <View className="flex-row items-center gap-2">
                      {isEditing && (
                        <>
                          <BrutalButton
                            label="+ ADD ARTWORK"
                            variant="primary"
                            accentColor={YELLOW}
                            size="sm"
                            icon={<Icon glyph={ICONS.addCircle} size={13} color={INK} />}
                            onPress={handleAddVisualMedia}
                          />
                          <TouchableOpacity
                            onPress={handleHideVisualMedia}
                            className="w-7 h-7 rounded-small border-2 border-ink bg-white items-center justify-center ml-1"
                            accessibilityLabel="Hide Visual Media section"
                          >
                            <Icon glyph={ICONS.delete} size={14} color="#DC2626" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-3">
                    {visualMediaList.map((vm) => (
                      <LoreVisualMediaFrame
                        key={vm.id}
                        item={vm}
                        isEditing={isEditing}
                        containerWidth={loreContainerWidth}
                        fixedHeight={200}
                        onTitleChange={(txt) => handleUpdateVisualMedia(vm.id, { title: txt })}
                        onChooseImage={() => setActiveChooserSlot(`lore-vm-${vm.id}`)}
                        onRemove={() => handleRemoveVisualMedia(vm.id)}
                        showRemove={visualMediaList.length > 1}
                        onPressImage={() => openLightbox(vm.image, vm.title)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Relationships */}
              {(showLoreRelationships && (isEditing || relationships.length > 0)) && (
                <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">CHARACTER RELATIONSHIPS</Text>
                    {isEditing && (
                      <TouchableOpacity onPress={handleHideRelationships}>
                        <Icon glyph={ICONS.delete} size={14} color={INK} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View className="border-2 border-ink rounded-button overflow-hidden bg-white">
                    {relationships.map((rel, rIdx) => {
                      const target = allEntries.find(e => e.id === rel.targetEntryId);
                      const targetTitle = target?.title ?? rel.targetEntryId;

                      return isEditing ? (
                        <View
                          key={rel.id ?? rIdx}
                          className={`p-3 ${rIdx !== relationships.length - 1 ? "border-b-2 border-ink" : ""} bg-cream/40`}
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center gap-2">
                              <Text className="font-display text-[11px] font-black text-ink">
                                CONNECT WITH: <Text className="text-yellow-700">{targetTitle}</Text>
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleRemoveRelationship(rel.id)}
                              className="w-6 h-6 rounded-small border-2 border-ink bg-white items-center justify-center"
                              activeOpacity={0.8}
                            >
                              <Icon glyph={ICONS.delete} size={12} color="#DC2626" />
                            </TouchableOpacity>
                          </View>

                          {/* Target Character Quick Selector */}
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2.5">
                            <View className="flex-row items-center gap-1.5 py-0.5">
                              {allEntries.filter(e => e.id !== entry.id).map(e => {
                                const isSelected = e.id === rel.targetEntryId;
                                return (
                                  <TouchableOpacity
                                    key={e.id}
                                    onPress={() => handleUpdateRelationship(rel.id, { targetEntryId: e.id })}
                                    className={`px-2.5 py-1 rounded-small border-2 border-ink ${isSelected ? 'bg-yellow' : 'bg-white'}`}
                                    activeOpacity={0.8}
                                  >
                                    <Text className={`font-display text-[10px] ${isSelected ? 'font-extrabold text-ink' : 'font-bold text-[#555]'}`}>
                                      {e.title}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>

                          {/* Relationship Note */}
                          <View>
                            <Text className="font-display text-[9px] font-extrabold text-[#666666] tracking-wider mb-1">
                              RELATIONSHIP ROLE / DYNAMICS
                            </Text>
                            <BrutalTextInput
                              size="sm"
                              value={rel.relation}
                              onChangeText={(txt) => handleUpdateRelationship(rel.id, { relation: txt })}
                              placeholder="e.g. Travel Companion & Guardian, Best Friend, Mentor..."
                            />
                          </View>
                        </View>
                      ) : (
                        <View
                          key={rel.id ?? rIdx}
                          className={`flex-row items-center justify-between p-2.5 ${rIdx !== relationships.length - 1 ? "border-b-2 border-ink" : ""}`}
                        >
                          <View>
                            <Text className="font-display text-[12px] font-extrabold text-ink">{targetTitle}</Text>
                            <Text className="font-body text-[11px] text-[#555555] mt-0.5 font-medium">{rel.relation}</Text>
                          </View>
                          <BrutalPill label="CONNECTED" fill={CREAM} size="sm" />
                        </View>
                      );
                    })}

                    {isEditing && (
                      <View className="p-2 border-t-2 border-ink bg-white">
                        <TouchableOpacity
                          onPress={handleAddRelationship}
                          className="flex-row items-center justify-center gap-2 py-2 rounded-small border-2 border-dashed border-ink bg-cream"
                          activeOpacity={0.8}
                        >
                          <Icon glyph={ICONS.addCircle} size={14} color={INK} />
                          <Text className="font-display text-[11px] font-extrabold text-ink">+ ADD RELATIONSHIP</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Additional Info Table */}
              {(showLoreAdditionalInfo && (isEditing || additionalInfo.length > 0)) && (
                <View className="p-3 rounded-button border-2 border-ink bg-white mb-5">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">ADDITIONAL ARCHIVAL INFO</Text>
                    {isEditing && (
                      <TouchableOpacity onPress={handleHideAdditionalInfo}>
                        <Icon glyph={ICONS.delete} size={14} color={INK} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View className="border-2 border-ink rounded-button overflow-hidden bg-white mb-2">
                    {additionalInfo.map((info, iIdx) => (
                      <View
                        key={iIdx}
                        className={`flex-row items-center ${iIdx !== 0 ? "border-t-2 border-ink" : ""}`}
                      >
                        {isEditing ? (
                          <>
                            <View className="w-[160px] flex-none p-2 border-r-2 border-ink bg-cream/40">
                              <BrutalTextInput
                                size="sm"
                                value={info.key}
                                onChangeText={(txt) => handleUpdateAdditionalInfo(iIdx, txt, info.value)}
                                placeholder="FIELD NAME..."
                                style={{ fontWeight: '800', fontSize: 11 }}
                              />
                            </View>
                            <View className="flex-1 p-2">
                              <BrutalTextInput
                                size="sm"
                                value={info.value}
                                onChangeText={(txt) => handleUpdateAdditionalInfo(iIdx, info.key, txt)}
                                placeholder="Field value / details..."
                                style={{ fontSize: 12 }}
                              />
                            </View>
                            <TouchableOpacity
                              onPress={() => handleRemoveAdditionalInfo(iIdx)}
                              className="w-8 h-8 rounded-small border-2 border-ink bg-white items-center justify-center mr-2"
                              activeOpacity={0.8}
                            >
                              <Icon glyph={ICONS.delete} size={12} color="#DC2626" />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <View className="w-[140px] flex-none p-3 border-r-2 border-ink">
                              <Text className="font-display text-[10px] font-extrabold text-[#666666] tracking-wider mb-1">{info.key.toUpperCase()}</Text>
                            </View>
                            <View className="flex-1 p-3">
                              <Text className="font-display text-[14px] font-extrabold text-ink">{info.value}</Text>
                            </View>
                          </>
                        )}
                      </View>
                    ))}

                    {isEditing && (
                      <View className="p-2 border-t-2 border-ink bg-white">
                        <TouchableOpacity
                          onPress={handleAddAdditionalInfo}
                          className="flex-row items-center justify-center gap-2 py-2 rounded-small border-2 border-dashed border-ink bg-cream"
                          activeOpacity={0.8}
                        >
                          <Icon glyph={ICONS.addCircle} size={14} color={INK} />
                          <Text className="font-display text-[11px] font-extrabold text-ink">+ ADD ARCHIVAL FIELD</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* User Added Custom Sections */}
              {customSections.map((sec, sIdx) => (
                <View key={sec.id} className="p-3 rounded-button border-2 border-ink bg-white mb-5">
                  <View className="flex-row items-center justify-between mb-3">
                    {isEditing ? (
                      <BrutalTextInput
                        variant="single"
                        size="md"
                        value={sec.title}
                        onChangeText={t => handleUpdateCustomSection(sIdx, { title: t })}
                        style={{ fontSize: 14 }}
                      />
                    ) : (
                      <Text className="font-display text-[14px] font-extrabold text-ink tracking-wide">{sec.title.toUpperCase()}</Text>
                    )}
                    {isEditing && (
                      <TouchableOpacity
                        onPress={() => handleRemoveCustomSection(sIdx)}
                        className="w-7 h-7 rounded-small border-2 border-ink bg-white items-center justify-center ml-2"
                        activeOpacity={0.8}
                      >
                        <Icon glyph={ICONS.delete} size={14} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {isEditing ? (
                    <BrutalTextInput
                      variant="multiline"
                      minHeight={80}
                      maxHeight={260}
                      maxLength={10000}
                      value={sec.body}
                      onChangeText={b => handleUpdateCustomSection(sIdx, { body: b })}
                      style={{ fontSize: 14 }}
                    />
                  ) : (
                    <Text className="font-body text-[14px] text-ink leading-5">{sec.body}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </BrutalBox>

      {/* ── Modals: Image Chooser from Device ── */}
      {renderImageChooserModal()}
    </View>
  );
};

export default EditorCanvas;

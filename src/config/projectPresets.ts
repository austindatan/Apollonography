/**
 * src/config/projectPresets.ts
 *
 * Unified configuration for Project Types, Presets, Allowed Blocks, and Entry Templates.
 * Single source of truth consumed across the application via the data-access layer.
 */

import { ICONS } from '../components/Icon';

export type ProjectType = 'lore' | 'gameplay' | 'cosmetics';

export type BlockType =
  | 'text'
  | 'infoTable'
  | 'relationships'
  | 'gallery'
  | 'abilityList'
  | 'stats';

export interface BlockMetadata {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
}

export interface TemplateSectionDefinition {
  title: string;
  type: BlockType;
  body?: string;
  items?: any[];
}

export interface EntryTemplate {
  id: string;
  label: string;
  category?: string;
  sections: TemplateSectionDefinition[];
}

export interface ProjectTypePreset {
  type: ProjectType;
  displayName: string;
  iconGlyph: string;
  suggestedCategories: string[];
  allowedBlocks: BlockType[];
  defaultView: 'editor' | 'gallery';
  entryTemplates: Record<string, EntryTemplate>;
}

export const BLOCK_METADATA: Record<BlockType, BlockMetadata> = {
  text: {
    type: 'text',
    label: 'Text',
    icon: '≡',
    description: 'Formatted narrative or article text',
  },
  infoTable: {
    type: 'infoTable',
    label: 'Info Table',
    icon: '▦',
    description: 'Structured key-value metadata',
  },
  relationships: {
    type: 'relationships',
    label: 'Relationships',
    icon: '🔗',
    description: 'Compact links to related characters or entities',
  },
  gallery: {
    type: 'gallery',
    label: 'Gallery',
    icon: '🖼',
    description: 'Image gallery and character artwork showcase',
  },
  abilityList: {
    type: 'abilityList',
    label: 'Kit (Abilities)',
    icon: '⚡',
    description: 'Combat skill mechanics and cooldowns',
  },
  stats: {
    type: 'stats',
    label: 'Base Stats',
    icon: '📊',
    description: 'Numerical attributes and combat stats',
  },
};

export const PROJECT_TYPE_PRESETS: Record<ProjectType, ProjectTypePreset> = {
  lore: {
    type: 'lore',
    displayName: 'Lore & Story',
    iconGlyph: ICONS.book,
    suggestedCategories: [
      'Characters',
      'Places',
      'Factions',
      'Plot & Events',
      'Key Items',
      'Timeline',
    ],
    allowedBlocks: ['text', 'infoTable', 'relationships'],
    defaultView: 'editor',
    entryTemplates: {
      character: {
        id: 'character',
        label: 'Character',
        sections: [
          { type: 'text', title: 'Overview', body: '' },
          { type: 'text', title: 'Backstory', body: '' },
          { type: 'text', title: 'Role in the Plot', body: '' },
          { type: 'relationships', title: 'Relationships', items: [] },
        ],
      },
      keyItem: {
        id: 'keyItem',
        label: 'Key Item',
        sections: [
          { type: 'text', title: 'Description', body: '' },
          { type: 'text', title: 'Significance to the Plot', body: '' },
        ],
      },
    },
  },

  gameplay: {
    type: 'gameplay',
    displayName: 'Characters & Gameplay',
    iconGlyph: ICONS.puzzle,
    suggestedCategories: [
      'Characters',
      'Items',
      'Teams',
    ],
    allowedBlocks: ['gallery', 'infoTable', 'text', 'abilityList', 'stats'],
    defaultView: 'editor',
    entryTemplates: {
      character: {
        id: 'character',
        label: 'Character',
        sections: [
          { type: 'gallery', title: 'Art Gallery', items: [] },
          {
            type: 'infoTable',
            title: 'Info',
            items: [
              { key: 'Class', value: '' },
              { key: 'Role', value: '' },
            ],
          },
          {
            type: 'abilityList',
            title: 'Kit',
            body: '',
            items: [],
          },
          { type: 'text', title: 'Backstory', body: '' },
        ],
      },
    },
  },

  cosmetics: {
    type: 'cosmetics',
    displayName: 'Character Cosmetics',
    iconGlyph: ICONS.star,
    suggestedCategories: [
      'Costumes',
      'Seasonal',
      'Special Edition',
      'Collaborations',
    ],
    allowedBlocks: ['gallery', 'infoTable', 'text'],
    defaultView: 'editor',
    entryTemplates: {
      fashion: {
        id: 'fashion',
        label: 'Fashion Article',
        sections: [
          { type: 'gallery', title: 'Visual Media', items: [] },
          {
            type: 'infoTable',
            title: 'Attributes & Classification',
            items: [
              { key: 'Status', value: 'Draft' },
              { key: 'Class', value: '' },
              { key: 'Rarity', value: '' },
            ],
          },
          { type: 'text', title: 'Cosmetic Series', body: '' },
        ],
      },
    },
  },
};

/**
 * src/__fixtures__/mockData.ts
 * Test fixtures for unit/integration tests only.
 * Production application code must never import from this file.
 */

import type { Entry, Project, UserProfile } from '../types/models';

const ORANGE = '#D4832A';
const PURPLE = '#5B4B9A';

export const FIXTURE_PROJECTS: Project[] = [
  {
    id: 'monster-strike',
    name: 'Monster Strike',
    type: 'gameplay',
    subtitle: 'Characters & Gameplay',
    avatar: null,
    background: null,
    accentColor: '#D4832A',
    accentColorEnd: '#F0A845',
    font: 'DM Sans',
    categories: [
      { id: 'all', name: 'All' },
      { id: 'characters', name: 'Characters' },
      { id: 'items', name: 'Items' },
      { id: 'teams', name: 'Teams' },
      { id: 'god', name: 'God' },
      { id: 'demon', name: 'Demon' },
      { id: 'dragon', name: 'Dragon' },
    ],
  },
  {
    id: 'honkai-star-rail',
    name: 'Honkai: Star Rail',
    type: 'lore',
    subtitle: 'Lore & Story',
    avatar: null,
    background: null,
    accentColor: '#5B4B9A',
    accentColorEnd: '#8B7DD4',
    font: 'DM Sans',
    categories: [
      { id: 'all', name: 'All' },
      { id: 'characters', name: 'Characters' },
      { id: 'places', name: 'Places' },
      { id: 'factions', name: 'Factions' },
      { id: 'plot-events', name: 'Plot & Events' },
      { id: 'key-items', name: 'Key Items' },
      { id: 'timeline', name: 'Timeline' },
    ],
  },
  {
    id: 'arknights',
    name: 'Arknights',
    type: 'cosmetics',
    subtitle: 'Character Cosmetics',
    avatar: null,
    background: null,
    accentColor: '#4ECDC4',
    accentColorEnd: '#FFD93D',
    font: 'DM Sans',
    categories: [
      { id: 'all', name: 'All' },
      { id: 'epoch', name: 'Epoch' },
      { id: 'coral-coast', name: 'Coral Coast' },
      { id: 'witch-feast', name: 'Witch Feast' },
      { id: 'raythean', name: 'Raythean' },
      { id: 'bloodline', name: 'Bloodline of Combat' },
    ],
  },
];

export const FIXTURE_ENTRIES: Entry[] = [
  {
    id: 'ms-orion',
    projectId: 'monster-strike',
    categoryId: 'god',
    title: 'Orion',
    summary: 'The Hunter constellation given form. Strikes the board in a straight line; never misses.',
    thumbnail: null,
    portrait: null,
    tags: [
      { id: 'god', name: 'God', color: ORANGE },
      { id: 'pierce', name: 'Pierce', color: '#B36020' },
    ],
    infoFields: [
      { key: 'Class', value: 'God / Pierce' },
      { key: 'Element', value: 'Light' },
      { key: 'Rarity', value: '★★★★★★ (6★)' },
      { key: 'Series', value: 'Twelve Celestial Spirits' },
    ],
    sections: [
      {
        title: 'Overview',
        body: 'Orion is a Light-attribute Pierce unit designed for long straight-line stages.',
      },
    ],
  },
  {
    id: 'ms-lucifer',
    projectId: 'monster-strike',
    categoryId: 'god',
    title: 'Lucifer',
    summary: 'The Monarch of Rebellion. Commands energy circles.',
    thumbnail: null,
    portrait: null,
    tags: [
      { id: 'god', name: 'God', color: ORANGE },
      { id: 'bounce', name: 'Bounce', color: '#8E44AD' },
    ],
    infoFields: [
      { key: 'Class', value: 'Monarch / Bounce' },
      { key: 'Element', value: 'Dark' },
      { key: 'Rarity', value: '★★★★★★ (6★)' },
    ],
    sections: [
      {
        title: 'Overview',
        body: 'Lucifer is renowned for her Double Energy Circle L friendship combo.',
      },
    ],
  },
];

export const FIXTURE_PROFILE: UserProfile = {
  id: 'user-1',
  name: 'Test Archivist',
  initials: 'TA',
  avatarColor: '#B59CDD',
  username: '@testuser',
  bio: 'Test Archivist biography.',
  role: 'WORKSPACE OWNER',
  theme: 'cream',
  accentColor: '#B59CDD',
  autoSave: true,
  defaultView: 'editor',
  confirmDeletions: true,
};

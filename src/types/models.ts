/**
 * src/types/models.ts
 * Canonical TypeScript types for Apollonography.
 * Components import ONLY these types, never the mock data directly.
 * Swap the hooks' internals for real backend calls without touching UI.
 */

export * from './images';

export interface Category {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  /** hex color for the pill */
  color: string;
}

export interface InfoField {
  key: string;
  value: string;
}

export type ProjectType = 'lore' | 'gameplay' | 'cosmetics';

export type BlockType =
  | 'text'
  | 'infoTable'
  | 'relationships'
  | 'gallery'
  | 'abilityList'
  | 'stats';

export interface RelationshipItem {
  id: string;
  targetEntryId: string;
  relation: string;
}

export interface Section {
  id?: string;
  title: string;
  type?: BlockType;
  body?: string;
  items?: RelationshipItem[] | any[];
  [key: string]: any;
}

export interface Entry {
  id: string;
  projectId: string;
  categoryId: string;
  title: string;
  subtitle?: string;
  /** One-paragraph teaser shown in cards */
  summary: string;
  /** Square image for the list card */
  thumbnail: any; // require('...')
  /** Tall 2:3 image for gallery cards */
  portrait: any;  // require('...')
  /** Wide landscape splash art or standard splash art */
  splash?: any;   // require('...')
  /** Elite 2 Gallery Image (Character Cosmetics) */
  e2Portrait?: any;
  /** Elite 2 Splash Art (Character Cosmetics) */
  e2Splash?: any;
  evolutions?: any[];
  wardrobes?: any[];
  tags: Tag[];
  infoFields: InfoField[];
  sections: Section[];
  abilities?: Ability[];
  // Legacy fields for backward compatibility
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

export type AbilityType = 'passive' | 'skill' | 'ultimate' | 'custom';

export interface Ability {
  id: string;
  type: AbilityType;
  name: string;
  desc: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  iconType?: 'curated' | 'custom' | 'emoji';
  emoji?: string;
  cost?: string;
  cooldown?: string;
  tags?: string[];
}

export interface ElementOption {
  id: string;
  name: string;
  color: string;
}

export interface AttributeOption {
  id: string;
  name: string;
  color?: string;
}

export type AttributeType = 'class' | 'element' | 'rarity' | 'series';

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  /** Short descriptor shown under the name, e.g. "Characters & Gameplay" */
  subtitle: string;
  /** Circular avatar image */
  avatar: any;
  /** Full-bleed background image */
  background: any;
  /** Primary accent hex (solid fallback + gradient start) */
  accentColor: string;
  /** Gradient end color */
  accentColorEnd: string;
  font: string;
  categories: Category[];
  classOptions?: AttributeOption[];
  elementOptions?: ElementOption[];
  rarityOptions?: AttributeOption[];
  seriesOptions?: AttributeOption[];
}

export interface UserProfile {
  id: string;
  name: string;
  /** Initials shown in the avatar circle */
  initials: string;
  avatarColor: string;
  username?: string;
  bio?: string;
  avatarUri?: any | null;
  role?: string;
  theme?: 'cream' | 'light' | 'dark';
  accentColor?: string;
  autoSave?: boolean;
  defaultView?: 'editor' | 'gallery' | 'series';
  confirmDeletions?: boolean;
}

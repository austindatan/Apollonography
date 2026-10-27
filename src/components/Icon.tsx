/**
 * src/components/Icon.tsx
 * Uses Segoe MDL2 Assets — the Windows system icon font.
 * Always available on Windows 10/11, no extra setup needed.
 *
 * Usage:  <Icon glyph={ICONS.search} size={16} color="#888" />
 */
import React from 'react';
import { Text } from 'react-native';

// ── Glyph map (Segoe MDL2 Assets codepoints) ──────────────────────────────────
export const ICONS = {
  search: '\uE721',   // Magnifier
  settings: '\uE713',   // Gear
  add: '\uE710',   // Plus / Add
  addCircle: '\uECC8',   // CircleAddition
  edit: '\uE70F',   // Edit / Pencil
  grid: '\uE8A9',   // ViewAll (2×2 grid)
  filter: '\uE71C',   // Filter
  sort: '\uE8CB',   // Sort
  book: '\uE736',   // Library / open book  (Lore & Story)
  cosmetics: '\uE790',   // Color palette        (Character Cosmetics)
  star: '\uE734',   // Favorite / Star
  puzzle: '\uEA86',   // Puzzle piece         (Characters & Gameplay)
  game: '\uE7F4',   // GameConsole
  person: '\uE77B',   // Contact / person
  chevronRight: '\uE76C',   // ChevronRight
  chevronDown: '\uE70D',   // ChevronDown
  delete: '\uE74D',   // Trash / Delete
  link: '\uE71B',   // Link / Chain
  home: '\uE80F',   // Home
  folder: '\uE8B7',   // Folder
  article: '\uE8A5',   // Document / Article
  clock: '\uE823',   // Recent / Clock
  arrowRight: '\uE72A',   // Forward / ArrowRight
  image: '\uEB9F',   // Picture / Photo
} as const;

interface IconProps {
  glyph: string;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ glyph, size = 14, color = '#666666' }) => (
  <Text
    style={{
      fontFamily: 'Segoe MDL2 Assets',
      fontSize: size,
      color,
    }}
  >
    {glyph}
  </Text>
);

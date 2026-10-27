/**
 * src/theme/brutal.ts
 *
 * Apollonography Neobrutalism Design System
 * Single source of truth for all visual tokens.
 */

// Core palette
export const INK      = '#141414';
export const CREAM    = '#FBF3EA';
export const WHITE    = '#FFFFFF';
export const OFFWHITE = '#F5EDE0';

// Vibrant flat colors
export const CORAL    = '#FF6B6B';
export const LAVENDER = '#B59CDD';
export const TEAL     = '#4ECDC4';
export const YELLOW   = '#FFD93D';
export const ORANGE   = '#FF9F5A';

// App brand
export const BRAND_LAVENDER = '#9A7DD0';
export const BRAND_GOLD     = '#E8B84B';

// Per-project accent map
export type ProjectAccent = { primary: string; secondary: string };
export const PROJECT_ACCENTS: Record<string, ProjectAccent> = {
  'monster-strike':   { primary: ORANGE,    secondary: YELLOW   },
  'honkai-star-rail': { primary: LAVENDER,  secondary: TEAL     },
  'arknights':        { primary: TEAL,      secondary: YELLOW   },
  'reverse-1999':     { primary: CORAL,     secondary: YELLOW   },
  default:            { primary: BRAND_LAVENDER, secondary: YELLOW },
};
export function getProjectAccent(projectId: string): ProjectAccent {
  return PROJECT_ACCENTS[projectId] ?? PROJECT_ACCENTS.default;
}

// Typography
export const FONTS = {
  body:            'DM Sans',
  bodyBold:        'DM Sans',
  display:         'SpaceGrotesk-Bold',
  displayFallback: 'DM Sans',
} as const;

// Borders
export const BORDER = { width: 2, widthHeavy: 3, color: INK } as const;

// Shadows (hard offset, no blur — use BrutalBox)
export const SHADOW = { offset: 4, offsetSmall: 3, offsetHeavy: 6, color: INK } as const;

// Corner radii
export const RADIUS = { card: 12, button: 10, pill: 999, input: 10, small: 6, icon: 8 } as const;

// Spacing
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Typography scale
export const TYPE = { display: 28, h1: 22, h2: 18, h3: 15, body: 13, small: 11, label: 10 } as const;

export const SIDEBAR_WIDTH = 270;

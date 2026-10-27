/**
 * src/components/AbilityIconTile.tsx
 *
 * Renders an ability's icon tile:
 * - If game-icons icon is selected: renders the transparent PNG tinted with iconColor on iconBg.
 * - If emoji is selected: renders the emoji in a styled brutal tile.
 * - Crisp, responsive, pixel-perfect on React Native Windows.
 */

import React from 'react';
import { Image, Text, View, ViewStyle } from 'react-native';
import { INK, RADIUS, WHITE } from '../theme/brutal';
import { GAME_ICONS_BY_ID } from '../data/gameIcons';

interface AbilityIconTileProps {
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  iconType?: 'curated' | 'custom' | 'emoji';
  emoji?: string;
  size?: number;
  radius?: number;
  borderWidth?: number;
  style?: ViewStyle;
}

export const AbilityIconTile: React.FC<AbilityIconTileProps> = ({
  icon,
  iconBg,
  iconColor,
  iconType,
  emoji,
  size = 32,
  radius = RADIUS.small,
  borderWidth = 1.5,
  style,
}) => {
  const isCustomImage =
    iconType === 'custom' ||
    (icon && (icon.startsWith('file:') || icon.startsWith('http:') || icon.startsWith('https:')));
  const gameIconItem = !isCustomImage && icon ? GAME_ICONS_BY_ID[icon] : null;

  // Determine effective background
  const effectiveBg =
    iconBg !== undefined
      ? iconBg
      : isCustomImage
      ? WHITE
      : gameIconItem
      ? '#141414'
      : WHITE;
  const isTransparent = effectiveBg === 'transparent' || !effectiveBg;

  // Determine effective foreground tint color
  const effectiveColor = iconColor || (effectiveBg === '#FFFFFF' || isTransparent ? INK : WHITE);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth,
          borderColor: INK,
          backgroundColor: effectiveBg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {isCustomImage && icon ? (
        <Image
          source={{ uri: icon }}
          style={{
            width: Math.round(size * 0.75),
            height: Math.round(size * 0.75),
          }}
          resizeMode="contain"
        />
      ) : gameIconItem ? (
        <Image
          source={gameIconItem.source}
          style={{
            width: Math.round(size * 0.7),
            height: Math.round(size * 0.7),
            tintColor: effectiveColor,
          }}
          resizeMode="contain"
        />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.48), textAlign: 'center' }}>
          {emoji || '⚔️'}
        </Text>
      )}
    </View>
  );
};

export default AbilityIconTile;

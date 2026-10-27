/**
 * src/components/CategoryChip.tsx
 *
 * Category filter chip using Neobrutalist BrutalPill.
 * Selected chip = project accent fill with bold label; others white with 2px ink border.
 */
import React from 'react';
import { View } from 'react-native';
import { INK, WHITE } from '../theme/brutal';
import BrutalPill from './brutal/BrutalPill';

interface Props {
  label: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
}

export const CategoryChip: React.FC<Props> = ({ label, selected, accentColor, onPress }) => (
  <View className="mr-2 mb-2">
    <BrutalPill
      label={label}
      fill={selected ? accentColor : WHITE}
      textColor={INK}
      active={selected}
      activeFill={accentColor}
      hasShadow={true}
      onPress={onPress}
      size="md"
    />
  </View>
);

export default CategoryChip;

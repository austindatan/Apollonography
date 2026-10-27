/**
 * src/components/brutal/BrutalDivider.tsx
 *
 * Neobrutalist bold divider line.
 * Supports solid, dashed, and vertical/horizontal orientations.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { BORDER, INK } from '../../theme/brutal';

interface BrutalDividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  dashed?: boolean;
  color?: string;
  style?: ViewStyle;
}

export const BrutalDivider: React.FC<BrutalDividerProps> = ({
  orientation = 'horizontal',
  thickness = BORDER.width,
  dashed = false,
  color = INK,
  style,
}) => {
  if (orientation === 'vertical') {
    return (
      <View
        className={dashed ? 'border-r-2 border-dashed border-ink bg-transparent' : 'bg-ink'}
        style={[
          {
            width: thickness,
            backgroundColor: dashed ? 'transparent' : color,
            borderRightWidth: dashed ? thickness : undefined,
            borderRightColor: dashed ? color : undefined,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      className={dashed ? 'border-b-2 border-dashed border-ink bg-transparent' : 'bg-ink'}
      style={[
        {
          height: thickness,
          backgroundColor: dashed ? 'transparent' : color,
          borderBottomWidth: dashed ? thickness : undefined,
          borderBottomColor: dashed ? color : undefined,
        },
        style,
      ]}
    />
  );
};

export default BrutalDivider;

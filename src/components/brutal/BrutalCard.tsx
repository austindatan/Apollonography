/**
 * src/components/brutal/BrutalCard.tsx
 *
 * Neobrutalist Card container with a bold border and hard-offset shadow.
 * Wraps content with consistent padding and optional press action.
 */
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BORDER, INK, RADIUS, SHADOW, SPACE, WHITE } from '../../theme/brutal';
import BrutalBox from './BrutalBox';

interface BrutalCardProps {
  children: React.ReactNode;
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  shadowOffset?: number;
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  fill = WHITE,
  borderColor = INK,
  borderWidth = BORDER.width,
  radius = RADIUS.card,
  shadowOffset = SHADOW.offset,
  onPress,
  style,
  contentStyle,
  testID,
}) => {
  return (
    <BrutalBox
      fill={fill}
      borderColor={borderColor}
      borderWidth={borderWidth}
      radius={radius}
      shadowOffset={shadowOffset}
      onPress={onPress}
      style={style}
    >
      <View className="p-3" style={contentStyle}>{children}</View>
    </BrutalBox>
  );
};

export default BrutalCard;

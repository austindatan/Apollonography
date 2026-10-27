/**
 * src/components/brutal/BrutalButton.tsx
 *
 * Neobrutalist Button with hard-offset shadow and tactile press shift.
 * Supports primary (brand/accent fill), secondary (white fill), accent, ink, and dashed variants.
 */
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { BORDER, FONTS, INK, RADIUS, SHADOW, TYPE, WHITE, YELLOW } from '../../theme/brutal';
import BrutalBox from './BrutalBox';

export type BrutalButtonVariant = 'primary' | 'secondary' | 'accent' | 'ink' | 'dashed' | 'ghost';
export type BrutalButtonSize = 'sm' | 'md' | 'lg';

interface BrutalButtonProps {
  label?: string;
  onPress?: () => void;
  variant?: BrutalButtonVariant;
  size?: BrutalButtonSize;
  accentColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
  fullWidth?: boolean;
  testID?: string;
}

export const BrutalButton: React.FC<BrutalButtonProps> = ({
  label,
  onPress,
  variant = 'secondary',
  size = 'md',
  accentColor = YELLOW,
  icon,
  disabled = false,
  style,
  textStyle,
  children,
  fullWidth = false,
  testID,
}) => {
  let fill = WHITE;
  let textColor = INK;
  let borderColor = INK;
  let borderStyle: 'solid' | 'dashed' = 'solid';

  switch (variant) {
    case 'primary':
    case 'accent':
      fill = accentColor;
      textColor = INK;
      break;
    case 'ink':
      fill = INK;
      textColor = WHITE;
      break;
    case 'dashed':
      fill = 'transparent';
      textColor = INK;
      borderStyle = 'dashed';
      break;
    case 'ghost':
      fill = 'transparent';
      borderColor = 'transparent';
      textColor = INK;
      break;
    case 'secondary':
    default:
      fill = WHITE;
      textColor = INK;
      break;
  }

  // Size configurations
  let paddingVertical = 10;
  let paddingHorizontal = 16;
  let fontSize: number = TYPE.body;
  let radius: number = RADIUS.button;
  let shadowOffset: number = SHADOW.offset;

  if (size === 'sm') {
    paddingVertical = 6;
    paddingHorizontal = 10;
    fontSize = TYPE.small;
    radius = RADIUS.small;
    shadowOffset = SHADOW.offsetSmall;
  } else if (size === 'lg') {
    paddingVertical = 14;
    paddingHorizontal = 24;
    fontSize = TYPE.h3;
    radius = RADIUS.button;
    shadowOffset = SHADOW.offsetHeavy;
  }

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical,
    paddingHorizontal,
    borderStyle,
    opacity: disabled ? 0.6 : 1,
    ...(fullWidth ? { width: '100%' } : {}),
    ...(style ?? {}),
  };

  const labelStyle: TextStyle = {
    fontFamily: FONTS.display,
    fontSize,
    color: textColor,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...(textStyle ?? {}),
  };

  return (
    <BrutalBox
      fill={fill}
      borderColor={borderColor}
      radius={radius}
      shadowOffset={variant === 'ghost' ? 0 : shadowOffset}
      onPress={onPress}
      disabled={disabled}
      style={containerStyle}
    >
      {icon ? <View className={label ? 'mr-2' : undefined}>{icon}</View> : null}
      {label ? (
        <Text
          className="font-display uppercase tracking-wider font-bold"
          style={[{ fontSize, color: textColor }, textStyle]}
        >
          {label}
        </Text>
      ) : null}
      {children}
    </BrutalBox>
  );
};

export default BrutalButton;

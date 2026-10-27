/**
 * src/components/brutal/BrutalPill.tsx
 *
 * Neobrutalist sticker-style Pill / Chip component.
 * Features 2px ink border, fully-rounded radius (999), flat vibrant fills,
 * and optional tactile hard-offset shadow for interactive chips.
 */
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BORDER, FONTS, INK, RADIUS, SHADOW, TYPE, WHITE } from '../../theme/brutal';

interface BrutalPillProps {
  label: string;
  fill?: string;
  textColor?: string;
  active?: boolean;
  activeFill?: string;
  onPress?: () => void;
  size?: 'sm' | 'md';
  hasShadow?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const BrutalPill: React.FC<BrutalPillProps> = ({
  label,
  fill = WHITE,
  textColor,
  active = false,
  activeFill,
  onPress,
  size = 'md',
  hasShadow = false,
  icon,
  style,
  textStyle,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const bg = active ? (activeFill ?? INK) : fill;
  const isDark = bg === INK;
  const resolvedTextColor = textColor ?? (active && isDark ? WHITE : INK);

  const isSmall = size === 'sm';
  const paddingH = isSmall ? 8 : 12;
  const paddingV = isSmall ? 3 : 6;
  const fontSize = isSmall ? TYPE.label : TYPE.small;
  const shadowOffset = SHADOW.offsetSmall;

  const innerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg,
    borderWidth: BORDER.width,
    borderColor: INK,
    borderRadius: RADIUS.pill,
    paddingHorizontal: paddingH,
    paddingVertical: paddingV,
    position: 'relative',
    top: isPressed && onPress && hasShadow ? 2 : 0,
    left: isPressed && onPress && hasShadow ? 2 : 0,
    zIndex: 1,
    ...(style ?? {}),
  };

  const labelEl = (
    <Text
      className="font-display font-bold tracking-wider uppercase"
      style={[
        {
          fontSize,
          color: resolvedTextColor,
        },
        textStyle,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  const content = (
    <>
      {icon ? <View className="mr-1.5">{icon}</View> : null}
      {labelEl}
    </>
  );

  if (!onPress) {
    if (hasShadow) {
      return (
        <View className="relative mb-1 mr-1">
          <View
            className="absolute bg-ink rounded-full z-0"
            style={{
              top: shadowOffset,
              left: shadowOffset,
              right: -shadowOffset,
              bottom: -shadowOffset,
            }}
          />
          <View style={innerStyle}>{content}</View>
        </View>
      );
    }
    return <View style={innerStyle}>{content}</View>;
  }

  if (hasShadow) {
    return (
      <View className="relative mb-1 mr-1">
        <View
          className="absolute bg-ink rounded-full z-0"
          style={{
            top: shadowOffset,
            left: shadowOffset,
            right: -shadowOffset,
            bottom: -shadowOffset,
          }}
        />
        <TouchableOpacity
          onPress={onPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          activeOpacity={0.9}
          style={innerStyle}
        >
          {content}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={innerStyle}>
      {content}
    </TouchableOpacity>
  );
};

export default BrutalPill;

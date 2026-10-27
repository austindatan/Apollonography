/**
 * src/components/brutal/BrutalBox.tsx
 *
 * The core Neobrutalism primitive.
 * Renders a hard-offset INK shadow by stacking two Views:
 *   1. Shadow layer (absolute, offset right+down, INK fill)
 *   2. Real element (ink border, colored/white fill)
 *
 * Use onPress + pressed to get the "press down" shift effect.
 * shadowOffset/elevation are NOT used (they blur on Windows).
 */
import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { BORDER, INK, RADIUS, SHADOW, WHITE } from '../../theme/brutal';

export interface BrutalBoxProps {
  children: React.ReactNode;
  style?: ViewStyle;
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  shadowOffset?: number;
  onPress?: () => void;
  activeOpacity?: number;
  disabled?: boolean;
  /** If true, renders as a plain View (no press behavior) */
  static?: boolean;
}

export const BrutalBox: React.FC<BrutalBoxProps> = ({
  children,
  style,
  fill = WHITE,
  borderColor = INK,
  borderWidth = BORDER.width,
  radius = RADIUS.card,
  shadowOffset = SHADOW.offset,
  onPress,
  activeOpacity = 0.95,
  disabled = false,
  static: isStatic = false,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const shift = isPressed && !disabled ? Math.max(1, shadowOffset - 1) : 0;

  const {
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginHorizontal,
    marginVertical,
    ...restStyle
  } = (style as any) ?? {};

  const isFlex = style && (style as any).flex !== undefined;
  const flexVal = isFlex ? (style as any).flex : undefined;
  const isHeightFull = style && ((style as any).height === '100%' || (style as any).height !== undefined);

  const innerStyle: ViewStyle = {
    backgroundColor: fill,
    borderWidth,
    borderColor,
    borderRadius: radius,
    position: 'relative',
    top: shift,
    left: shift,
    zIndex: 1,
    ...(isFlex ? { flex: 1, width: '100%', height: '100%' } : {}),
    ...(restStyle ?? {}),
  };

  const hasShadow = shadowOffset > 0;

  const shadowStyle: ViewStyle = {
    position: 'absolute',
    top: shadowOffset,
    left: shadowOffset,
    right: -shadowOffset,
    bottom: -shadowOffset,
    backgroundColor: borderColor,
    borderRadius: radius,
    zIndex: 0,
  };

  const wrapper: ViewStyle = {
    position: 'relative',
    ...(margin !== undefined ? { margin } : {}),
    ...(marginTop !== undefined ? { marginTop } : {}),
    marginBottom: (typeof marginBottom === 'number' ? marginBottom : 0) + (hasShadow ? shadowOffset : 0),
    ...(marginLeft !== undefined ? { marginLeft } : {}),
    marginRight: (typeof marginRight === 'number' ? marginRight : 0) + (hasShadow ? shadowOffset : 0),
    ...(marginHorizontal !== undefined ? { marginHorizontal } : {}),
    ...(marginVertical !== undefined ? { marginVertical } : {}),
    ...(isFlex ? { flex: flexVal } : {}),
    ...(isHeightFull ? { height: (style as any).height } : {}),
    ...(style && (style as any).width !== undefined ? { width: (style as any).width } : {}),
    ...(style && (style as any).alignSelf ? { alignSelf: (style as any).alignSelf } : {}),
  };

  if (isStatic || !onPress) {
    return (
      <View style={wrapper}>
        {hasShadow && <View style={shadowStyle} />}
        <View style={innerStyle}>{children}</View>
      </View>
    );
  }

  return (
    <View style={wrapper}>
      {hasShadow && <View style={shadowStyle} />}
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        activeOpacity={activeOpacity}
        style={innerStyle}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
};

export default BrutalBox;

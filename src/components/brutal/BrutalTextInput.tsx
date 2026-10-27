/**
 * src/components/brutal/BrutalTextInput.tsx
 *
 * Neobrutalist Text Input wrapper specifically tuned for React Native Windows.
 * This is the SINGLE SOURCE OF TRUTH for all plain text input alignment.
 *
 * Rules:
 * - Single-line: fixed height from size ("sm": 34, "md": 40, "lg": 44),
 *   paddingTop: 0, paddingBottom: 0 (plus tuned DM Sans baseline compensation),
 *   paddingHorizontal: 10,
 *   lineHeight EQUAL TO height minus border width (height - 2*borderWidth).
 * - Multiline: no fixed height. minHeight of ~3 lines, paddingTop: 10, paddingBottom: 10,
 *   explicit lineHeight ~1.45x fontSize, grows with content via onContentSizeChange.
 *   Never shorter than one line plus padding.
 * - fontSize, lineHeight, padding, and fontFamily are strictly in the `style` prop,
 *   NOT Tailwind classes, ensuring nothing overrides them.
 * - textAlignVertical and includeFontPadding are Android-only and omitted.
 */

import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  TextStyle,
  StyleProp,
} from 'react-native';
import { BORDER, FONTS, INK, RADIUS, WHITE } from '../../theme/brutal';

export type BrutalTextInputSize = 'sm' | 'md' | 'lg';
export type BrutalTextInputVariant = 'single' | 'multiline';

export interface BrutalTextInputProps extends Omit<TextInputProps, 'style'> {
  variant?: BrutalTextInputVariant;
  size?: BrutalTextInputSize;
  style?: StyleProp<TextStyle>;
  className?: string;
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Tuned constant to compensate for DM Sans and custom font baseline metrics on Windows DirectWrite/GDI.
 * In React Native Windows, increasing bottom inset shifts text upward into true vertical center.
 */
export const DM_SANS_VERTICAL_COMPENSATION = 3;

const SIZE_CONFIG: Record<
  BrutalTextInputSize,
  { height: number; fontSize: number; paddingHorizontal: number }
> = {
  sm: { height: 34, fontSize: 12, paddingHorizontal: 10 },
  md: { height: 40, fontSize: 13, paddingHorizontal: 10 },
  lg: { height: 44, fontSize: 18, paddingHorizontal: 10 },
};

export const BrutalTextInput: React.FC<BrutalTextInputProps> = ({
  variant,
  size = 'md',
  style,
  className = '',
  fill = WHITE,
  borderColor = INK,
  borderWidth,
  placeholderTextColor = '#888888',
  multiline,
  numberOfLines,
  minHeight,
  maxHeight,
  onContentSizeChange,
  ...restProps
}) => {
  const isMultiline = variant === 'multiline' || multiline === true;
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const flattenedUserStyle = StyleSheet.flatten(style) || {};

  const [measuredContentHeight, setMeasuredContentHeight] = useState<number>(0);

  const effectiveBorderWidth =
    typeof flattenedUserStyle.borderWidth === 'number'
      ? flattenedUserStyle.borderWidth
      : (borderWidth ?? BORDER.width ?? 2);

  const effectiveBorderColor = flattenedUserStyle.borderColor || borderColor || INK;
  const effectiveBgColor = (flattenedUserStyle.backgroundColor as string) || fill || WHITE;
  const effectiveColor = (flattenedUserStyle.color as string) || INK;
  const effectiveRadius =
    typeof flattenedUserStyle.borderRadius === 'number'
      ? flattenedUserStyle.borderRadius
      : RADIUS.button;

  const effectiveFontFamily = flattenedUserStyle.fontFamily || FONTS.body;
  const isDMSans =
    effectiveFontFamily.includes('DM Sans') ||
    effectiveFontFamily.includes('DMSans') ||
    effectiveFontFamily.includes('SpaceGrotesk');

  if (isMultiline) {
    const fontSize = typeof flattenedUserStyle.fontSize === 'number' ? flattenedUserStyle.fontSize : 13;
    // Explicit lineHeight about 1.45x fontSize
    const lineHeight =
      typeof flattenedUserStyle.lineHeight === 'number'
        ? flattenedUserStyle.lineHeight
        : Math.round(fontSize * 1.45);

    const paddingTop = 10;
    const paddingBottom = 10;
    const paddingHorizontal = 10;

    // Minimum 3 lines of text plus top and bottom padding
    const minThreeLinesHeight = lineHeight * 3 + paddingTop + paddingBottom;
    const oneLinePlusPadding = lineHeight + paddingTop + paddingBottom;
    const userMinHeight = typeof minHeight === 'number' ? minHeight : flattenedUserStyle.minHeight;
    const baseMinHeight = Math.max(
      oneLinePlusPadding,
      typeof userMinHeight === 'number' ? userMinHeight : minThreeLinesHeight
    );

    const userMaxHeight = typeof maxHeight === 'number' ? maxHeight : flattenedUserStyle.maxHeight;
    const effectiveMaxHeight = typeof userMaxHeight === 'number' ? Math.max(baseMinHeight, userMaxHeight) : 500;

    // Dynamic height that grows with content, bounded between baseMinHeight and effectiveMaxHeight
    const rawHeight =
      measuredContentHeight > 0
        ? Math.max(baseMinHeight, measuredContentHeight + paddingTop + paddingBottom)
        : baseMinHeight;
    const currentHeight = Math.min(rawHeight, effectiveMaxHeight);

    const multilineStyle: TextStyle = {
      fontFamily: effectiveFontFamily,
      color: effectiveColor,
      backgroundColor: effectiveBgColor,
      borderColor: effectiveBorderColor,
      borderWidth: effectiveBorderWidth,
      borderRadius: effectiveRadius,
      ...flattenedUserStyle,
      // Strictly enforced in style prop to guarantee alignment and descender room
      fontSize,
      lineHeight,
      height: currentHeight,
      minHeight: baseMinHeight,
      maxHeight: effectiveMaxHeight,
      paddingTop,
      paddingBottom,
      paddingHorizontal,
    };

    return (
      <TextInput
        {...restProps}
        multiline={true}
        numberOfLines={numberOfLines ?? 3}
        scrollEnabled={restProps.scrollEnabled ?? (rawHeight >= effectiveMaxHeight)}
        placeholderTextColor={placeholderTextColor}
        className={className}
        style={multilineStyle}
        onContentSizeChange={(e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
          const contentH = e.nativeEvent.contentSize.height;
          if (contentH > 0) {
            const clampedH = Math.min(contentH, effectiveMaxHeight);
            if (Math.abs(clampedH - measuredContentHeight) > 1) {
              setMeasuredContentHeight(clampedH);
            }
          }
          if (onContentSizeChange) {
            onContentSizeChange(e);
          }
        }}
      />
    );
  }

  // Single-line input
  const height = typeof flattenedUserStyle.height === 'number' ? flattenedUserStyle.height : config.height;
  const fontSize = typeof flattenedUserStyle.fontSize === 'number' ? flattenedUserStyle.fontSize : config.fontSize;

  // lineHeight EQUAL TO height minus border width (fills the line box so text lands in the middle)
  const totalBorderHeight = effectiveBorderWidth * 2;
  const calculatedLineHeight = Math.max(fontSize, height - totalBorderHeight);
  const lineHeight =
    typeof flattenedUserStyle.lineHeight === 'number'
      ? flattenedUserStyle.lineHeight
      : calculatedLineHeight;

  // Single tuned constant for DM Sans / custom fonts on Windows
  const paddingBottomOffset = isDMSans ? DM_SANS_VERTICAL_COMPENSATION : 0;

  const singleStyle: TextStyle = {
    fontFamily: effectiveFontFamily,
    color: effectiveColor,
    backgroundColor: effectiveBgColor,
    borderColor: effectiveBorderColor,
    borderWidth: effectiveBorderWidth,
    borderRadius: effectiveRadius,
    ...flattenedUserStyle,
    // Strictly enforced in style prop to prevent Tailwind overrides
    height,
    fontSize,
    lineHeight,
    paddingTop: 0,
    paddingBottom: paddingBottomOffset,
    paddingHorizontal: 10,
  };

  return (
    <TextInput
      {...restProps}
      multiline={false}
      placeholderTextColor={placeholderTextColor}
      className={className}
      style={singleStyle}
    />
  );
};

export default BrutalTextInput;

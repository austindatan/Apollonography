/**
 * src/components/brutal/BrutalInput.tsx
 *
 * Neobrutalist Text Input with 2px ink border and hard-offset shadow.
 * Ideal for search bars and text fields.
 */
import React from 'react';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { BORDER, FONTS, INK, RADIUS, SHADOW, SPACE, TYPE, WHITE } from '../../theme/brutal';
import { BrutalTextInput } from './BrutalTextInput';

interface BrutalInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  fill?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}

export const BrutalInput: React.FC<BrutalInputProps> = ({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor = '#777777',
  icon,
  rightElement,
  style,
  inputStyle,
  fill = WHITE,
  autoCapitalize = 'none',
  autoCorrect = false,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View className="relative mb-1 mr-1" style={style}>
      {/* Hard offset shadow */}
      <View className="absolute top-1 left-1 -right-1 -bottom-1 bg-ink rounded-input z-0" />

      <View
        style={[
          {
            backgroundColor: fill,
            flexDirection: 'row',
            alignItems: 'center',
            height: 40,
            paddingHorizontal: 10,
            borderWidth: 2,
            borderColor: INK,
            borderRadius: RADIUS.input,
            position: 'relative',
            zIndex: 10,
          },
        ]}
      >
        {icon ? (
          <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </View>
        ) : null}
        <BrutalTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          size="sm"
          fill="transparent"
          borderWidth={0}
          style={[
            {
              flex: 1,
              height: 36,
              fontSize: 13,
            },
            inputStyle,
          ]}
        />
        {rightElement ? (
          <View style={{ marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}>
            {rightElement}
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default BrutalInput;

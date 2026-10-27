/**
 * src/components/brutal/BrutalToggle.tsx
 *
 * Neobrutalist Segmented Toggle (e.g. Editor | Gallery, Chapters | Series).
 * Has an ink border, and the active segment pops with the project accent color or ink fill.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BORDER, FONTS, INK, RADIUS, SHADOW, TYPE, WHITE, YELLOW } from '../../theme/brutal';

export interface ToggleOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface BrutalToggleProps {
  options: ToggleOption[];
  activeId: string;
  onChange: (id: string) => void;
  accentColor?: string;
  style?: ViewStyle;
}

export const BrutalToggle: React.FC<BrutalToggleProps> = ({
  options,
  activeId,
  onChange,
  accentColor = YELLOW,
  style,
}) => {
  return (
    <View className="relative mb-1 mr-1" style={style}>
      {/* Hard offset shadow behind the toggle */}
      <View className="absolute top-1 left-1 -right-1 -bottom-1 bg-ink rounded-button z-0" />

      <View className="flex-row border-2 border-ink rounded-button overflow-hidden bg-white relative z-10">
        {options.map((opt, idx) => {
          const isActive = opt.id === activeId;
          const isLast = idx === options.length - 1;

          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onChange(opt.id)}
              activeOpacity={0.85}
              className={`flex-row items-center justify-center py-2 px-4 ${!isLast ? 'border-r-2 border-ink' : ''}`}
              style={[
                isActive ? { backgroundColor: accentColor } : { backgroundColor: WHITE },
              ]}
            >
              {opt.icon ? <View className="mr-1.5">{opt.icon}</View> : null}
              <Text
                className="font-display text-[13px] tracking-wider uppercase text-ink"
                style={{ fontWeight: isActive ? '800' : '600' }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BrutalToggle;

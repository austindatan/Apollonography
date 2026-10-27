/**
 * src/components/ElementFilter.tsx
 *
 * Dynamic Database-Driven Element Color Filter.
 * Displays elemental hex color swatches directly from the project database.
 * Housed in a clean white neobrutalist pill container to eliminate RNW shadow artifacts.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BORDER, INK, RADIUS, WHITE } from '../theme/brutal';
import type { AttributeOption, Entry } from '../types/models';

/**
 * Extracts the assigned element string from an entry's infoFields or properties.
 */
export function getEntryElement(entry: Entry): string {
  if (!entry) return '';
  const f = entry.infoFields?.find(
    field => field.key.toLowerCase() === 'element' || field.key.toLowerCase() === 'att.'
  );
  if (f && f.value) return f.value.trim();
  if ((entry as any).element) return String((entry as any).element).trim();
  return '';
}

/**
 * Checks if an entry (or any of its evolution forms) matches a given Element option.
 */
export function entryMatchesElement(entry: Entry, option: AttributeOption): boolean {
  if (!entry || !option) return false;
  const val = getEntryElement(entry).toLowerCase();
  const optName = (option.name || '').toLowerCase();
  const optId = (option.id || '').toLowerCase();
  const optColor = (option.color || '').toLowerCase();

  if (val && (val === optName || val === optId || val === optColor)) {
    return true;
  }

  // Check evolutions if base form didn't match
  if (Array.isArray(entry.evolutions)) {
    const hasEvoMatch = entry.evolutions.some((evo: any) => {
      if (!evo || !evo.element) return false;
      const evoVal = String(evo.element).trim().toLowerCase();
      return evoVal === optName || evoVal === optId || evoVal === optColor;
    });
    if (hasEvoMatch) return true;
  }

  return false;
}

/**
 * Determines whether a hex color is dark, for contrasting inner indicator dots.
 */
function isColorDark(hexColor?: string): boolean {
  if (!hexColor || !hexColor.startsWith('#')) return false;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 140;
}

interface ElementFilterProps {
  options: AttributeOption[];
  selectedOptionId: string | null;
  onSelectOption: (option: AttributeOption | null) => void;
  style?: ViewStyle;
}

export const ElementFilter: React.FC<ElementFilterProps> = ({
  options,
  selectedOptionId,
  onSelectOption,
  style,
}) => {
  // Render all element options directly from database
  if (!options || options.length === 0) return null;

  return (
    <View style={[styles.pillContainer, style]}>
      {options.map(opt => {
        const isSelected = selectedOptionId === opt.id || selectedOptionId === opt.name;
        const color = opt.color || '#4ECDC4';
        const dark = isColorDark(color);

        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={0.8}
            onPress={() => onSelectOption(isSelected ? null : opt)}
            accessibilityLabel={`Filter by ${opt.name}`}
            style={[
              styles.colorSwatch,
              { backgroundColor: color },
              isSelected && styles.colorSwatchSelected,
            ]}
          >
            {/* Active Indicator: Center contrasting dot */}
            {isSelected && (
              <View
                style={[
                  styles.selectedDot,
                  { backgroundColor: dark ? WHITE : INK },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: WHITE,
    borderWidth: BORDER.width,
    borderColor: INK,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: INK,
    transform: [{ scale: 1.15 }],
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: INK,
  },
});

export default ElementFilter;

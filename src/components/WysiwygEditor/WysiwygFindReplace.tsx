/**
 * src/components/WysiwygEditor/WysiwygFindReplace.tsx
 *
 * Neobrutalist Find and Replace Floating Panel:
 * - Real-time query search with live match counter (e.g., "2 of 7")
 * - Previous/Next match navigation with keyboard shortcuts
 * - Case-sensitive toggle
 * - Replace and Replace All actions
 */

import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BrutalTextInput } from '../brutal/BrutalTextInput';
import {
  BORDER,
  CREAM,
  INK,
  RADIUS,
  WHITE,
  YELLOW,
} from '../../theme/brutal';
import BrutalBox from '../brutal/BrutalBox';
import BrutalPill from '../brutal/BrutalPill';

interface Props {
  visible: boolean;
  isReplaceMode: boolean;
  matchCount: number;
  matchIndex: number;
  onSearch: (query: string, caseSensitive: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
  onReplace: (replaceText: string) => void;
  onReplaceAll: (replaceText: string) => void;
  onClose: () => void;
  onToggleMode: () => void;
}

export const WysiwygFindReplace: React.FC<Props> = ({
  visible,
  isReplaceMode,
  matchCount,
  matchIndex,
  onSearch,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onClose,
  onToggleMode,
}) => {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  if (!visible) return null;

  const handleQueryChange = (text: string) => {
    setQuery(text);
    onSearch(text, caseSensitive);
  };

  const handleToggleCase = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    onSearch(query, next);
  };

  const matchLabel = matchCount > 0
    ? `${matchIndex + 1}/${matchCount}`
    : query.trim() ? '0/0' : '—';

  return (
    <View style={styles.barContainer}>
      <BrutalBox
        fill={WHITE}
        borderColor={INK}
        borderWidth={BORDER.width}
        radius={0}
        shadowOffset={0}
        style={{ padding: 8, width: '100%' }}
      >
        {/* Top Search Row */}
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <View className="flex-1 flex-row items-center bg-cream border-2 border-ink rounded-button px-2 h-8">
            <Text className="text-[11px] mr-1">🔍</Text>
            <BrutalTextInput
              size="sm"
              fill="transparent"
              borderWidth={0}
              placeholder="Find in chronicle..."
              placeholderTextColor="#888"
              value={query}
              onChangeText={handleQueryChange}
              onSubmitEditing={onNext}
              autoFocus
              style={{ flex: 1, fontSize: 12, height: 26, paddingHorizontal: 0 }}
            />
          </View>

          <BrutalPill
            label={matchLabel}
            fill={matchCount > 0 ? YELLOW : CREAM}
            size="sm"
          />

          <TouchableOpacity
            onPress={handleToggleCase}
            className="w-7 h-8 border-2 border-ink rounded-button items-center justify-center"
            style={{ backgroundColor: caseSensitive ? YELLOW : CREAM }}
            activeOpacity={0.7}
          >
            <Text className="font-display text-[10px] font-black text-ink">Aa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPrev}
            className="w-7 h-8 border-2 border-ink rounded-button items-center justify-center bg-cream"
            activeOpacity={0.7}
          >
            <Text className="font-display text-[12px] font-black text-ink">↑</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNext}
            className="w-7 h-8 border-2 border-ink rounded-button items-center justify-center bg-cream"
            activeOpacity={0.7}
          >
            <Text className="font-display text-[12px] font-black text-ink">↓</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            className="w-7 h-8 border-2 border-ink rounded-button items-center justify-center bg-white"
            activeOpacity={0.7}
          >
            <Text className="font-display text-[11px] font-black text-ink">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Replace Row */}
        {isReplaceMode && (
          <View className="flex-row items-center gap-1.5 mt-1 pt-1.5 border-t border-neutral-200">
            <View className="flex-1 bg-cream border-2 border-ink rounded-button px-2 h-8 justify-center">
              <BrutalTextInput
                size="sm"
                fill="transparent"
                borderWidth={0}
                placeholder="Replace with..."
                placeholderTextColor="#888"
                value={replaceText}
                onChangeText={setReplaceText}
                onSubmitEditing={() => onReplace(replaceText)}
                style={{ flex: 1, fontSize: 12, height: 26, paddingHorizontal: 0 }}
              />
            </View>

            <TouchableOpacity
              onPress={() => onReplace(replaceText)}
              className="h-8 px-2 border-2 border-ink rounded-button items-center justify-center bg-cream"
              activeOpacity={0.7}
            >
              <Text className="font-display text-[10px] font-black text-ink">REPLACE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onReplaceAll(replaceText)}
              className="h-8 px-2 border-2 border-ink rounded-button items-center justify-center bg-yellow"
              activeOpacity={0.7}
            >
              <Text className="font-display text-[10px] font-black text-ink">ALL</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row items-center justify-between mt-1 px-1">
          <TouchableOpacity onPress={onToggleMode} activeOpacity={0.7}>
            <Text className="font-display text-[9px] font-extrabold text-neutral-500 underline">
              {isReplaceMode ? '▲ HIDE REPLACE' : '▼ SHOW REPLACE (Ctrl+H)'}
            </Text>
          </TouchableOpacity>
          <Text className="font-display text-[9px] font-bold text-neutral-400">
            Enter for next • Esc to close
          </Text>
        </View>
      </BrutalBox>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    width: '100%',
    backgroundColor: CREAM,
    borderBottomWidth: 2,
    borderBottomColor: INK,
  },
});

export default WysiwygFindReplace;

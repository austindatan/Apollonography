/**
 * src/components/WysiwygEditor/WysiwygOutline.tsx
 *
 * Neobrutalist Table of Contents / Outline Drawer:
 * - Auto-extracted from H1, H2, H3 headings in real-time
 * - Click any heading to smoothly jump and center it in the editor
 * - Hierarchical indentations with neobrutalist pills and styling
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import type { HeadingItem } from './types';

interface Props {
  visible: boolean;
  headings: HeadingItem[];
  onSelectHeading: (pos: number) => void;
  onClose: () => void;
}

export const WysiwygOutline: React.FC<Props> = ({
  visible,
  headings,
  onSelectHeading,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <BrutalBox
        fill={WHITE}
        borderColor={INK}
        borderWidth={BORDER.width}
        radius={0}
        shadowOffset={0}
        style={{ width: 240, height: '100%', borderRightWidth: 2, borderRightColor: INK }}
      >
        {/* Header */}
        <View className="h-10 px-3 bg-cream border-b-2 border-ink flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[12px]">📑</Text>
            <Text className="font-display text-[11px] font-black text-ink tracking-wider">
              OUTLINE
            </Text>
            <BrutalPill
              label={`${headings.length}`}
              fill={YELLOW}
              size="sm"
            />
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="w-6 h-6 border-2 border-ink rounded-button items-center justify-center bg-white"
            activeOpacity={0.7}
          >
            <Text className="font-display text-[10px] font-black text-ink">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Headings List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {headings.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="font-display text-[11px] font-bold text-neutral-400 text-center leading-4">
                No headings yet.{'\n'}Use H1, H2, or H3 to generate an outline.
              </Text>
            </View>
          ) : (
            headings.map((h, idx) => {
              const indent = (h.level - 1) * 12;
              const isH1 = h.level === 1;
              const isH2 = h.level === 2;

              return (
                <TouchableOpacity
                  key={`${h.pos}-${idx}`}
                  onPress={() => onSelectHeading(h.pos)}
                  activeOpacity={0.7}
                  className="mb-1.5"
                >
                  <View
                    style={{
                      paddingLeft: indent,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        borderWidth: 1.5,
                        borderColor: INK,
                        backgroundColor: isH1 ? YELLOW : isH2 ? CREAM : WHITE,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 8,
                          fontFamily: 'Outfit',
                          fontWeight: '900',
                          color: INK,
                        }}
                      >
                        H{h.level}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: isH1 ? 12 : 11,
                        fontFamily: 'DM Sans',
                        fontWeight: isH1 ? '800' : isH2 ? '600' : '400',
                        color: INK,
                      }}
                    >
                      {h.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </BrutalBox>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    zIndex: 10,
  },
});

export default WysiwygOutline;

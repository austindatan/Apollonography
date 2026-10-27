/**
 * src/components/WysiwygEditor/WysiwygViewSettings.tsx
 *
 * Neobrutalist View Settings Modal:
 * - Theme toggle (Cream / Sepia / Dark)
 * - Page width control (Compact 680px / Standard 840px / Wide 1100px / Full 1400px)
 * - Zoom level control (80% to 150%)
 */

import React from 'react';
import {
  Modal,
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
import type { PageWidthOption, ThemeMode, ZoomOption } from './types';

interface Props {
  visible: boolean;
  currentTheme: ThemeMode;
  currentWidth: PageWidthOption;
  currentZoom: ZoomOption;
  onSelectTheme: (theme: ThemeMode) => void;
  onSelectWidth: (width: PageWidthOption) => void;
  onSelectZoom: (zoom: ZoomOption) => void;
  onClose: () => void;
}

const THEMES: { id: ThemeMode; label: string; previewBg: string; previewText: string }[] = [
  { id: 'cream', label: 'CREAM', previewBg: '#FAF9F5', previewText: '#111111' },
  { id: 'sepia', label: 'SEPIA', previewBg: '#FBF0D9', previewText: '#2D241E' },
  { id: 'dark', label: 'DARK', previewBg: '#18181B', previewText: '#F4F4F5' },
];

const WIDTHS: { id: PageWidthOption; label: string; px: string }[] = [
  { id: 680, label: 'COMPACT', px: '680px' },
  { id: 840, label: 'STANDARD', px: '840px' },
  { id: 1100, label: 'WIDE', px: '1100px' },
  { id: 1400, label: 'FULL', px: '100%' },
];

const ZOOMS: ZoomOption[] = [80, 90, 100, 110, 125, 150];

export const WysiwygViewSettings: React.FC<Props> = ({
  visible,
  currentTheme,
  currentWidth,
  currentZoom,
  onSelectTheme,
  onSelectWidth,
  onSelectZoom,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <BrutalBox
          fill={WHITE}
          borderColor={INK}
          borderWidth={BORDER.width}
          radius={RADIUS.card}
          shadowOffset={6}
          style={{ width: 380, padding: 20 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-2 mb-3 border-b-2 border-ink">
            <View className="flex-row items-center gap-2">
              <Text className="text-[14px]">⚙️</Text>
              <Text className="font-display text-[13px] font-black text-ink tracking-wider">
                PAGE & CANVAS SETTINGS
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-6 h-6 border-2 border-ink rounded-button items-center justify-center bg-cream"
              activeOpacity={0.7}
            >
              <Text className="font-display text-[11px] font-black text-ink">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Theme Selector */}
          <View className="mb-4">
            <Text className="font-display text-[10px] font-black text-ink mb-1.5 uppercase tracking-wider">
              Writing Surface Theme
            </Text>
            <View className="flex-row gap-2">
              {THEMES.map(th => {
                const isSelected = currentTheme === th.id;
                return (
                  <TouchableOpacity
                    key={th.id}
                    onPress={() => onSelectTheme(th.id)}
                    className="flex-1"
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: INK,
                        backgroundColor: th.previewBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: isSelected ? -2 : 0,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: isSelected ? 3 : 0 },
                        shadowOpacity: isSelected ? 0.2 : 0,
                        shadowRadius: 0,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Outfit',
                          fontSize: 11,
                          fontWeight: '900',
                          color: th.previewText,
                          letterSpacing: 0.5,
                        }}
                      >
                        {th.label}
                      </Text>
                      {isSelected && (
                        <View
                          style={{
                            marginTop: 4,
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: th.id === 'dark' ? '#FACC15' : INK,
                          }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Page Width */}
          <View className="mb-4">
            <Text className="font-display text-[10px] font-black text-ink mb-1.5 uppercase tracking-wider">
              Page Width
            </Text>
            <View className="flex-row gap-1.5">
              {WIDTHS.map(w => {
                const isSelected = currentWidth === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => onSelectWidth(w.id)}
                    className="flex-1"
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        paddingVertical: 6,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: INK,
                        backgroundColor: isSelected ? YELLOW : CREAM,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text className="font-display text-[9px] font-black text-ink">
                        {w.label}
                      </Text>
                      <Text className="font-body text-[8px] text-neutral-500 font-bold">
                        {w.px}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Zoom */}
          <View className="mb-4">
            <Text className="font-display text-[10px] font-black text-ink mb-1.5 uppercase tracking-wider">
              Display Zoom
            </Text>
            <View className="flex-row gap-1.5">
              {ZOOMS.map(z => {
                const isSelected = currentZoom === z;
                return (
                  <TouchableOpacity
                    key={z}
                    onPress={() => onSelectZoom(z)}
                    className="flex-1"
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        paddingVertical: 6,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: INK,
                        backgroundColor: isSelected ? YELLOW : CREAM,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text className="font-display text-[10px] font-black text-ink">
                        {z}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            className="w-full h-8 bg-yellow border-2 border-ink rounded-button items-center justify-center mt-1"
            activeOpacity={0.8}
          >
            <Text className="font-display text-[11px] font-black text-ink">
              APPLY & CLOSE
            </Text>
          </TouchableOpacity>
        </BrutalBox>
      </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 99999,
  },
});

export default WysiwygViewSettings;

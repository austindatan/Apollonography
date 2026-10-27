/**
 * src/components/AbilityIconPicker.tsx
 *
 * Full-featured Game Icon & Emoji Picker for Apollonography:
 * - 199 curated game-icons.net RPG icons across 6 categories
 * - Search bar filtering by icon name
 * - Category filter pills (All, Weapons, Magic, Status, Movement, Utility, Classes, Emojis)
 * - Tile Background Color Picker (palette swatches + hex input + transparent toggle)
 * - Foreground Icon Tint Picker (white, ink, accent swatches + hex input)
 * - Live Neobrutalist tile preview (48x48 rounded box)
 * - Inline presentation without WinUI modal clipping
 */

import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BORDER,
  CREAM,
  INK,
  LAVENDER,
  ORANGE,
  RADIUS,
  SHADOW,
  TEAL,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import BrutalButton from './brutal/BrutalButton';
import BrutalTextInput from './brutal/BrutalTextInput';
import { AbilityIconTile } from './AbilityIconTile';
import { GAME_ICON_CATEGORIES, GAME_ICONS, GameIconItem } from '../data/gameIcons';
import { pickImageFromComputer } from '../native/FilePicker';

const AVAILABLE_EMOJIS = [
  '⚡', '💥', '🔥', '❄️', '🌪️', '🌊', '🌱', '☀️', '🌙', '☄️',
  '⚔️', '🗡️', '🛡️', '🏹', '🎯', '🪓', '🔱', '💣', '🔫', '🥊',
  '🔮', '✨', '🌟', '💫', '🌀', '☠️', '🩸', '🧪', '🧿', '🧬',
  '❤️', '💚', '🩹', '👑', '🕊️', '🦅', '🐺', '🐉', '🦁', '👁️',
  '⚙️', '🔋', '💎', '⌛', '🔑', '🏷️', '📜', '🔔', '🚀', '🌌',
  '🏆', '🎖️', '💠', '⭐', '🪄', '🔆', '🔅', '⚜️', '🪐', '🌠',
];

const PRESET_BG_COLORS = [
  '#141414', // Ink
  '#FFFFFF', // White
  '#FFD93D', // Yellow
  '#4ECDC4', // Teal
  '#FF7A00', // Orange
  '#B59CDD', // Lavender
  '#FF4757', // Crimson
  '#A3E635', // Lime
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#1E293B', // Slate Navy
  '#64748B', // Cool Gray
];

const PRESET_FG_COLORS = [
  '#FFFFFF', // White
  '#141414', // Ink
  '#FFD93D', // Yellow
  '#4ECDC4', // Teal
  '#FF7A00', // Orange
  '#B59CDD', // Lavender
  '#FF4757', // Coral / Red
  '#38BDF8', // Sky Blue
];

interface AbilityIconPickerProps {
  initialIcon?: string;
  initialIconBg?: string;
  initialIconColor?: string;
  initialIconType?: 'curated' | 'custom' | 'emoji';
  initialEmoji?: string;
  onApply: (data: {
    icon?: string;
    iconBg?: string;
    iconColor?: string;
    iconType?: 'curated' | 'custom' | 'emoji';
    emoji?: string;
  }) => void;
  onClose: () => void;
}

export const AbilityIconPicker: React.FC<AbilityIconPickerProps> = ({
  initialIcon,
  initialIconBg,
  initialIconColor,
  initialIconType,
  initialEmoji,
  onApply,
  onClose,
}) => {
  const [iconType, setIconType] = useState<'curated' | 'custom' | 'emoji'>(
    initialIconType ||
    (initialIcon?.startsWith('file:') || initialIcon?.startsWith('http')
      ? 'custom'
      : initialIcon
        ? 'curated'
        : 'emoji')
  );
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(initialIcon);
  const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>(
    initialIcon ? undefined : (initialEmoji || '⚔️')
  );
  const [iconBg, setIconBg] = useState<string>(initialIconBg || '#141414');
  const [iconColor, setIconColor] = useState<string>(initialIconColor || '#FFFFFF');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customHexInput, setCustomHexInput] = useState('');

  // Filtered icons
  const filteredIcons = useMemo(() => {
    if (activeTab === 'emojis' || activeTab === 'custom') return [];
    let list = GAME_ICONS;
    if (activeTab !== 'all') {
      list = list.filter(i => i.category === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
    }
    return list;
  }, [activeTab, searchQuery]);

  const handleSelectGameIcon = (iconItem: GameIconItem) => {
    setSelectedIcon(iconItem.id);
    setSelectedEmoji(undefined);
    setIconType('curated');
  };

  const handleSelectEmoji = (emoji: string) => {
    setSelectedEmoji(emoji);
    setSelectedIcon(undefined);
    setIconType('emoji');
  };

  const handleUploadCustomImage = async () => {
    try {
      const res = await pickImageFromComputer();
      if (res && res.uri) {
        setSelectedIcon(res.uri);
        setSelectedEmoji(undefined);
        setIconType('custom');
        setActiveTab('custom');
      }
    } catch (e) {
      console.warn('Failed to pick custom image', e);
    }
  };

  const handleApply = () => {
    onApply({
      icon: selectedIcon,
      emoji: selectedEmoji,
      iconType,
      iconBg,
      iconColor,
    });
  };

  return (
    <View className="p-3.5 my-3 rounded-card border-2 border-ink bg-white shadow-lg">
      {/* ── Top Header & Live Previews (Standard 48x48 + 64x64) ───── */}
      <View className="flex-row items-center justify-between pb-3 mb-3 border-b-2 border-ink">
        <View className="flex-row items-center gap-3">
          {/* Live Preview Tiles with Neobrutalist Hard Shadow */}
          <View className="flex-row items-end gap-2.5">
            {/* 48x48 Tile */}
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  position: 'absolute',
                  top: 3,
                  left: 3,
                  width: 48,
                  height: 48,
                  borderRadius: RADIUS.small,
                  backgroundColor: INK,
                }}
              />
              <AbilityIconTile
                icon={selectedIcon}
                emoji={selectedEmoji}
                iconType={iconType}
                iconBg={iconBg}
                iconColor={iconColor}
                size={48}
                radius={RADIUS.small}
                borderWidth={2}
              />
            </View>

            {/* 64x64 Tile Preview */}
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  width: 64,
                  height: 64,
                  borderRadius: RADIUS.small,
                  backgroundColor: INK,
                }}
              />
              <AbilityIconTile
                icon={selectedIcon}
                emoji={selectedEmoji}
                iconType={iconType}
                iconBg={iconBg}
                iconColor={iconColor}
                size={64}
                radius={RADIUS.small}
                borderWidth={2}
              />
            </View>
          </View>

          <View className="ml-1">
            <Text className="font-display text-[13px] font-extrabold text-ink tracking-wide">
              ICON &amp; TILE DESIGNER
            </Text>
            <Text className="font-body text-[11px] text-[#555555]">
              {iconType === 'custom'
                ? 'Custom Uploaded Image'
                : selectedIcon
                  ? `Game Icon: ${selectedIcon.replace(/_/g, ' ')}`
                  : `Emoji: ${selectedEmoji || 'None'}`}
            </Text>
            <Text className="font-display text-[9px] font-bold text-neutral-400 mt-0.5">
              PREVIEWS: 48×48 &amp; 64×64
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <BrutalButton
            label="✓ APPLY"
            variant="primary"
            accentColor={YELLOW}
            size="sm"
            onPress={handleApply}
          />
          <TouchableOpacity
            onPress={onClose}
            className="w-[28px] h-[28px] rounded-small border border-ink bg-neutral-100 items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="font-display text-[12px] font-extrabold text-ink">✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Color Controls: Background & Foreground Swatches ───────── */}
      <View className="p-2.5 mb-3 rounded-button border border-ink bg-cream gap-2">
        {/* Background Color Row */}
        <View className="flex-row items-center gap-2">
          <Text className="font-display text-[10px] font-extrabold text-ink w-[64px]">
            TILE BG:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
            <View className="flex-row items-center gap-1.5 py-0.5">
              {/* Transparent Toggle */}
              <TouchableOpacity
                onPress={() => setIconBg('transparent')}
                className="px-2 py-1 rounded-small border border-ink"
                style={{
                  backgroundColor: iconBg === 'transparent' ? YELLOW : WHITE,
                }}
                activeOpacity={0.8}
              >
                <Text className="font-display text-[9px] font-extrabold text-ink">NONE</Text>
              </TouchableOpacity>

              {PRESET_BG_COLORS.map(c => {
                const isSelected = iconBg.toLowerCase() === c.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setIconBg(c)}
                    className="w-[22px] h-[22px] rounded-small border border-ink items-center justify-center"
                    style={{
                      backgroundColor: c,
                      transform: [{ scale: isSelected ? 1.15 : 1 }],
                      borderColor: isSelected ? YELLOW : INK,
                      borderWidth: isSelected ? 2 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '900',
                          color: c === '#FFFFFF' || c === '#FFD93D' ? INK : WHITE,
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Foreground Tint Color Row */}
        <View className="flex-row items-center gap-2">
          <Text className="font-display text-[10px] font-extrabold text-ink w-[64px]">
            ICON TINT:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
            <View className="flex-row items-center gap-1.5 py-0.5">
              {PRESET_FG_COLORS.map(c => {
                const isSelected = iconColor.toLowerCase() === c.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setIconColor(c)}
                    className="w-[22px] h-[22px] rounded-small border border-ink items-center justify-center"
                    style={{
                      backgroundColor: c,
                      transform: [{ scale: isSelected ? 1.15 : 1 }],
                      borderColor: isSelected ? YELLOW : INK,
                      borderWidth: isSelected ? 2 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '900',
                          color: c === '#FFFFFF' || c === '#FFD93D' ? INK : WHITE,
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Hex Input */}
          <View className="flex-row items-center gap-1">
            <Text className="font-display text-[9px] font-bold text-[#666666]">#</Text>
            <BrutalTextInput
              variant="single"
              size="sm"
              borderWidth={1}
              value={customHexInput}
              onChangeText={val => {
                setCustomHexInput(val);
                if (val.length === 6 || val.length === 7) {
                  const hex = val.startsWith('#') ? val : `#${val}`;
                  setIconBg(hex);
                }
              }}
              placeholder="Hex"
              style={{ width: 62, height: 26, fontSize: 10, borderRadius: RADIUS.small }}
            />
          </View>
        </View>
      </View>

      {/* ── Category Tabs + Upload Button ────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2.5">
        <View className="flex-row items-center gap-1.5 pb-1">
          {/* Custom File Upload Button */}
          <TouchableOpacity
            onPress={handleUploadCustomImage}
            className="px-2.5 py-1 rounded-small border border-ink flex-row items-center gap-1"
            style={{
              backgroundColor: activeTab === 'custom' ? YELLOW : '#FFF4D6',
            }}
            activeOpacity={0.8}
          >
            <Text className="font-display text-[10px] font-extrabold text-ink">📁 UPLOAD IMAGE</Text>
          </TouchableOpacity>

          {GAME_ICON_CATEGORIES.map(cat => {
            const isSelected = activeTab === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveTab(cat.id)}
                className="px-2.5 py-1 rounded-small border border-ink"
                style={{
                  backgroundColor: isSelected ? YELLOW : WHITE,
                }}
                activeOpacity={0.8}
              >
                <Text
                  className="font-display text-[10px] font-extrabold"
                  style={{ color: isSelected ? INK : '#555555' }}
                >
                  {cat.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Search Bar (Active for game icons) ─────────────────────── */}
      {activeTab !== 'emojis' && activeTab !== 'custom' && (
        <View className="mb-2.5">
          <BrutalTextInput
            variant="single"
            size="sm"
            borderWidth={1}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${filteredIcons.length} game icons...`}
            style={{ fontSize: 11, borderRadius: RADIUS.small }}
          />
        </View>
      )}

      {/* ── Icon Grid / Content Area (Scrollable) ──────────────────── */}
      <View
        className="rounded-small border border-ink bg-neutral-50 p-2"
        style={{ maxHeight: 210 }}
      >
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
          {activeTab === 'custom' ? (
            <View className="py-4 items-center justify-center gap-3">
              {iconType === 'custom' && selectedIcon ? (
                <View className="items-center gap-2">
                  <AbilityIconTile
                    icon={selectedIcon}
                    iconType="custom"
                    iconBg={iconBg}
                    size={64}
                    borderWidth={2}
                  />
                  <Text className="font-body text-[11px] text-[#444444] max-w-[300px] text-center" numberOfLines={1}>
                    {selectedIcon}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <BrutalButton
                      label="CHANGE FILE"
                      variant="secondary"
                      size="sm"
                      accentColor={TEAL}
                      onPress={handleUploadCustomImage}
                    />
                    <BrutalButton
                      label="REMOVE"
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setSelectedIcon(undefined);
                        setSelectedEmoji('⚔️');
                        setIconType('emoji');
                        setActiveTab('all');
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View className="items-center gap-2 py-3">
                  <Text className="font-display text-[12px] font-extrabold text-ink">
                    NO CUSTOM IMAGE LOADED
                  </Text>
                  <Text className="font-body text-[11px] text-[#666666] text-center max-w-[320px]">
                    Pick any PNG, JPG, or WEBP image from your computer to use as this ability's icon tile.
                  </Text>
                  <BrutalButton
                    label="CHOOSE FROM COMPUTER"
                    variant="primary"
                    accentColor={YELLOW}
                    size="sm"
                    onPress={handleUploadCustomImage}
                  />
                </View>
              )}
            </View>
          ) : activeTab === 'emojis' ? (
            <View className="flex-row flex-wrap gap-2">
              {AVAILABLE_EMOJIS.map(em => {
                const isSelected = selectedEmoji === em;
                return (
                  <TouchableOpacity
                    key={em}
                    onPress={() => handleSelectEmoji(em)}
                    className="w-[36px] h-[36px] rounded-small border border-ink bg-white items-center justify-center"
                    style={{
                      borderColor: isSelected ? YELLOW : INK,
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: isSelected ? `${YELLOW}33` : WHITE,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-[17px]">{em}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {filteredIcons.length === 0 ? (
                <View className="py-8 w-full items-center justify-center">
                  <Text className="font-display text-[11px] font-bold text-[#777777]">
                    NO ICONS FOUND MATCHING "{searchQuery}"
                  </Text>
                </View>
              ) : (
                filteredIcons.map(item => {
                  const isSelected = selectedIcon === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectGameIcon(item)}
                      className="w-[38px] h-[38px] rounded-small border border-ink items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? YELLOW : '#18181B',
                        borderColor: isSelected ? INK : '#333333',
                        borderWidth: isSelected ? 2 : 1,
                      }}
                      activeOpacity={0.7}
                    >
                      <AbilityIconTile
                        icon={item.id}
                        iconBg="transparent"
                        iconColor={isSelected ? INK : WHITE}
                        size={32}
                        borderWidth={0}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Footer Attribution for game-icons.net (CC BY 3.0) ──────── */}
      <View className="mt-2.5 pt-2 border-t border-dashed border-neutral-300 flex-row items-center justify-between">
        <Text className="font-body text-[9px] text-[#777777]">
          Icons courtesy of game-icons.net (CC BY 3.0) — Lorc, Delapouite, Carl Olsen, sbed &amp; contributors.
        </Text>
      </View>
    </View>
  );
};

export default AbilityIconPicker;

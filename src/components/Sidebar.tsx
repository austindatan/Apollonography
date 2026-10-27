/**
 * src/components/Sidebar.tsx
 *
 * Neobrutalist Sidebar matching Image 5 (STACK dashboard) cues:
 *  - Cream/Yellow logo header with thick ink divider
 *  - Each project as a stacked bordered button (avatar, name, type subtitle)
 *  - Selected = ink fill with crisp white text and accent badge pill
 *  - "Make New Project" is a dashed-border button
 *  - Home button as a stacked bordered button
 *  - Profile row sits at bottom inside a bordered BrutalBox
 */
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getProjectTypePreset } from '../hooks/useProjects';
import {
  BORDER,
  CREAM,
  FONTS,
  getProjectAccent,
  INK,
  RADIUS,
  SHADOW,
  SPACE,
  TYPE,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Project, UserProfile } from '../types/models';
import BrutalBox from './brutal/BrutalBox';
import BrutalDivider from './brutal/BrutalDivider';
import { Icon, ICONS } from './Icon';
import { InitialsAvatar } from './InitialsAvatar';
import { getInitialsFromName } from './ProjectModal';
import { BrutalSkeleton } from './brutal/BrutalSkeleton';

export function getFallbackAccentColor(idOrName: string): string {
  const PALETTE = ['#FFD93D', '#4ECDC4', '#FF6B6B', '#38BDF8', '#A855F7', '#6BCB77', '#FF9F5A', '#F43F5E'];
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

const LOGO_LOCKUP = require('../../assets/images/Apollonography_VERTICAL_3.png');

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string;
  profile: UserProfile;
  onSelectProject: (project: Project) => void;
  onAddNew: () => void;
  onProfilePress: () => void;
  onSelectHome: () => void;
  loading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProjectId,
  profile,
  onSelectProject,
  onAddNew,
  onProfilePress,
  onSelectHome,
  loading = false,
}) => {
  return (
    <View className="w-[270px] bg-cream border-r-2 border-ink flex-col h-full">
      {/* ── Logo Header ───────────────────────────────────────────── */}
      <View className="h-[68px] px-4 bg-yellow items-center justify-center">
        <Image source={LOGO_LOCKUP} className="w-[220px] h-[40px]" resizeMode="contain" />
      </View>

      <BrutalDivider thickness={BORDER.width} />

      {/* ── Project List ──────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display text-[10px] font-extrabold text-ink tracking-widest uppercase mb-2 px-1">WORKSPACE PROJECTS</Text>

        {loading ? (
          <View className="py-1">
            <BrutalSkeleton width="100%" height={56} radius={RADIUS.button} style={{ marginBottom: 8 }} />
            <BrutalSkeleton width="100%" height={56} radius={RADIUS.button} style={{ marginBottom: 8 }} />
            <BrutalSkeleton width="100%" height={56} radius={RADIUS.button} style={{ marginBottom: 8 }} />
          </View>
        ) : projects.length === 0 ? (
          <View className="py-6 px-2 items-center">
            <Text className="font-display text-[12px] font-bold text-neutral-400 uppercase tracking-wider text-center mb-1">
              NO PROJECTS YET
            </Text>
            <Text className="font-body text-[11px] text-neutral-500 text-center">
              Click below to create your first archive.
            </Text>
          </View>
        ) : (
          projects.map(p => {
            const isSelected = p.id === selectedProjectId;
            const computedInitials = getInitialsFromName(p.name || 'PR');
            const cfg = {
              initials: computedInitials,
              color: p.accentColor || getFallbackAccentColor(p.id || p.name),
            };
            const preset = getProjectTypePreset(p.type);
            const accentPrimary = p.accentColor || getProjectAccent(p.id).primary;

            return (
              <View key={p.id} className="mb-2">
              <BrutalBox
                fill={isSelected ? INK : WHITE}
                borderColor={INK}
                borderWidth={BORDER.width}
                radius={RADIUS.button}
                shadowOffset={isSelected ? 0 : SHADOW.offsetSmall}
                onPress={() => onSelectProject(p)}
                style={{ padding: 8 }}
              >
                <View className="flex-row items-center">
                  <InitialsAvatar
                    initials={cfg.initials}
                    color={cfg.color}
                    size={36}
                    fontSize={12}
                    imageUri={p.avatar}
                  />

                  <View className="flex-1 ml-2">
                    <Text
                      className="font-display text-[13px] font-bold tracking-tight"
                      style={{ color: isSelected ? WHITE : INK }}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>

                    <View className="flex-row items-center mt-0.5 gap-1">
                      <Icon
                        glyph={preset.iconGlyph}
                        size={11}
                        color={isSelected ? '#AAAAAA' : '#666666'}
                      />
                      <Text
                        className="font-body text-[11px]"
                        style={{ color: isSelected ? '#CCCCCC' : '#666666' }}
                        numberOfLines={1}
                      >
                        {preset.displayName}
                      </Text>
                    </View>
                  </View>

                  {/* Accent Badge when Selected */}
                  {isSelected && (
                    <View
                      className="w-2.5 h-2.5 rounded-full border-[1.5px] border-ink ml-1"
                      style={{ backgroundColor: accentPrimary }}
                    />
                  )}
                </View>
              </BrutalBox>
            </View>
          );
        }))}

        {/* ── Make New Project Button (Dashed) ────────────────────── */}
        <TouchableOpacity
          onPress={onAddNew}
          activeOpacity={0.75}
          className="flex-row items-center justify-center border-2 border-ink border-dashed rounded-button py-2.5 px-3 mt-1 bg-transparent"
        >
          <View className="w-[22px] h-[22px] rounded-small border-[1.5px] border-ink items-center justify-center mr-2 bg-white">
            <Icon glyph={ICONS.add} size={13} color={INK} />
          </View>
          <Text className="font-display text-[11px] font-bold text-ink tracking-wider">MAKE NEW PROJECT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Bottom Section ────────────────────────────────────────── */}
      <View className="px-3 pb-4">
        <BrutalDivider thickness={BORDER.width} style={{ marginBottom: 12 }} />

        {/* Home Button */}
        <View className="mb-2">
          <BrutalBox
            fill={selectedProjectId === 'home' ? INK : WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.button}
            shadowOffset={selectedProjectId === 'home' ? 0 : SHADOW.offsetSmall}
            onPress={onSelectHome}
            style={{ padding: 8 }}
          >
            <View className="flex-row items-center">
              <View
                className="w-7 h-7 rounded-small border-[1.5px] border-ink items-center justify-center mr-2"
                style={{ backgroundColor: selectedProjectId === 'home' ? YELLOW : CREAM }}
              >
                <Icon
                  glyph={ICONS.home}
                  size={16}
                  color={INK}
                />
              </View>
              <Text
                className="flex-1 font-display text-[11px] font-bold tracking-wider"
                style={{ color: selectedProjectId === 'home' ? WHITE : INK }}
              >
                HOME DASHBOARD
              </Text>
              {selectedProjectId === 'home' && (
                <View className="w-2.5 h-2.5 rounded-full border-[1.5px] border-ink ml-1" style={{ backgroundColor: YELLOW }} />
              )}
            </View>
          </BrutalBox>
        </View>

        {/* Profile Card */}
        <View className="mt-1">
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.button}
            shadowOffset={SHADOW.offsetSmall}
            onPress={onProfilePress}
            style={{ padding: 8 }}
          >
            <View className="flex-row items-center">
              <InitialsAvatar
                initials={profile.initials}
                color={profile.avatarColor}
                size={34}
                fontSize={11}
                imageUri={profile.avatarUri}
              />
              <View className="flex-1 ml-2">
                <Text className="font-display text-[13px] font-bold text-ink" numberOfLines={1}>
                  {profile.name}
                </Text>
                <Text className="font-body text-[10px] text-neutral-600 font-semibold tracking-wide mt-0.5" numberOfLines={1}>
                  PROFILE &amp; SETTINGS
                </Text>
              </View>
              <Icon glyph={ICONS.settings} size={15} color={INK} />
            </View>
          </BrutalBox>
        </View>
      </View>
    </View>
  );
};

export default Sidebar;

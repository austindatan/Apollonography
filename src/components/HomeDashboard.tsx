/**
 * src/components/HomeDashboard.tsx
 *
 * Neobrutalist Home Dashboard:
 *  - Bold top bar with ink borders and tactile New Project button
 *  - Welcome panel with bordered stat cards (STACK dashboard cues)
 *  - Project cards featuring framed cover banners (2px ink border, fixed aspect ratio)
 *  - Recent articles grid with bordered thumbnail frames and sticker pills
 */
import React from 'react';
import {
  Image,
  ScrollView,
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
  LAVENDER,
  RADIUS,
  SHADOW,
  SPACE,
  TEAL,
  TYPE,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Entry, Project } from '../types/models';
import BrutalBox from './brutal/BrutalBox';
import BrutalButton from './brutal/BrutalButton';
import BrutalCard from './brutal/BrutalCard';
import BrutalDivider from './brutal/BrutalDivider';
import BrutalPill from './brutal/BrutalPill';
import { Icon, ICONS } from './Icon';
import { InitialsAvatar } from './InitialsAvatar';
import { getInitialsFromName } from './ProjectModal';
import { toPlainText } from '../utils/richText';
import { BrutalSkeleton } from './brutal/BrutalSkeleton';
import { getFallbackAccentColor } from './Sidebar';

interface HomeDashboardProps {
  projects: Project[];
  allEntries: Entry[];
  profileName: string;
  onSelectProject: (project: Project) => void;
  onSelectArticle: (project: Project, entry: Entry) => void;
  onAddNewProject: () => void;
  loading?: boolean;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  projects,
  allEntries,
  profileName,
  onSelectProject,
  onSelectArticle,
  onAddNewProject,
  loading = false,
}) => {
  const getProjectEntryCount = (projectId: string) => {
    return allEntries.filter(e => e.projectId === projectId).length;
  };

  const recentArticles = allEntries.slice(0, 6);

  return (
    <View className="flex-1 bg-cream">
      {/* ── Stationary Top Bar ──────────────────────────────────────── */}
      <View className="h-[68px] px-6 flex-row items-center justify-between bg-cream">
        <View className="flex-row items-center flex-1">
          <View className="w-9 h-9 rounded-icon border-2 border-ink bg-yellow items-center justify-center mr-3">
            <Icon glyph={ICONS.home} size={18} color={INK} />
          </View>
          <View>
            <Text className="font-display text-[15px] font-extrabold text-ink tracking-wider">HOME DASHBOARD</Text>
            <Text className="font-body text-[10px] font-semibold text-neutral-500 tracking-wider mt-0.5">
              APOLLONOGRAPHY CREATIVE WORKSPACE
            </Text>
          </View>
        </View>

        <BrutalButton
          label="NEW PROJECT"
          variant="primary"
          accentColor={YELLOW}
          size="sm"
          icon={<Icon glyph={ICONS.addCircle} size={14} color={INK} />}
          onPress={onAddNewProject}
        />
      </View>

      <BrutalDivider thickness={BORDER.width} />

      {/* ── Scrollable Body ─────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome Banner with Stat Cards ────────────────────────── */}
        <View className="mb-6">
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.card}
            shadowOffset={SHADOW.offset}
            style={{ padding: 24 }}
          >
            <View className="flex-row justify-between items-center gap-6">
              <View className="flex-1">
                <View className="mb-2">
                </View>
                <Text className="font-display text-[22px] font-black text-ink tracking-tight mb-1">
                  WELCOME BACK, {profileName.toUpperCase()}
                </Text>
                <Text className="font-body text-[13px] text-neutral-600 leading-5 max-w-[620px]">
                  Manage your creative worlds, character rosters, game mechanics, and lore encyclopedias.
                  Select a project below or dive into recent revisions.
                </Text>
              </View>

              {/* Stat Cards (STACK style) */}
              <View className="flex-row gap-3">
                <BrutalBox
                  fill={YELLOW}
                  borderColor={INK}
                  borderWidth={BORDER.width}
                  radius={RADIUS.button}
                  shadowOffset={SHADOW.offsetSmall}
                  style={{ width: 100, height: 80, alignItems: 'center', justifyContent: 'center' }}
                >
                  {loading ? (
                    <BrutalSkeleton width={44} height={26} radius={RADIUS.small} />
                  ) : (
                    <Text className="font-display text-[26px] font-black text-ink">{projects.length}</Text>
                  )}
                  <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider uppercase mt-0.5">PROJECTS</Text>
                </BrutalBox>

                <BrutalBox
                  fill={LAVENDER}
                  borderColor={INK}
                  borderWidth={BORDER.width}
                  radius={RADIUS.button}
                  shadowOffset={SHADOW.offsetSmall}
                  style={{ width: 100, height: 80, alignItems: 'center', justifyContent: 'center' }}
                >
                  {loading ? (
                    <BrutalSkeleton width={44} height={26} radius={RADIUS.small} />
                  ) : (
                    <Text className="font-display text-[26px] font-black text-ink">{allEntries.length}</Text>
                  )}
                  <Text className="font-display text-[10px] font-extrabold text-ink tracking-wider uppercase mt-0.5">ARTICLES</Text>
                </BrutalBox>
              </View>
            </View>
          </BrutalBox>
        </View>

        {/* ── Section 1: Your Projects ──────────────────────────────── */}
        <View className="mb-6">
          <View className="flex-row items-center gap-2 mb-3">
            <Text className="font-display text-[14px] font-extrabold text-ink tracking-wider uppercase">YOUR PROJECTS</Text>
            <BrutalPill
              label={`${projects.length} ACTIVE`}
              fill={WHITE}
              size="sm"
            />
          </View>

          <View className="flex-row flex-wrap gap-4">
            {loading ? (
              <>
                <BrutalSkeleton width={320} height={260} radius={RADIUS.card} />
                <BrutalSkeleton width={320} height={260} radius={RADIUS.card} />
                <BrutalSkeleton width={320} height={260} radius={RADIUS.card} />
              </>
            ) : projects.length === 0 ? (
              <View className="w-full">
                <BrutalBox
                  fill={WHITE}
                  borderColor={INK}
                  borderWidth={BORDER.width}
                  radius={RADIUS.card}
                  shadowOffset={SHADOW.offsetSmall}
                  style={{ padding: 24, alignItems: 'center' }}
                >
                  <Text className="font-display text-[16px] font-black text-ink mb-1">NO PROJECTS YET</Text>
                  <Text className="font-body text-[13px] text-neutral-600 text-center mb-4 max-w-[450px]">
                    Create your first game world, lore archive, or wardrobe collection to get started.
                  </Text>
                  <BrutalButton
                    label="CREATE YOUR FIRST PROJECT"
                    variant="primary"
                    accentColor={YELLOW}
                    size="sm"
                    onPress={onAddNewProject}
                  />
                </BrutalBox>
              </View>
            ) : (
              projects.map(p => {
                const computedInitials = getInitialsFromName(p.name || 'PR');
                const cfg = {
                  initials: computedInitials,
                  color: p.accentColor || getFallbackAccentColor(p.id || p.name),
                };
              const preset = getProjectTypePreset(p.type);
              const count = getProjectEntryCount(p.id);
              const baseAccent = getProjectAccent(p.id);
              const accent = {
                primary: p.accentColor || baseAccent.primary,
                secondary: p.accentColorEnd || baseAccent.secondary,
              };

              // Extract only primary tags (first tag of each entry) for this project
              const projectEntries = allEntries.filter(e => e.projectId === p.id);
              const primaryTags: { id: string; name: string }[] = [];
              const seenTags = new Set<string>();

              for (const e of projectEntries) {
                const pTag = e.tags?.[0];
                if (pTag && pTag.name) {
                  const trimmed = pTag.name.trim();
                  const lower = trimmed.toLowerCase();
                  if (!seenTags.has(lower)) {
                    seenTags.add(lower);
                    primaryTags.push({ id: pTag.id || lower, name: trimmed });
                  }
                }
              }

              // Only 2 rows of tags should appear (up to 5 tags); the rest tucked away with +N
              const MAX_DASHBOARD_PRIMARY_TAGS = 5;
              const hasOverflow = primaryTags.length > MAX_DASHBOARD_PRIMARY_TAGS;
              const visiblePrimaryTags = hasOverflow
                ? primaryTags.slice(0, MAX_DASHBOARD_PRIMARY_TAGS - 1)
                : primaryTags;
              const tuckedCount = hasOverflow
                ? primaryTags.length - (MAX_DASHBOARD_PRIMARY_TAGS - 1)
                : 0;

              return (
                <View key={p.id} className="w-[320px] mb-3">
                  <BrutalBox
                    fill={WHITE}
                    borderColor={INK}
                    borderWidth={BORDER.width}
                    radius={RADIUS.card}
                    shadowOffset={SHADOW.offset}
                    onPress={() => onSelectProject(p)}
                    style={{ overflow: 'hidden', height: 300 }}
                  >
                    {/* Optional Framed Banner Cover Image */}
                    {p.background ? (
                      <View className="w-full h-32 relative overflow-hidden bg-neutral-200 border-b-2 border-ink">
                        <Image
                          source={typeof p.background === 'string' ? { uri: p.background } : p.background}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                        <View className="absolute bottom-0 left-0 right-0 h-1 bg-yellow" />
                      </View>
                    ) : null}

                    {/* Card Content */}
                    <View className="p-3.5 bg-white flex-1 justify-between">
                      <View>
                        <View className="flex-row items-center gap-2.5 mb-2.5">
                          <InitialsAvatar
                            initials={cfg.initials}
                            color={accent.primary}
                            size={40}
                            fontSize={13}
                            imageUri={p.avatar}
                          />

                          <View className="flex-1">
                            <Text className="font-display text-[14px] font-extrabold text-ink tracking-tight" numberOfLines={1}>
                              {p.name}
                            </Text>
                            <View className="flex-row items-center gap-1 mt-0.5">
                              <Icon glyph={preset.iconGlyph} size={11} color={INK} />
                              <Text className="font-body text-[10px] text-neutral-600">{preset.displayName}</Text>
                            </View>
                          </View>

                          <BrutalPill
                            label={`${count} UNITS`}
                            fill={accent.secondary}
                            size="sm"
                          />
                        </View>

                        {/* Primary Tags Preview (only primary tags, max 2 rows, rest tucked) */}
                        <View
                          className="flex-row flex-wrap gap-1"
                          style={{ maxHeight: 52, minHeight: 24, overflow: 'hidden' }}
                        >
                          {visiblePrimaryTags.map(tag => (
                            <BrutalPill
                              key={tag.id}
                              label={tag.name.toUpperCase()}
                              fill={CREAM}
                              size="sm"
                            />
                          ))}
                          {tuckedCount > 0 && (
                            <BrutalPill
                              label={`+${tuckedCount}`}
                              fill={YELLOW}
                              size="sm"
                            />
                          )}
                          {primaryTags.length === 0 && (
                            <Text className="font-body text-[11px] text-neutral-400 italic mt-0.5">
                              No primary tags
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Bottom Section: Divider & Action Bar at the very low */}
                      <View>
                        <BrutalDivider thickness={BORDER.width} style={{ marginBottom: 8 }} />

                        {/* Action Bar */}
                        <View className="flex-row items-center justify-between">
                          <Text className="font-display text-[10px] font-bold text-neutral-500 tracking-wider">
                            VIEW: {preset.defaultView.toUpperCase()}
                          </Text>

                          <View
                            className="flex-row items-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] border-ink"
                            style={{ backgroundColor: accent.primary }}
                          >
                            <Text className="font-display text-[10px] font-bold text-ink tracking-wider">OPEN PROJECT</Text>
                            <Icon glyph={ICONS.arrowRight} size={11} color={INK} />
                          </View>
                        </View>
                      </View>
                    </View>
                  </BrutalBox>
                </View>
              );
            }))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeDashboard;

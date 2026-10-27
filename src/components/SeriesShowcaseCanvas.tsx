/**
 * src/components/SeriesShowcaseCanvas.tsx
 *
 * Neobrutalist Series Showcase Canvas:
 *  - BrutalBox canvas container with 2px ink border
 *  - Tactile back button and sticker series badges
 *  - Unit cards with framed portraits and hard-offset shadows
 */
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  BORDER,
  CREAM,
  FONTS,
  INK,
  RADIUS,
  SHADOW,
  SPACE,
  TYPE,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Entry, Project } from '../types/models';
import BrutalBox from './brutal/BrutalBox';
import BrutalButton from './brutal/BrutalButton';
import BrutalDivider from './brutal/BrutalDivider';
import BrutalPill from './brutal/BrutalPill';
import { EntryGalleryCard } from './EntryGalleryCard';
import { Icon, ICONS } from './Icon';
import { TagPill } from './TagPill';
import { AlignedSeriesLogo } from './AlignedSeriesLogo';

export interface SeriesData {
  id: string;
  name: string;
  description: string;
  badge?: string;
  badges?: Array<{ id?: string; label: string; color: string }>;
  entries: Entry[];
  logo?: any;
  banners?: any[];
  specs?: string[];
}

interface Props {
  series: SeriesData;
  project: Project;
  accentColor: string;
  onSelectUnit: (unit: Entry) => void;
  onBackToSeriesList: () => void;
  onOpenSettings?: () => void;
}

export const SeriesShowcaseCanvas: React.FC<Props> = ({
  series,
  project,
  accentColor,
  onSelectUnit,
  onBackToSeriesList,
  onOpenSettings,
}) => {
  const [activeBannerIdx, setActiveBannerIdx] = React.useState(0);
  const [bannerWidth, setBannerWidth] = React.useState<number>(0);
  const bannersList = (series.banners && series.banners.length > 0)
    ? series.banners
    : (project.background ? [project.background] : []);
  const currentBanner = bannersList.length > 0 ? bannersList[activeBannerIdx % bannersList.length] : null;

  // Slideshow per 3 seconds
  React.useEffect(() => {
    if (bannersList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx(prev => (prev + 1) % bannersList.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [bannersList.length]);

  const isCosmetics = project.type === 'cosmetics';
  const logoSource =
    typeof series.logo === 'string'
      ? { uri: series.logo }
      : series.logo;



  return (
    <View className="flex-1 h-full">
      <BrutalBox
        fill={WHITE}
        borderColor={INK}
        borderWidth={BORDER.width}
        radius={RADIUS.card}
        shadowOffset={0}
        style={{ flex: 1, height: '100%' }}
      >
        {/* ── Top Bar ──────────────────────────────────────────────── */}
        <View className="h-14 px-4 flex-row items-center justify-between bg-cream">
          <View className="flex-row items-center gap-2">
            <BrutalButton
              label={isCosmetics ? "← ALL FASHION" : "← ALL SERIES"}
              variant="secondary"
              size="sm"
              onPress={onBackToSeriesList}
            />

            <BrutalPill
              label={isCosmetics ? "FASHION SHOWCASE" : "SERIES SHOWCASE"}
              fill={YELLOW}
              size="sm"
            />
          </View>

          <View className="flex-row items-center gap-2">
            {onOpenSettings && (
              <BrutalButton
                label="SETTINGS"
                variant="secondary"
                size="sm"
                icon={<Icon glyph={ICONS.settings} size={14} color={INK} />}
                onPress={onOpenSettings}
              />
            )}
          </View>
        </View>

        <BrutalDivider thickness={BORDER.width} />

        {/* ── Scrollable Body ───────────────────────────────────────── */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header block: Fashion has Slideshow + White Details; Gameplay has clean Series Header Card */}
          <View className="mb-6">
            {isCosmetics ? (
              <View className="w-full h-[310px] rounded-card border-2 border-ink overflow-hidden bg-white flex-row">
                {/* Left Side: Banner Slideshow */}
                <View
                  onLayout={e => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0) setBannerWidth(w);
                  }}
                  className="flex-1 h-full relative overflow-hidden bg-neutral-900 border-r-2 border-ink items-center justify-center"
                >
                  {currentBanner ? (
                    <Image
                      source={typeof currentBanner === 'string' ? { uri: currentBanner } : currentBanner}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: bannerWidth || '100%',
                        height: 310,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 bg-neutral-100 items-center justify-center">
                      <Text className="font-display text-[48px] font-black text-neutral-300 tracking-wider">{series.name.toUpperCase()}</Text>
                    </View>
                  )}

                  {/* Slideshow indicator dots */}
                  {bannersList.length > 1 && (
                    <View className="absolute bottom-3 left-3 flex-row items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full z-10">
                      {bannersList.map((_, dotIdx) => (
                        <TouchableOpacity
                          key={dotIdx}
                          onPress={() => setActiveBannerIdx(dotIdx)}
                          activeOpacity={0.7}
                          className={`rounded-full ${dotIdx === (activeBannerIdx % bannersList.length)
                            ? 'w-2.5 h-2.5 bg-yellow'
                            : 'w-2 h-2 bg-white/60'
                            }`}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Right Side: Solid White Background, Badges, Logo, Name, Description */}
                <View className="w-[380px] bg-white border-l-2 border-ink p-4 justify-between">
                  <View>
                    <View className="flex-row items-center gap-1.5 flex-wrap mb-2">
                      {series.badges && series.badges.length > 0 ? (
                        series.badges.map((b, bIdx) => (
                          <BrutalPill
                            key={bIdx}
                            label={b.label.toUpperCase()}
                            fill={b.color || CREAM}
                            size="sm"
                          />
                        ))
                      ) : (
                        <BrutalPill
                          label={series.badge?.toUpperCase() ?? 'COLLECTION'}
                          fill={CREAM}
                          size="sm"
                        />
                      )}
                      <BrutalPill
                        label={`${series.entries.length} UNITS`}
                        fill={YELLOW}
                        size="sm"
                      />
                    </View>

                    {/* Branded Logo and Series Name Row */}
                    <View className="gap-3 my-2 items-start">
                      {series.logo && (
                        <View className="w-full h-[140px] bg-white items-start justify-center overflow-hidden">
                          <AlignedSeriesLogo
                            source={series.logo}
                            maxHeight={135}
                            maxWidth={340}
                            tintColor="black"
                          />
                        </View>
                      )}

                      <View className="justify-center">
                        <Text className="font-display text-[22px] font-black text-ink tracking-tight leading-tight">
                          {series.name}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <BrutalDivider thickness={2} style={{ marginVertical: 4 }} />

                  {/* Description from settings */}
                  <View className="mt-1">
                    <Text className="font-display text-[10px] font-extrabold text-neutral-500 tracking-wider mb-1">COLLECTION CONCEPT</Text>
                    <Text className="font-body text-[11px] text-neutral-800 leading-4">
                      {series.description || 'Exclusive designer wardrobe and functional originium mobility gear.'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Characters & Gameplay: Clean Series Header Card (NO banners, with Settings) */
              <BrutalBox
                fill={WHITE}
                borderColor={INK}
                borderWidth={BORDER.width}
                radius={RADIUS.card}
                shadowOffset={SHADOW.offset}
                style={{ padding: 24, borderRadius: 12, backgroundColor: WHITE }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    {series.badges && series.badges.length > 0 ? (
                      series.badges.map((b, bIdx) => (
                        <BrutalPill
                          key={bIdx}
                          label={b.label.toUpperCase()}
                          fill={b.color || YELLOW}
                          size="sm"
                        />
                      ))
                    ) : (
                      <BrutalPill
                        label={series.badge?.toUpperCase() ?? 'GAMEPLAY SERIES'}
                        fill={YELLOW}
                        size="sm"
                      />
                    )}
                    <BrutalPill
                      label={`${series.entries.length} UNITS`}
                      fill={CREAM}
                      size="sm"
                    />
                  </View>

                  {onOpenSettings && (
                    <BrutalButton
                      label="EDIT SERIES"
                      variant="secondary"
                      size="sm"
                      icon={<Icon glyph={ICONS.settings} size={14} color={INK} />}
                      onPress={onOpenSettings}
                    />
                  )}
                </View>

                <Text className="font-display text-[28px] font-black text-ink tracking-tight">{series.name}</Text>

                <BrutalDivider thickness={BORDER.width} style={{ marginVertical: 8 }} />

                <View className="mt-1">
                  <Text className="font-display text-[10px] font-extrabold text-neutral-500 tracking-wider mb-1">SERIES OVERVIEW &amp; DESCRIPTION</Text>
                  <Text className="font-body text-[13px] text-neutral-700 leading-5 mt-1">
                    {series.description || 'No description recorded for this series.'}
                  </Text>
                </View>
              </BrutalBox>
            )}
          </View>

          {/* Units Grid */}
          <View className="mb-3">
            <Text className="font-display text-[15px] font-extrabold text-ink tracking-wider uppercase">FEATURED UNITS IN THIS {isCosmetics ? 'COLLECTION' : 'SERIES'}</Text>
            <Text className="font-body text-[11px] text-neutral-500 mt-0.5">
              Tap any unit to open full character editor
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3 pt-2">
            {series.entries.map(unit => {
              const matchingWardrobe = (unit as any).wardrobes?.find(
                (w: any) =>
                  w.seriesName &&
                  series.name &&
                  (w.seriesName.toLowerCase().includes(series.name.toLowerCase().split('/')[0].trim()) ||
                    series.name.toLowerCase().includes(w.seriesName.toLowerCase().split('/')[0].trim()))
              ) ?? (unit as any).wardrobes?.[0];

              const wardrobeGallery = matchingWardrobe?.gallery;
              const cardImage = isCosmetics
                ? (wardrobeGallery ?? unit.portrait ?? (unit as any).gallery ?? unit.thumbnail)
                : (unit.portrait ?? unit.thumbnail);

              return (
                <EntryGalleryCard
                  key={unit.id}
                  entry={unit}
                  accentColor={accentColor}
                  imageSource={cardImage}
                  isCosmetics={isCosmetics}
                  onPress={() => onSelectUnit(unit)}
                />
              );
            })}
          </View>
        </ScrollView>
      </BrutalBox>
    </View>
  );
};

export default SeriesShowcaseCanvas;

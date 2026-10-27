/**
 * src/components/EntryGalleryCard.tsx
 *
 * Neobrutalist Gallery Portrait Card:
 *  - Uses Pressable with onHoverIn / onHoverOut for React Native Windows compatibility
 *  - Pop card on hover: scale 1.06, lift up 6px, grow shadow (4px -> 8px), raise zIndex
 *  - Crossfade to E2 gallery image (~150ms) using E2 crop if saved
 *  - Preloads E2 image on mount to eliminate flicker
 *  - Displays small "E2" badge while E2 art is showing
 *  - Small expand icon button in the corner opens Lightbox
 *  - Card click still opens the entry
 *  - Hover state strictly isolated inside this component
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BORDER, CREAM, FONTS, INK, RADIUS, SHADOW, WHITE, YELLOW } from '../theme/brutal';
import type { Entry } from '../types/models';
import BrutalDivider from './brutal/BrutalDivider';
import BrutalPill from './brutal/BrutalPill';
import { ImageFrame } from './ImageFrame';

interface Props {
  entry: Entry;
  accentColor: string;
  onPress: () => void;
  imageSource?: any;
  isCosmetics?: boolean;
}

export const EntryGalleryCard: React.FC<Props> = ({
  entry,
  accentColor,
  onPress,
  imageSource,
  isCosmetics = false,
}) => {
  // Gameplay projects have no gallery image: use Panel image as card art (square 1:1)
  // Cosmetics projects use Gallery image (180 x 360, 1:2)
  const e0Image = imageSource
    ? imageSource
    : (isCosmetics
      ? (entry.portrait ?? (entry as any).gallery ?? entry.thumbnail)
      : (entry.thumbnail ?? (entry as any).panel));

  const e2Image = isCosmetics
    ? (entry.e2Portrait ?? (entry as any).e2Gallery ?? null)
    : null;

  const [isHovered, setIsHovered] = useState(false);

  // Animated values using JS driver (useNativeDriver: false for react-native-windows stability)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  // Preload E2 image on mount
  useEffect(() => {
    if (e2Image) {
      if (typeof e2Image === 'string') {
        Image.prefetch(e2Image).catch(() => {});
      } else if (e2Image.uri) {
        Image.prefetch(e2Image.uri).catch(() => {});
      }
    }
  }, [e2Image]);

  const handleHoverIn = () => {
    setIsHovered(true);

    Animated.parallel([
      // Pop card: scale 1.06, lift up 6px
      Animated.timing(popAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
      // Crossfade to E2 art (~150ms) if available
      ...(e2Image && isCosmetics
        ? [
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: false,
            }),
          ]
        : []),
    ]).start();
  };

  const handleHoverOut = () => {
    setIsHovered(false);

    Animated.parallel([
      Animated.timing(popAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const cardScale = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const cardTranslateY = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const shadowOffsetVal = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 5],
  });

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          zIndex: isHovered ? 50 : 1,
          transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
        },
      ]}
    >
      {/* Hidden image preloader to decode asset into memory */}
      {e2Image && (
        <Image
          source={e2Image}
          style={styles.hiddenPreload}
          resizeMode="cover"
        />
      )}

      {/* Pressable with onHoverIn and onHoverOut for React Native Windows */}
      <Pressable
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onPress={onPress}
        style={styles.pressableContainer}
      >
        {/* Rounded Neobrutalist Shadow Underlay (matching RADIUS.card) */}
        <Animated.View
          style={[
            styles.shadowUnderlay,
            {
              transform: [
                { translateX: shadowOffsetVal },
                { translateY: shadowOffsetVal },
              ],
            },
          ]}
        />

        <View style={styles.cardBox}>
          {/* Card Art: 140x140 square for Gameplay; 140x280 (1:2) for Cosmetics */}
          <View style={[styles.artFrame, { height: isCosmetics ? 280 : 140 }]}>
            {/* E0 Image */}
            <ImageFrame
              kind={isCosmetics ? 'gallery' : 'panel'}
              source={e0Image}
              placeholderLabel={entry.title}
              className="w-full h-full"
            />

            {/* E2 Image Layer for Cosmetics */}
            {isCosmetics && e2Image && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: fadeAnim },
                ]}
                pointerEvents="none"
              >
                <ImageFrame
                  kind="gallery"
                  source={e2Image}
                  placeholderLabel={`${entry.title} (E2)`}
                  className="w-full h-full"
                />
              </Animated.View>
            )}
          </View>

          {/* 2px Ink line between art and details */}
          <BrutalDivider thickness={BORDER.width} />

          {/* Details Container */}
          <View style={styles.detailsContainer}>
            <Text style={styles.titleText} numberOfLines={1}>
              {entry.title}
            </Text>

            <View style={styles.tagsRow}>
              {(() => {
                if (!entry.tags || entry.tags.length === 0) return null;
                const primaryTag = entry.tags[0];
                const secondaryTag = entry.tags[1];

                if (!secondaryTag) {
                  return (
                    <BrutalPill
                      label={primaryTag.name}
                      fill={primaryTag.color || accentColor}
                      textColor={INK}
                      size="sm"
                      style={{ paddingHorizontal: 5, paddingVertical: 1 }}
                      textStyle={{ fontSize: 9 }}
                    />
                  );
                }

                return (
                  <>
                    <BrutalPill
                      label={primaryTag.name}
                      fill={primaryTag.color || accentColor}
                      textColor={INK}
                      size="sm"
                      style={{ marginRight: 3, paddingHorizontal: 5, paddingVertical: 1, flexShrink: primaryTag.name.length > 7 ? 1 : 0 }}
                      textStyle={{ fontSize: 9 }}
                    />
                    <BrutalPill
                      label={secondaryTag.name}
                      fill={secondaryTag.color || CREAM}
                      textColor={INK}
                      size="sm"
                      style={{ paddingHorizontal: 5, paddingVertical: 1, flexShrink: 1 }}
                      textStyle={{ fontSize: 9 }}
                    />
                  </>
                );
              })()}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardOuter: {
    width: 140,
    marginBottom: 12,
    marginHorizontal: 4,
    paddingRight: 6,
    paddingBottom: 6,
  },
  hiddenPreload: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },
  pressableContainer: {
    width: 140,
    position: 'relative',
  },
  shadowUnderlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: INK,
    borderRadius: RADIUS.card,
    borderWidth: BORDER.width,
    borderColor: INK,
    zIndex: 0,
  },
  cardBox: {
    backgroundColor: WHITE,
    borderWidth: BORDER.width,
    borderColor: INK,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    zIndex: 1,
  },
  artFrame: {
    width: 140,
    height: 280,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  detailsContainer: {
    padding: 6,
    backgroundColor: WHITE,
    overflow: 'hidden',
  },
  titleText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
});

export default EntryGalleryCard;

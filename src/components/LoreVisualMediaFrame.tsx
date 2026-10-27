/**
 * src/components/LoreVisualMediaFrame.tsx
 *
 * Aspect-ratio hugging Visual Media frame for Lore & Story.
 * - Frame height is fixed (default 200px).
 * - Frame width is computed dynamically: width = height * (imageWidth / imageHeight).
 * - Dimensions are cached per image so layout never jumps.
 * - While size is unknown, shows a square skeleton of the same height.
 * - Shows the whole image with 2px ink border and radius hugging the image exactly (no cropping, no empty bars).
 * - Caps width at container width (shrinks proportionally if too wide).
 * - Sits in a wrapping row, left-aligned, never stretching to flex-1.
 * - Clicking the image opens the Lightbox.
 */

import React, { useEffect, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BORDER, CREAM, FONTS, INK, RADIUS, SHADOW, WHITE, YELLOW } from '../theme/brutal';
import { BrutalTextInput } from './brutal/BrutalTextInput';
import { Icon, ICONS } from './Icon';

// Global cache for image dimensions to prevent layout recalculation jumps
const DIMENSION_CACHE = new Map<string, { width: number; height: number }>();

function getImageKey(source: any): string {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (typeof source === 'number') return `asset-${source}`;
  if (source.uri) return source.uri;
  return JSON.stringify(source);
}

interface LoreVisualMediaFrameProps {
  item: { id: string; title: string; image: any };
  isEditing: boolean;
  containerWidth: number;
  fixedHeight?: number;
  onTitleChange?: (text: string) => void;
  onChooseImage?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  onPressImage: () => void;
}

export const LoreVisualMediaFrame: React.FC<LoreVisualMediaFrameProps> = ({
  item,
  isEditing,
  containerWidth,
  fixedHeight = 200,
  onTitleChange,
  onChooseImage,
  onRemove,
  showRemove = false,
  onPressImage,
}) => {
  const imageKey = getImageKey(item.image);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(() => {
    if (imageKey && DIMENSION_CACHE.has(imageKey)) {
      return DIMENSION_CACHE.get(imageKey)!;
    }
    // Attempt synchronous resolution for local bundled assets
    if (item.image) {
      try {
        const resolved = Image.resolveAssetSource(item.image);
        if (resolved && resolved.width > 0 && resolved.height > 0) {
          const dims = { width: resolved.width, height: resolved.height };
          if (imageKey) DIMENSION_CACHE.set(imageKey, dims);
          return dims;
        }
      } catch (_) { }
    }
    return null;
  });

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!item.image) {
      setDimensions(null);
      return;
    }

    if (imageKey && DIMENSION_CACHE.has(imageKey)) {
      setDimensions(DIMENSION_CACHE.get(imageKey)!);
      return;
    }

    // Try synchronous resolve first
    try {
      const resolved = Image.resolveAssetSource(item.image);
      if (resolved && resolved.width > 0 && resolved.height > 0) {
        const dims = { width: resolved.width, height: resolved.height };
        if (imageKey) DIMENSION_CACHE.set(imageKey, dims);
        setDimensions(dims);
        return;
      }
    } catch (_) { }

    // Asynchronous resolution for network/file URIs
    const uri = typeof item.image === 'string' ? item.image : item.image?.uri;
    if (uri) {
      Image.getSize(
        uri,
        (width, height) => {
          if (width > 0 && height > 0) {
            const dims = { width, height };
            if (imageKey) DIMENSION_CACHE.set(imageKey, dims);
            setDimensions(dims);
          }
        },
        () => {
          setHasError(true);
        }
      );
    }
  }, [item.image, imageKey]);

  // Compute width from aspect ratio hugging
  let frameWidth = fixedHeight;
  let frameHeight = fixedHeight;

  if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
    const aspectRatio = dimensions.width / dimensions.height;
    frameWidth = Math.round(fixedHeight * aspectRatio);

    // Cap width at available container width; shrink height proportionally if overflowing
    const maxAvailableWidth = Math.max(160, containerWidth > 0 ? containerWidth - 24 : 600);
    if (frameWidth > maxAvailableWidth) {
      frameWidth = maxAvailableWidth;
      frameHeight = Math.round(frameWidth / aspectRatio);
    }
  }

  return (
    <View style={[styles.outerBox, { width: frameWidth }]}>
      {/* Title & Delete Header */}
      <View style={styles.titleRow}>
        {isEditing ? (
          <BrutalTextInput
            size="sm"
            value={item.title}
            onChangeText={(txt) => onTitleChange?.(txt)}
            placeholder="MEDIA TITLE..."
            style={styles.textInput}
          />
        ) : (
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title.toUpperCase()}
          </Text>
        )}

        {isEditing && showRemove && (
          <TouchableOpacity
            onPress={onRemove}
            style={styles.deleteButton}
            activeOpacity={0.8}
            accessibilityLabel="Remove media"
          >
            <Icon glyph={ICONS.delete} size={12} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      {/* Hugging Frame Container - 2px ink border, no cropping, no bars */}
      <TouchableOpacity
        onPress={onPressImage}
        activeOpacity={0.9}
        style={[
          styles.imageContainer,
          {
            width: frameWidth,
            height: frameHeight,
          },
        ]}
      >
        {(!item.image || hasError) ? (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>✕</Text>
            <Text style={styles.placeholderText} numberOfLines={1}>
              {item.title ? item.title.toUpperCase() : 'NO IMAGE'}
            </Text>
          </View>
        ) : !dimensions ? (
          // Square skeleton while dimensions resolve to eliminate layout jump
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonPulse} />
          </View>
        ) : (
          <Image
            source={typeof item.image === 'string' ? { uri: item.image } : item.image}
            onError={() => setHasError(true)}
            style={{
              width: frameWidth,
              height: frameHeight,
            }}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>

      {/* Edit Mode Actions */}
      {isEditing && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={onChooseImage}
            style={styles.chooseButton}
            activeOpacity={0.8}
          >
            <Text style={styles.chooseButtonText}>CHOOSE IMAGE</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerBox: {
    marginBottom: 16,
    flexShrink: 0,
    flexGrow: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    minHeight: 28,
  },
  textInput: {
    fontWeight: '800',
    fontSize: 11,
    flex: 1,
    marginRight: 6,
  },
  titleText: {
    fontFamily: FONTS.display,
    fontSize: 10,
    fontWeight: '800',
    color: INK,
    letterSpacing: 0.8,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.small,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: INK,
    overflow: 'hidden',
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  placeholderIcon: {
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '900',
    color: INK,
    opacity: 0.6,
  },
  placeholderText: {
    fontFamily: FONTS.display,
    fontSize: 9,
    fontWeight: '800',
    color: INK,
    opacity: 0.6,
    marginTop: 2,
  },
  skeletonContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  chooseButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.small,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
  },
  chooseButtonText: {
    fontFamily: FONTS.display,
    fontSize: 9,
    fontWeight: '800',
    color: INK,
  },
});

export default LoreVisualMediaFrame;

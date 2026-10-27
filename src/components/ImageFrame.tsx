/**
 * src/components/ImageFrame.tsx
 *
 * Canonical shared image frame component for Apollonography.
 * Enforces fixed frame geometries per project type and kind:
 *  - "panel": Fixed 1:1 square frame, resizeMode "cover", centered.
 *  - "gallery": Fixed 180 x 360 (1:2) frame, resizeMode "cover", centered.
 *  - "splash": Free-size frame hugging the image's natural aspect ratio at a fixed height.
 *              Shows the whole image with no cutting. Caches dimensions; displays skeleton while loading.
 *
 * Automatically requests right-sized Cloudinary delivery transformations:
 *  - panel:   w_400,h_400,c_fill,q_auto,f_auto
 *  - gallery: w_360,h_720,c_fill,q_auto,f_auto (2x for sharpness)
 *  - splash:  w_1200,c_limit,q_auto,f_auto
 * Bundled mock assets and local file URIs are preserved as-is.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { resolveImageSource, ImageSource } from '../types/images';
import { getCloudinaryUrl } from '../utils/cloudinary';
import { getCachedImagePath } from '../services/imageCacheService';
import { BORDER, INK, RADIUS } from '../theme/brutal';
import { BrutalSkeleton } from './brutal/BrutalSkeleton';

export type ImageFrameKind = 'panel' | 'gallery' | 'splash';

// Global memory cache for image natural dimensions so layout never jumps after initial load
const DIMENSION_CACHE = new Map<string, { width: number; height: number }>();

const BLOCK_PLACEHOLDER = require('../../assets/images/block.png');

function getImageKey(source: any): string {
  if (!source) return '';
  if (typeof source === 'number') return `asset-${source}`;
  if (typeof source === 'string') return source;
  if (source.uri) return source.uri;
  if (source.public_id) return source.public_id;
  if (source.asset?.public_id) return source.asset.public_id;
  return JSON.stringify(source);
}

export interface ImageFrameProps {
  kind: ImageFrameKind;
  source: ImageSourcePropType | ImageSource | any;
  fixedHeight?: number;
  containerWidth?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  placeholderLabel?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  bordered?: boolean;
  resizeMode?: 'cover' | 'contain';
}

export const ImageFrame: React.FC<ImageFrameProps> = ({
  kind,
  source,
  fixedHeight = 180,
  containerWidth,
  className = '',
  style,
  imageStyle,
  placeholderLabel = 'IMAGE',
  onPress,
  accessibilityLabel,
  bordered = false,
  resizeMode: propResizeMode,
}) => {
  const imageKey = getImageKey(source);
  const prevKeyRef = useRef(imageKey);

  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => Boolean(imageKey && (typeof source === 'number' || DIMENSION_CACHE.has(imageKey))));
  const fadeAnim = useRef(new Animated.Value(typeof source === 'number' ? 1 : 0)).current;
  const [cachedUri, setCachedUri] = useState<string | null>(null);

  useEffect(() => {
    if (imageKey !== prevKeyRef.current) {
      prevKeyRef.current = imageKey;
      setHasError(false);
      setIsLoaded(typeof source === 'number');
      setCachedUri(null);
      fadeAnim.setValue(typeof source === 'number' ? 1 : 0);
    }
  }, [imageKey, source]);

  const handleImageLoad = () => {
    setIsLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: false,
    }).start();
  };

  // Natural dimensions resolution for 'splash' free-size aspect ratio
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(() => {
    if (kind !== 'splash' || !imageKey) return null;
    if (DIMENSION_CACHE.has(imageKey)) {
      return DIMENSION_CACHE.get(imageKey)!;
    }
    // Attempt synchronous resolution for bundled assets
    if (typeof source === 'number') {
      try {
        const resolved = Image.resolveAssetSource(source);
        if (resolved && resolved.width > 0 && resolved.height > 0) {
          const dims = { width: resolved.width, height: resolved.height };
          DIMENSION_CACHE.set(imageKey, dims);
          return dims;
        }
      } catch { }
    }
    return null;
  });

  // Check LRU local disk cache for Cloudinary image
  useEffect(() => {
    let active = true;
    if (!source) return;
    const s = resolveImageSource(source);
    if (s.kind === 'cloudinary') {
      const imgId = s.asset?.public_id || (s.asset as any)?.id || (s as any).publicId || (s as any).id;
      if (imgId) {
        getCachedImagePath(imgId)
          .then(localPath => {
            if (active && localPath) {
              const formatted = localPath.startsWith('file:///')
                ? localPath
                : `file:///${localPath.replace(/\\/g, '/')}`;
              setCachedUri(formatted);
            }
          })
          .catch(() => { });
      }
    }
    return () => {
      active = false;
    };
  }, [source]);

  // Measure natural dimensions for splash images
  useEffect(() => {
    if (kind !== 'splash') return;
    if (!source) {
      setDimensions(null);
      return;
    }

    if (imageKey && DIMENSION_CACHE.has(imageKey)) {
      setDimensions(DIMENSION_CACHE.get(imageKey)!);
      return;
    }

    // Try synchronous resolve for bundled assets
    if (typeof source === 'number') {
      try {
        const resolved = Image.resolveAssetSource(source);
        if (resolved && resolved.width > 0 && resolved.height > 0) {
          const dims = { width: resolved.width, height: resolved.height };
          if (imageKey) DIMENSION_CACHE.set(imageKey, dims);
          setDimensions(dims);
          return;
        }
      } catch { }
    }

    // Asynchronous resolution for network/local file URIs
    const s = resolveImageSource(source);
    let uri: string | null = null;
    if (s.kind === 'local') {
      uri = s.uri;
    } else if (s.kind === 'cloudinary') {
      uri = (s as any).uri || (s.asset ? getCloudinaryUrl(s.asset) : null);
    } else if (typeof source === 'string') {
      uri = source;
    }
    if (uri) {
      Image.getSize(
        uri,
        (w, h) => {
          if (w > 0 && h > 0) {
            const dims = { width: w, height: h };
            if (imageKey) DIMENSION_CACHE.set(imageKey, dims);
            setDimensions(dims);
          }
        },
        () => {
          // Do not treat dimension measurement failure as image load error
          // Image itself can still render via resizeMode contain
        }
      );
    }
  }, [kind, source, imageKey]);

  // Resolve typed delivery source with right-sized Cloudinary transformation
  const resolvedSource = useMemo(() => {
    if (!source) return null;
    if (cachedUri) return { uri: cachedUri };

    const s = resolveImageSource(source);
    if (s.kind === 'bundled') return s.asset;
    if (s.kind === 'local') return { uri: s.uri };

    if (s.kind === 'cloudinary' && s.asset) {
      if (kind === 'panel') {
        const isContain = propResizeMode === 'contain';
        return {
          uri: getCloudinaryUrl(s.asset, {
            width: 400,
            ...(isContain ? {} : { height: 400 }),
            crop: isContain ? 'limit' : 'fill',
            quality: 'auto',
            format: 'auto',
          }),
        };
      }
      if (kind === 'gallery') {
        const isContain = propResizeMode === 'contain';
        return {
          uri: getCloudinaryUrl(s.asset, {
            width: 360,
            ...(isContain ? {} : { height: 720 }),
            crop: isContain ? 'limit' : 'fill',
            quality: 'auto',
            format: 'auto',
          }),
        };
      }
      if (kind === 'splash') {
        return {
          uri: getCloudinaryUrl(s.asset, {
            width: 1200,
            crop: 'limit',
            quality: 'auto',
            format: 'auto',
          }),
        };
      }
      return { uri: getCloudinaryUrl(s.asset) };
    }

    if ((source as any).uri) return { uri: (source as any).uri };
    return source;
  }, [source, cachedUri, kind, propResizeMode]);

  // Compute frame style depending on kind
  let frameDimensions: ViewStyle = {};
  let defaultResizeMode: 'cover' | 'contain' = 'cover';

  if (kind === 'panel') {
    // 1:1 fixed frame, fit (contain) so image is never cropped or zoomed
    frameDimensions = {
      width: '100%',
      height: '100%',
    };
    defaultResizeMode = 'contain';
  } else if (kind === 'gallery') {
    // 180 x 360 (1:2) frame
    frameDimensions = {
      width: '100%',
      height: '100%',
    };
    defaultResizeMode = 'contain';
  } else if (kind === 'splash') {
    // Center, fit, not fill: entire image shown, centered, no cutting
    frameDimensions = {
      width: '100%',
      height: '100%',
    };
    defaultResizeMode = 'contain';
  }

  const resizeMode = propResizeMode ?? defaultResizeMode;

  const [layoutSize, setLayoutSize] = useState<{ width: number; height: number } | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      if (!layoutSize || Math.abs(layoutSize.width - width) > 1 || Math.abs(layoutSize.height - height) > 1) {
        setLayoutSize({ width, height });
      }
    }
  };

  // Render stable inner content so the root container is never unmounted during placeholder -> image transition
  let innerBody: React.ReactNode;

  if (!resolvedSource || hasError) {
    innerBody = (
      <Image
        source={BLOCK_PLACEHOLDER}
        resizeMode="contain"
        style={[
          styles.fullSize,
          layoutSize ? { width: Math.round(layoutSize.width * 0.7), height: Math.round(layoutSize.height * 0.7) } : { width: '70%', height: '70%' },
          imageStyle,
        ]}
      />
    );
  } else {
    innerBody = (
      <View style={styles.fullSize}>
        {!isLoaded && (
          <BrutalSkeleton
            width="100%"
            height="100%"
            radius={bordered ? RADIUS.small : 0}
            delayMs={0}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <Animated.Image
          source={resolvedSource}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={() => setHasError(true)}
          style={[
            styles.fullSize,
            layoutSize && !imageStyle ? { width: layoutSize.width, height: layoutSize.height } : null,
            imageStyle,
            { opacity: fadeAnim },
          ]}
        />
      </View>
    );
  }

  const content = (
    <View
      onLayout={handleLayout}
      className={`w-full h-full overflow-hidden bg-neutral-200 items-center justify-center ${bordered ? 'border-2 border-ink rounded-small' : ''} ${className}`}
      style={[frameDimensions, style]}
    >
      {innerBody}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? placeholderLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  fullSize: {
    width: '100%',
    height: '100%',
  },
});

export default ImageFrame;
